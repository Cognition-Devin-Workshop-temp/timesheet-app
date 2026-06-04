"""
Agent Orchestrator — routes queries to the appropriate agent(s)
and manages multi-agent collaboration pipelines.
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from src.llm_gateway import llm_gateway
from src.models import AgentQuery, AgentResponse, QueryIntent
from src.agents import (
    BaseAgent,
    DocumentRetrievalAgent,
    RequirementAnalyzerAgent,
    TestCaseGeneratorAgent,
    KnowledgeValidatorAgent,
)
from src.knowledge_store.vector_store import VectorStore

logger = logging.getLogger(__name__)

INTENT_CLASSIFICATION_PROMPT = """Classify the following user query into exactly one intent category.

Query: {query}

Categories:
- factual_lookup: User wants factual information about the product, feature, or process
- requirement_analysis: User wants to analyze, understand, or trace requirements
- test_generation: User wants to generate test cases, test scenarios, or identify edge cases
- validation: User wants to validate, verify, or cross-check information

Respond with ONLY the category name, nothing else."""


class AgentOrchestrator:
    """Routes queries to agents and manages multi-agent pipelines."""

    def __init__(self, vector_store: Optional[VectorStore] = None):
        self.vector_store = vector_store or VectorStore()

        # Initialize agents
        self.agents: dict[str, BaseAgent] = {
            "document_retrieval": DocumentRetrievalAgent(self.vector_store),
            "requirement_analyzer": RequirementAnalyzerAgent(self.vector_store),
            "test_case_generator": TestCaseGeneratorAgent(self.vector_store),
            "knowledge_validator": KnowledgeValidatorAgent(self.vector_store),
        }

        logger.info(f"Orchestrator initialized with {len(self.agents)} agents")

    async def process_query(self, query: AgentQuery) -> AgentResponse:
        """Process a user query through the appropriate agent pipeline."""
        start = time.time()

        # 1. Classify intent if not provided
        if not query.intent:
            query.intent = await self._classify_intent(query.text)
            logger.info(f"Classified intent: {query.intent.value}")

        # 2. Route to appropriate agent(s)
        response = await self._route_query(query)

        # 3. Optionally validate the response
        if query.context.get("validate", False) and query.intent != QueryIntent.VALIDATION:
            response = await self._validate_response(query, response)

        elapsed = (time.time() - start) * 1000
        response.processing_time_ms = elapsed
        logger.info(
            f"Query processed in {elapsed:.0f}ms "
            f"(intent={query.intent.value}, agent={response.agent_name})"
        )

        return response

    async def _classify_intent(self, query_text: str) -> QueryIntent:
        """Use LLM to classify the query intent."""
        prompt = INTENT_CLASSIFICATION_PROMPT.format(query=query_text)
        result = await llm_gateway.generate(prompt)
        result = result.strip().lower().replace(" ", "_")

        try:
            return QueryIntent(result)
        except ValueError:
            logger.warning(f"Unknown intent '{result}', defaulting to factual_lookup")
            return QueryIntent.FACTUAL_LOOKUP

    async def _route_query(self, query: AgentQuery) -> AgentResponse:
        """Route query to the best agent based on intent."""
        intent_to_agent = {
            QueryIntent.FACTUAL_LOOKUP: "document_retrieval",
            QueryIntent.REQUIREMENT_ANALYSIS: "requirement_analyzer",
            QueryIntent.TEST_GENERATION: "test_case_generator",
            QueryIntent.VALIDATION: "knowledge_validator",
        }

        agent_name = intent_to_agent.get(query.intent, "document_retrieval")

        if query.intent == QueryIntent.COMPOSITE:
            return await self._run_composite_pipeline(query)

        agent = self.agents[agent_name]
        return await agent._timed_process(query)

    async def _run_composite_pipeline(self, query: AgentQuery) -> AgentResponse:
        """Run a multi-agent pipeline for complex composite queries."""
        # Step 1: Retrieve context
        retrieval = self.agents["document_retrieval"]
        retrieval_response = await retrieval._timed_process(query)

        # Step 2: Analyze requirements
        req_query = AgentQuery(
            text=query.text,
            intent=QueryIntent.REQUIREMENT_ANALYSIS,
            context={**query.context, "retrieval_context": retrieval_response.answer},
            filters=query.filters,
        )
        req_response = await self.agents["requirement_analyzer"]._timed_process(req_query)

        # Step 3: Generate test cases
        test_query = AgentQuery(
            text=query.text,
            intent=QueryIntent.TEST_GENERATION,
            context={
                **query.context,
                "retrieval_context": retrieval_response.answer,
                "requirement_analysis": req_response.answer,
            },
            filters=query.filters,
        )
        test_response = await self.agents["test_case_generator"]._timed_process(test_query)

        # Combine results
        combined_answer = (
            f"# Composite Analysis\n\n"
            f"## Retrieved Knowledge\n{retrieval_response.answer}\n\n"
            f"## Requirement Analysis\n{req_response.answer}\n\n"
            f"## Generated Test Cases\n{test_response.answer}"
        )

        all_sources = (
            retrieval_response.sources
            + req_response.sources
            + test_response.sources
        )

        # Deduplicate sources
        seen = set()
        unique_sources = []
        for s in all_sources:
            key = s.chunk.chunk_id
            if key not in seen:
                seen.add(key)
                unique_sources.append(s)

        return AgentResponse(
            agent_name="composite_pipeline",
            query_id=query.query_id,
            answer=combined_answer,
            confidence=min(
                retrieval_response.confidence,
                req_response.confidence,
                test_response.confidence,
            ),
            sources=unique_sources,
            structured_data={
                "retrieval": retrieval_response.structured_data,
                "requirement_analysis": req_response.structured_data,
                "test_cases": test_response.structured_data,
            },
            metadata={
                "pipeline": "composite",
                "agents_used": [
                    retrieval_response.agent_name,
                    req_response.agent_name,
                    test_response.agent_name,
                ],
            },
        )

    async def _validate_response(
        self, original_query: AgentQuery, response: AgentResponse
    ) -> AgentResponse:
        """Run validation agent on the response."""
        validator = self.agents["knowledge_validator"]
        validation_query = AgentQuery(
            text=original_query.text,
            intent=QueryIntent.VALIDATION,
            context={
                **original_query.context,
                "claims_to_validate": response.answer,
            },
            filters=original_query.filters,
        )
        validation_response = await validator._timed_process(validation_query)

        # Append validation to the original response
        response.answer += f"\n\n---\n\n{validation_response.answer}"
        response.metadata["validation"] = validation_response.structured_data

        return response

    def list_agents(self) -> list[dict]:
        """List all registered agents and their capabilities."""
        return [
            {
                "name": agent.name,
                "description": agent.description,
                "capabilities": agent.capabilities,
            }
            for agent in self.agents.values()
        ]
