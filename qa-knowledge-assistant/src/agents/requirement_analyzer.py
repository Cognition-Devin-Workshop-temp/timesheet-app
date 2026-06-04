"""
Requirement Analyzer Agent — interprets requirements, identifies dependencies,
traces workflows, and surfaces ambiguities.

Capabilities:
- Parse natural-language requirements into structured format
- Identify requirement dependencies and conflicts
- Detect ambiguous or incomplete requirements
- Map requirements to existing test coverage
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from src.llm_gateway import llm_gateway
from src.models import (
    AgentQuery, AgentResponse, QueryIntent,
    RequirementAnalysis, Ambiguity,
)
from src.knowledge_store.vector_store import VectorStore

from .base import BaseAgent
from .document_retrieval import DocumentRetrievalAgent

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Requirement Analyzer Agent for a QA Knowledge Assistant.
Your job is to analyze product requirements and produce structured analysis that helps
testers understand what to test.

Given a requirement description and supporting context, produce a JSON analysis with:
- requirement_id: an identifier if present, or generate one
- summary: one-line summary of the requirement
- preconditions: what must be true before the feature works
- dependencies: other requirements, systems, or features this depends on
- acceptance_criteria: measurable criteria for testing
- ambiguities: vague, incomplete, or contradictory statements with suggestions
- test_coverage_gaps: areas where testing is likely missing

Be rigorous. Flag every ambiguity you find. Err on the side of flagging too many rather
than too few. A tester reading your analysis should know exactly what to test and what
questions to ask the product owner."""


class RequirementAnalyzerAgent(BaseAgent):
    name = "requirement_analyzer"
    description = "Analyzes requirements for dependencies, ambiguities, and test coverage gaps"
    capabilities = [
        "requirement_parsing",
        "dependency_analysis",
        "ambiguity_detection",
        "coverage_gap_analysis",
        "traceability",
    ]

    def __init__(self, vector_store: Optional[VectorStore] = None):
        self.retrieval_agent = DocumentRetrievalAgent(vector_store)

    async def can_handle(self, query: AgentQuery) -> float:
        if query.intent == QueryIntent.REQUIREMENT_ANALYSIS:
            return 0.95
        text_lower = query.text.lower()
        if any(kw in text_lower for kw in ["requirement", "spec", "acceptance", "dependency", "ambig"]):
            return 0.7
        return 0.2

    async def process(self, query: AgentQuery) -> AgentResponse:
        # 1. Retrieve relevant requirement docs
        req_query = AgentQuery(
            text=query.text,
            filters={**query.filters, "doc_type": "requirement"},
            context=query.context,
        )
        context_chunks = await self.retrieval_agent.retrieve_context(req_query, top_k=5)

        # Also retrieve related test docs for coverage analysis
        test_query = AgentQuery(
            text=query.text,
            filters={**query.filters, "doc_type": "test_plan"},
            context=query.context,
        )
        test_chunks = await self.retrieval_agent.retrieve_context(test_query, top_k=3)

        # 2. Build context
        req_context = "\n\n".join(
            f"[{c.chunk.metadata.title}]: {c.chunk.content}"
            for c in context_chunks
        ) or "No requirement documents found in knowledge base."

        test_context = "\n\n".join(
            f"[{c.chunk.metadata.title}]: {c.chunk.content}"
            for c in test_chunks
        ) or "No test plan documents found."

        # 3. Analyze with LLM
        prompt = (
            f"Analyze the following requirement:\n\n"
            f"Query: {query.text}\n\n"
            f"Requirement Context:\n{req_context}\n\n"
            f"Existing Test Coverage:\n{test_context}\n\n"
            "Produce a structured JSON analysis with these fields:\n"
            "requirement_id, summary, preconditions (list), dependencies (list), "
            "acceptance_criteria (list), ambiguities (list of {{text, concern, suggestion}}), "
            "test_coverage_gaps (list)"
        )

        result = await llm_gateway.generate_structured(prompt, system_prompt=SYSTEM_PROMPT)

        # 4. Parse into model
        analysis = self._parse_analysis(result)

        all_sources = context_chunks + test_chunks
        confidence = max((s.relevance_score for s in all_sources), default=0.5)

        return AgentResponse(
            agent_name=self.name,
            query_id=query.query_id,
            answer=self._format_answer(analysis),
            confidence=min(confidence, 0.95),
            sources=all_sources,
            structured_data=analysis.model_dump(),
            metadata={
                "requirement_docs_found": len(context_chunks),
                "test_docs_found": len(test_chunks),
            },
        )

    def _parse_analysis(self, data: dict) -> RequirementAnalysis:
        """Parse LLM output into RequirementAnalysis model."""
        ambiguities = []
        for a in data.get("ambiguities", []):
            if isinstance(a, dict):
                ambiguities.append(Ambiguity(
                    text=a.get("text", ""),
                    concern=a.get("concern", ""),
                    suggestion=a.get("suggestion", ""),
                ))

        return RequirementAnalysis(
            requirement_id=data.get("requirement_id"),
            summary=data.get("summary", ""),
            preconditions=data.get("preconditions", []),
            dependencies=data.get("dependencies", []),
            acceptance_criteria=data.get("acceptance_criteria", []),
            ambiguities=ambiguities,
            test_coverage_gaps=data.get("test_coverage_gaps", []),
        )

    def _format_answer(self, analysis: RequirementAnalysis) -> str:
        """Format analysis into a human-readable answer."""
        lines = [f"## Requirement Analysis: {analysis.summary}\n"]

        if analysis.requirement_id:
            lines.append(f"**ID**: {analysis.requirement_id}\n")

        if analysis.preconditions:
            lines.append("### Preconditions")
            for p in analysis.preconditions:
                lines.append(f"- {p}")
            lines.append("")

        if analysis.dependencies:
            lines.append("### Dependencies")
            for d in analysis.dependencies:
                lines.append(f"- {d}")
            lines.append("")

        if analysis.acceptance_criteria:
            lines.append("### Acceptance Criteria")
            for ac in analysis.acceptance_criteria:
                lines.append(f"- {ac}")
            lines.append("")

        if analysis.ambiguities:
            lines.append("### ⚠ Ambiguities Found")
            for a in analysis.ambiguities:
                lines.append(f"- **\"{a.text}\"** — {a.concern}")
                lines.append(f"  - *Suggestion*: {a.suggestion}")
            lines.append("")

        if analysis.test_coverage_gaps:
            lines.append("### Test Coverage Gaps")
            for g in analysis.test_coverage_gaps:
                lines.append(f"- {g}")

        return "\n".join(lines)
