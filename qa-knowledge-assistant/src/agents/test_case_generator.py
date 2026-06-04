"""
Test Case Generator Agent — generates test scenarios, edge cases, and validation logic.

Capabilities:
- Generate positive, negative, and boundary test cases
- Identify edge cases from requirement analysis
- Create data-driven test scenarios
- Suggest test data and expected results
- Generate BDD-style (Given/When/Then) scenarios
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from src.llm_gateway import llm_gateway
from src.models import (
    AgentQuery, AgentResponse, QueryIntent,
    GeneratedTestCase, TestStep, TestCaseType, TestCasePriority,
)
from src.knowledge_store.vector_store import VectorStore

from .base import BaseAgent
from .document_retrieval import DocumentRetrievalAgent
from .requirement_analyzer import RequirementAnalyzerAgent

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Test Case Generator Agent for a QA Knowledge Assistant.
Your job is to generate comprehensive, well-structured test cases for software features.

Given a feature description, requirements, and existing test coverage, generate test cases that:
1. Cover happy paths (positive scenarios)
2. Test error handling (negative scenarios)
3. Check boundary conditions (min/max values, empty states)
4. Identify edge cases (concurrent access, special characters, large data)
5. Include integration scenarios where relevant

For each test case, provide:
- id: unique identifier (TC-GEN-NNN)
- title: descriptive title
- type: positive | negative | boundary | edge_case | integration
- priority: high | medium | low
- preconditions: list of conditions required before test
- steps: numbered list with action and expected_result
- expected_result: overall expected outcome
- test_data: suggested test data values
- edge_case_rationale: why this edge case matters (if applicable)

Respond ONLY with valid JSON containing a "test_cases" array."""


class TestCaseGeneratorAgent(BaseAgent):
    name = "test_case_generator"
    description = "Generates test scenarios, edge cases, and validation logic from requirements"
    capabilities = [
        "positive_test_generation",
        "negative_test_generation",
        "boundary_testing",
        "edge_case_identification",
        "bdd_scenario_generation",
        "test_data_suggestion",
    ]

    def __init__(self, vector_store: Optional[VectorStore] = None):
        self.retrieval_agent = DocumentRetrievalAgent(vector_store)
        self.requirement_agent = RequirementAnalyzerAgent(vector_store)

    async def can_handle(self, query: AgentQuery) -> float:
        if query.intent == QueryIntent.TEST_GENERATION:
            return 0.95
        text_lower = query.text.lower()
        if any(kw in text_lower for kw in ["test case", "test scenario", "edge case", "generate test"]):
            return 0.85
        return 0.1

    async def process(self, query: AgentQuery) -> AgentResponse:
        # 1. Get requirement analysis as context
        req_query = AgentQuery(
            text=query.text,
            intent=QueryIntent.REQUIREMENT_ANALYSIS,
            filters=query.filters,
            context=query.context,
        )
        req_response = await self.requirement_agent.process(req_query)

        # 2. Get existing test docs
        test_query = AgentQuery(
            text=query.text,
            filters={**query.filters, "doc_type": "test_plan"},
            context=query.context,
        )
        existing_tests = await self.retrieval_agent.retrieve_context(test_query, top_k=3)

        existing_test_context = "\n".join(
            f"- {c.chunk.content[:200]}" for c in existing_tests
        ) or "No existing test cases found."

        # 3. Generate test cases
        prompt = (
            f"Feature/Requirement: {query.text}\n\n"
            f"Requirement Analysis:\n{req_response.answer}\n\n"
            f"Existing Test Coverage:\n{existing_test_context}\n\n"
            "Generate comprehensive test cases covering all scenarios. "
            "Avoid duplicating existing tests. Focus on gaps.\n\n"
            "Return a JSON object with a 'test_cases' array."
        )

        result = await llm_gateway.generate_structured(prompt, system_prompt=SYSTEM_PROMPT)

        # 4. Parse test cases
        test_cases = self._parse_test_cases(result)

        # 5. Format human-readable answer
        answer = self._format_answer(query.text, test_cases)

        all_sources = req_response.sources + existing_tests

        return AgentResponse(
            agent_name=self.name,
            query_id=query.query_id,
            answer=answer,
            confidence=min(req_response.confidence + 0.05, 0.95),
            sources=all_sources,
            structured_data={"test_cases": [tc.model_dump() for tc in test_cases]},
            metadata={
                "test_cases_generated": len(test_cases),
                "types_covered": list(set(tc.type.value for tc in test_cases)),
                "based_on_requirement_analysis": True,
            },
        )

    def _parse_test_cases(self, data: dict) -> list[GeneratedTestCase]:
        """Parse LLM JSON output into GeneratedTestCase models."""
        raw_cases = data.get("test_cases", [])
        if isinstance(data.get("raw_response"), str):
            # LLM didn't return valid JSON; use empty list
            return []

        test_cases = []
        for i, tc in enumerate(raw_cases):
            steps = []
            for j, s in enumerate(tc.get("steps", [])):
                if isinstance(s, dict):
                    steps.append(TestStep(
                        step_number=s.get("step_number", j + 1),
                        action=s.get("action", ""),
                        expected_result=s.get("expected_result"),
                    ))
                elif isinstance(s, str):
                    steps.append(TestStep(step_number=j + 1, action=s))

            try:
                tc_type = TestCaseType(tc.get("type", "positive"))
            except ValueError:
                tc_type = TestCaseType.POSITIVE

            try:
                tc_priority = TestCasePriority(tc.get("priority", "medium"))
            except ValueError:
                tc_priority = TestCasePriority.MEDIUM

            test_cases.append(GeneratedTestCase(
                id=tc.get("id", f"TC-GEN-{i + 1:03d}"),
                title=tc.get("title", f"Test Case {i + 1}"),
                type=tc_type,
                priority=tc_priority,
                preconditions=tc.get("preconditions", []),
                steps=steps,
                expected_result=tc.get("expected_result", ""),
                test_data=tc.get("test_data"),
                edge_case_rationale=tc.get("edge_case_rationale"),
            ))

        return test_cases

    def _format_answer(self, feature: str, test_cases: list[GeneratedTestCase]) -> str:
        """Format generated test cases into a human-readable answer."""
        lines = [
            f"## Generated Test Cases for: {feature}\n",
            f"**Total**: {len(test_cases)} test cases\n",
        ]

        # Summary by type
        type_counts: dict[str, int] = {}
        for tc in test_cases:
            type_counts[tc.type.value] = type_counts.get(tc.type.value, 0) + 1
        lines.append("**Breakdown**: " + ", ".join(
            f"{t}: {c}" for t, c in sorted(type_counts.items())
        ))
        lines.append("")

        for tc in test_cases:
            priority_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(tc.priority.value, "")
            lines.append(f"### {tc.id}: {tc.title}")
            lines.append(f"**Type**: {tc.type.value} | **Priority**: {priority_icon} {tc.priority.value}\n")

            if tc.preconditions:
                lines.append("**Preconditions**:")
                for p in tc.preconditions:
                    lines.append(f"- {p}")
                lines.append("")

            if tc.steps:
                lines.append("**Steps**:")
                for s in tc.steps:
                    exp = f" → *{s.expected_result}*" if s.expected_result else ""
                    lines.append(f"{s.step_number}. {s.action}{exp}")
                lines.append("")

            lines.append(f"**Expected Result**: {tc.expected_result}\n")

            if tc.edge_case_rationale:
                lines.append(f"*Edge case rationale*: {tc.edge_case_rationale}\n")

            lines.append("---\n")

        return "\n".join(lines)
