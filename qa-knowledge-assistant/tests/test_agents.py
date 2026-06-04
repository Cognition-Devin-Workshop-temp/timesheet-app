"""
Tests for the multi-agent system.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.models import AgentQuery, QueryIntent
from src.agents import (
    DocumentRetrievalAgent,
    RequirementAnalyzerAgent,
    TestCaseGeneratorAgent,
    KnowledgeValidatorAgent,
)
from src.orchestrator import AgentOrchestrator
from src.knowledge_store.vector_store import VectorStore
from src.knowledge_store.metadata_store import MetadataStore
from src.ingestion.pipeline import IngestionPipeline


async def _setup_knowledge_base(tmp_path):
    """Helper: create a populated knowledge base for agent testing."""
    vector_store = VectorStore(
        persist_dir=str(tmp_path / "chroma"),
        collection_name="agent_test",
    )
    metadata_store = MetadataStore(db_path=str(tmp_path / "meta.db"))
    pipeline = IngestionPipeline(vector_store, metadata_store)

    # Ingest sample content
    await pipeline.ingest_text(
        text=(
            "REQ-001: User Authentication\n"
            "The system shall provide email-based authentication using JWT tokens.\n"
            "Users log in with email only, no password required.\n"
            "JWT tokens expire after 24 hours.\n"
            "All API endpoints except login require valid authentication."
        ),
        title="Requirements Spec",
        source_type="markdown",
        project="timesheet-app",
        tags=["requirement", "auth"],
    )
    await pipeline.ingest_text(
        text=(
            "TC-001: Login with valid email\n"
            "Steps: POST /auth/login with valid email\n"
            "Expected: 200 OK, JWT token returned\n\n"
            "TC-002: Login with invalid email\n"
            "Steps: POST /auth/login with 'not-an-email'\n"
            "Expected: 400 Bad Request\n"
        ),
        title="Test Plan",
        source_type="markdown",
        project="timesheet-app",
        tags=["test", "auth"],
    )
    await pipeline.ingest_text(
        text=(
            "POST /auth/login\n"
            "Request: { 'email': 'user@example.com' }\n"
            "Response: { 'token': 'jwt...', 'user': { 'email': '...' } }\n"
            "Validation: Email must be valid format\n"
        ),
        title="API Documentation",
        source_type="markdown",
        project="timesheet-app",
        tags=["api", "auth"],
    )

    return vector_store


@pytest.mark.asyncio
class TestDocumentRetrievalAgent:
    async def test_factual_lookup(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        agent = DocumentRetrievalAgent(vs)

        query = AgentQuery(
            text="How does authentication work?",
            intent=QueryIntent.FACTUAL_LOOKUP,
        )
        response = await agent._timed_process(query)

        assert response.agent_name == "document_retrieval"
        assert response.answer  # Non-empty answer
        assert response.processing_time_ms >= 0

    async def test_retrieve_context(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        agent = DocumentRetrievalAgent(vs)

        query = AgentQuery(text="JWT token authentication")
        chunks = await agent.retrieve_context(query, top_k=3)

        assert len(chunks) > 0
        assert all(c.relevance_score >= 0 for c in chunks)

    async def test_can_handle_scores(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        agent = DocumentRetrievalAgent(vs)

        factual = AgentQuery(text="test", intent=QueryIntent.FACTUAL_LOOKUP)
        assert await agent.can_handle(factual) == 0.95

        test_gen = AgentQuery(text="test", intent=QueryIntent.TEST_GENERATION)
        assert await agent.can_handle(test_gen) == 0.5


@pytest.mark.asyncio
class TestRequirementAnalyzerAgent:
    async def test_analyze_requirement(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        agent = RequirementAnalyzerAgent(vs)

        query = AgentQuery(
            text="Analyze the authentication requirement",
            intent=QueryIntent.REQUIREMENT_ANALYSIS,
        )
        response = await agent._timed_process(query)

        assert response.agent_name == "requirement_analyzer"
        assert response.structured_data is not None
        assert "summary" in response.structured_data

    async def test_can_handle_scores(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        agent = RequirementAnalyzerAgent(vs)

        req = AgentQuery(text="test", intent=QueryIntent.REQUIREMENT_ANALYSIS)
        assert await agent.can_handle(req) == 0.95


@pytest.mark.asyncio
class TestTestCaseGeneratorAgent:
    async def test_generate_test_cases(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        agent = TestCaseGeneratorAgent(vs)

        query = AgentQuery(
            text="Generate test cases for the authentication feature",
            intent=QueryIntent.TEST_GENERATION,
        )
        response = await agent._timed_process(query)

        assert response.agent_name == "test_case_generator"
        assert response.structured_data is not None
        assert "test_cases" in response.structured_data
        assert len(response.structured_data["test_cases"]) > 0


@pytest.mark.asyncio
class TestKnowledgeValidatorAgent:
    async def test_validate_information(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        agent = KnowledgeValidatorAgent(vs)

        query = AgentQuery(
            text="Validate that JWT authentication is used in the application",
            intent=QueryIntent.VALIDATION,
        )
        response = await agent._timed_process(query)

        assert response.agent_name == "knowledge_validator"
        assert response.structured_data is not None
        assert "validation_status" in response.structured_data


@pytest.mark.asyncio
class TestOrchestrator:
    async def test_auto_intent_classification(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        orchestrator = AgentOrchestrator(vs)

        query = AgentQuery(text="How does the login API work?")
        response = await orchestrator.process_query(query)

        assert response.answer
        assert response.processing_time_ms >= 0

    async def test_explicit_intent(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        orchestrator = AgentOrchestrator(vs)

        query = AgentQuery(
            text="Generate test cases for authentication",
            intent=QueryIntent.TEST_GENERATION,
        )
        response = await orchestrator.process_query(query)

        assert response.agent_name == "test_case_generator"
        assert response.structured_data is not None

    async def test_list_agents(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        orchestrator = AgentOrchestrator(vs)

        agents = orchestrator.list_agents()
        assert len(agents) == 4
        names = [a["name"] for a in agents]
        assert "document_retrieval" in names
        assert "requirement_analyzer" in names
        assert "test_case_generator" in names
        assert "knowledge_validator" in names

    async def test_with_validation(self, tmp_path):
        vs = await _setup_knowledge_base(tmp_path)
        orchestrator = AgentOrchestrator(vs)

        query = AgentQuery(
            text="How does authentication work?",
            context={"validate": True},
        )
        response = await orchestrator.process_query(query)
        assert "validation" in response.metadata or response.answer
