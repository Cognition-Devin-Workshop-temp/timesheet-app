"""
Knowledge Validator Agent — verifies accuracy, detects contradictions,
and ensures knowledge consistency.

Capabilities:
- Cross-reference answers against multiple source documents
- Detect contradictions between documents
- Verify generated test cases against requirements
- Flag outdated documentation
- Compute confidence scores
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from src.llm_gateway import llm_gateway
from src.models import (
    AgentQuery, AgentResponse, QueryIntent,
    ValidationReport, ValidationStatus,
    ClaimValidation, Contradiction,
)
from src.knowledge_store.vector_store import VectorStore

from .base import BaseAgent
from .document_retrieval import DocumentRetrievalAgent

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Knowledge Validator Agent for a QA Knowledge Assistant.
Your job is to verify the accuracy and consistency of information by cross-referencing
multiple source documents.

Given a statement or set of claims and supporting context documents, produce a JSON
validation report with:
- validation_status: "validated" | "validated_with_warnings" | "failed" | "insufficient_data"
- confidence: overall confidence score 0.0-1.0
- validations: array of claim validations, each with:
  - claim: the claim being validated
  - status: "confirmed" | "warning" | "contradiction" | "unverified"
  - detail: explanation (especially for warnings/contradictions)
  - sources: list of source documents supporting/contradicting
  - confidence: per-claim confidence 0.0-1.0
- contradictions: array of detected contradictions with:
  - topic: what the contradiction is about
  - source_a: first source and its claim
  - source_b: second source and its claim
  - recommendation: how to resolve

Be skeptical. Cross-reference every claim. If a claim has only one source, note it as
lower confidence. If sources disagree, always flag it."""


class KnowledgeValidatorAgent(BaseAgent):
    name = "knowledge_validator"
    description = "Verifies accuracy and consistency of information across sources"
    capabilities = [
        "cross_referencing",
        "contradiction_detection",
        "test_case_validation",
        "staleness_detection",
        "confidence_scoring",
    ]

    def __init__(self, vector_store: Optional[VectorStore] = None):
        self.retrieval_agent = DocumentRetrievalAgent(vector_store)

    async def can_handle(self, query: AgentQuery) -> float:
        if query.intent == QueryIntent.VALIDATION:
            return 0.95
        text_lower = query.text.lower()
        if any(kw in text_lower for kw in ["validate", "verify", "contradict", "consistent", "accurate"]):
            return 0.8
        return 0.15

    async def process(self, query: AgentQuery) -> AgentResponse:
        # 1. Retrieve all relevant documents for cross-referencing
        context_chunks = await self.retrieval_agent.retrieve_context(
            query, top_k=8
        )

        # 2. Build context for validation
        context_text = "\n\n".join(
            f"[Source: {c.chunk.metadata.title} ({c.chunk.metadata.source_type.value}, "
            f"updated: {c.chunk.metadata.updated_at.strftime('%Y-%m-%d')})]\n{c.chunk.content}"
            for c in context_chunks
        ) or "No source documents found for validation."

        # 3. Extract claims to validate
        claims_text = query.context.get("claims_to_validate", query.text)

        # 4. Validate with LLM
        prompt = (
            f"Validate the following claims/information:\n\n"
            f"{claims_text}\n\n"
            f"Against these source documents:\n\n{context_text}\n\n"
            "Produce a structured JSON validation report. "
            "Cross-reference each claim against the sources. "
            "Flag any contradictions, missing evidence, or outdated sources."
        )

        result = await llm_gateway.generate_structured(prompt, system_prompt=SYSTEM_PROMPT)

        # 5. Parse validation report
        report = self._parse_report(result)

        # 6. Format answer
        answer = self._format_answer(report)

        return AgentResponse(
            agent_name=self.name,
            query_id=query.query_id,
            answer=answer,
            confidence=report.confidence,
            sources=context_chunks,
            structured_data=report.model_dump(),
            metadata={
                "validation_status": report.validation_status.value,
                "claims_validated": len(report.validations),
                "contradictions_found": len(report.contradictions),
                "sources_checked": len(context_chunks),
            },
        )

    async def validate_test_cases(self, test_cases_data: dict, query: AgentQuery) -> AgentResponse:
        """Specialized method to validate generated test cases against requirements."""
        claims = []
        for tc in test_cases_data.get("test_cases", []):
            claims.append(
                f"Test '{tc.get('title', '')}': {tc.get('expected_result', '')}"
            )

        validation_query = AgentQuery(
            text=query.text,
            intent=QueryIntent.VALIDATION,
            context={
                **query.context,
                "claims_to_validate": "\n".join(f"- {c}" for c in claims),
            },
            filters=query.filters,
        )
        return await self.process(validation_query)

    def _parse_report(self, data: dict) -> ValidationReport:
        """Parse LLM output into ValidationReport model."""
        try:
            status = ValidationStatus(data.get("validation_status", "insufficient_data"))
        except ValueError:
            status = ValidationStatus.INSUFFICIENT_DATA

        validations = []
        for v in data.get("validations", []):
            if isinstance(v, dict):
                validations.append(ClaimValidation(
                    claim=v.get("claim", ""),
                    status=v.get("status", "unverified"),
                    detail=v.get("detail"),
                    sources=v.get("sources", []),
                    confidence=float(v.get("confidence", 0.5)),
                ))

        contradictions = []
        for c in data.get("contradictions", []):
            if isinstance(c, dict):
                contradictions.append(Contradiction(
                    topic=c.get("topic", ""),
                    source_a=c.get("source_a", ""),
                    source_b=c.get("source_b", ""),
                    recommendation=c.get("recommendation", ""),
                ))

        return ValidationReport(
            validation_status=status,
            confidence=float(data.get("confidence", 0.5)),
            validations=validations,
            contradictions=contradictions,
        )

    def _format_answer(self, report: ValidationReport) -> str:
        """Format validation report into human-readable answer."""
        status_icon = {
            "validated": "✅",
            "validated_with_warnings": "⚠️",
            "failed": "❌",
            "insufficient_data": "❓",
        }

        lines = [
            f"## Validation Report",
            f"**Status**: {status_icon.get(report.validation_status.value, '')} "
            f"{report.validation_status.value.replace('_', ' ').title()}",
            f"**Overall Confidence**: {report.confidence:.0%}\n",
        ]

        if report.validations:
            lines.append("### Claim Validations\n")
            for v in report.validations:
                claim_icon = {
                    "confirmed": "✅",
                    "warning": "⚠️",
                    "contradiction": "❌",
                    "unverified": "❓",
                }.get(v.status, "")
                lines.append(f"- {claim_icon} **{v.claim}** (confidence: {v.confidence:.0%})")
                if v.detail:
                    lines.append(f"  - {v.detail}")
                if v.sources:
                    lines.append(f"  - Sources: {', '.join(v.sources)}")
            lines.append("")

        if report.contradictions:
            lines.append("### ⚠ Contradictions Detected\n")
            for c in report.contradictions:
                lines.append(f"**{c.topic}**:")
                lines.append(f"- Source A: {c.source_a}")
                lines.append(f"- Source B: {c.source_b}")
                lines.append(f"- *Recommendation*: {c.recommendation}\n")

        return "\n".join(lines)
