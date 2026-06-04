"""
Shared data models used across agents, orchestrator, and API.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# --- Enums ---

class SourceType(str, Enum):
    CONFLUENCE = "confluence"
    SHAREPOINT = "sharepoint"
    PDF = "pdf"
    EXCEL = "excel"
    ADO = "ado"
    EMAIL = "email"
    MARKDOWN = "markdown"


class DocType(str, Enum):
    REQUIREMENT = "requirement"
    TEST_PLAN = "test_plan"
    BUG_REPORT = "bug_report"
    DESIGN_DOC = "design_doc"
    API_DOC = "api_doc"
    EMAIL = "email"
    GENERAL = "general"


class QueryIntent(str, Enum):
    FACTUAL_LOOKUP = "factual_lookup"
    REQUIREMENT_ANALYSIS = "requirement_analysis"
    TEST_GENERATION = "test_generation"
    VALIDATION = "validation"
    COMPOSITE = "composite"


class TestCaseType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    BOUNDARY = "boundary"
    EDGE_CASE = "edge_case"
    INTEGRATION = "integration"


class TestCasePriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ValidationStatus(str, Enum):
    VALIDATED = "validated"
    VALIDATED_WITH_WARNINGS = "validated_with_warnings"
    FAILED = "failed"
    INSUFFICIENT_DATA = "insufficient_data"


# --- Document Models ---

class DocumentMetadata(BaseModel):
    doc_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_type: SourceType
    source_url: Optional[str] = None
    title: str
    author: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tags: list[str] = Field(default_factory=list)
    project: str = "default"
    doc_type: DocType = DocType.GENERAL
    version: int = 1


class DocumentChunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    doc_id: str
    content: str
    chunk_index: int
    total_chunks: int
    metadata: DocumentMetadata


class RetrievedChunk(BaseModel):
    chunk: DocumentChunk
    relevance_score: float
    source_attribution: str


# --- Agent Models ---

class AgentQuery(BaseModel):
    query_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    intent: Optional[QueryIntent] = None
    context: dict[str, Any] = Field(default_factory=dict)
    filters: dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None
    conversation_history: list[dict[str, str]] = Field(default_factory=list)


class AgentResponse(BaseModel):
    agent_name: str
    query_id: str
    answer: str
    confidence: float = 0.0
    sources: list[RetrievedChunk] = Field(default_factory=list)
    structured_data: Optional[dict[str, Any]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    processing_time_ms: float = 0.0


# --- Test Case Models ---

class TestStep(BaseModel):
    step_number: int
    action: str
    expected_result: Optional[str] = None


class GeneratedTestCase(BaseModel):
    id: str
    title: str
    type: TestCaseType
    priority: TestCasePriority
    preconditions: list[str] = Field(default_factory=list)
    steps: list[TestStep] = Field(default_factory=list)
    expected_result: str
    test_data: Optional[dict[str, Any]] = None
    edge_case_rationale: Optional[str] = None


# --- Validation Models ---

class ClaimValidation(BaseModel):
    claim: str
    status: str  # confirmed, warning, contradiction, unverified
    detail: Optional[str] = None
    sources: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class Contradiction(BaseModel):
    topic: str
    source_a: str
    source_b: str
    recommendation: str


class ValidationReport(BaseModel):
    validation_status: ValidationStatus
    confidence: float
    validations: list[ClaimValidation] = Field(default_factory=list)
    contradictions: list[Contradiction] = Field(default_factory=list)


# --- Requirement Models ---

class Ambiguity(BaseModel):
    text: str
    concern: str
    suggestion: str


class RequirementAnalysis(BaseModel):
    requirement_id: Optional[str] = None
    summary: str
    preconditions: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    ambiguities: list[Ambiguity] = Field(default_factory=list)
    test_coverage_gaps: list[str] = Field(default_factory=list)
