"""
LLM Gateway — centralized LLM access with provider abstraction.
Supports OpenAI, Azure OpenAI, and a mock provider for testing without API keys.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional

from config.settings import settings

logger = logging.getLogger(__name__)


class LLMGateway:
    """Centralized gateway for LLM calls with provider abstraction."""

    def __init__(self, provider: Optional[str] = None):
        self.provider = provider or settings.llm_provider
        self._llm = None
        self._embeddings = None
        self._init_provider()

    def _init_provider(self) -> None:
        if self.provider == "openai":
            self._init_openai()
        elif self.provider == "azure_openai":
            self._init_azure_openai()
        else:
            logger.info("Using mock LLM provider (no API key required)")

    def _init_openai(self) -> None:
        try:
            from langchain_openai import ChatOpenAI, OpenAIEmbeddings
            self._llm = ChatOpenAI(
                model="gpt-4o-mini",
                api_key=settings.openai_api_key,
                temperature=0.1,
            )
            self._embeddings = OpenAIEmbeddings(
                model=settings.embedding_model,
                api_key=settings.openai_api_key,
            )
        except Exception as e:
            logger.warning(f"Failed to init OpenAI: {e}. Falling back to mock.")
            self.provider = "mock"

    def _init_azure_openai(self) -> None:
        try:
            from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings
            self._llm = AzureChatOpenAI(
                deployment_name=settings.azure_openai_deployment,
                azure_endpoint=settings.azure_openai_endpoint,
                api_key=settings.azure_openai_api_key,
                temperature=0.1,
            )
            self._embeddings = AzureOpenAIEmbeddings(
                deployment="text-embedding-3-small",
                azure_endpoint=settings.azure_openai_endpoint,
                api_key=settings.azure_openai_api_key,
            )
        except Exception as e:
            logger.warning(f"Failed to init Azure OpenAI: {e}. Falling back to mock.")
            self.provider = "mock"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> str:
        """Generate text completion from the LLM."""
        start = time.time()

        if self.provider == "mock":
            result = self._mock_generate(prompt, system_prompt)
        else:
            messages = []
            if system_prompt:
                messages.append(("system", system_prompt))
            messages.append(("human", prompt))
            response = await self._llm.ainvoke(messages)
            result = response.content

        elapsed = (time.time() - start) * 1000
        logger.debug(f"LLM generate took {elapsed:.0f}ms (provider={self.provider})")
        return result

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> dict[str, Any]:
        """Generate structured JSON output from the LLM."""
        json_prompt = (
            f"{prompt}\n\n"
            "Respond ONLY with valid JSON. No markdown, no explanation."
        )
        raw = await self.generate(json_prompt, system_prompt)
        try:
            # Strip markdown code fences if present
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse LLM JSON output: {raw[:200]}...")
            return {"raw_response": raw}

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        if self.provider == "mock":
            return self._mock_embed(texts)
        return await self._embeddings.aembed_documents(texts)

    async def embed_query(self, text: str) -> list[float]:
        """Generate embedding for a single query text."""
        if self.provider == "mock":
            return self._mock_embed([text])[0]
        return await self._embeddings.aembed_query(text)

    def _mock_generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Mock LLM generation for testing without API keys."""
        prompt_lower = prompt.lower()

        if "classify" in prompt_lower and "intent" in prompt_lower:
            return self._mock_classify_intent(prompt_lower)

        if "test case" in prompt_lower or "test scenario" in prompt_lower:
            return self._mock_test_generation(prompt)

        if "requirement" in prompt_lower and "analy" in prompt_lower:
            return self._mock_requirement_analysis(prompt)

        if "valid" in prompt_lower or "contradict" in prompt_lower:
            return self._mock_validation(prompt)

        return self._mock_factual_response(prompt)

    def _mock_classify_intent(self, prompt: str) -> str:
        if "test" in prompt and ("generat" in prompt or "creat" in prompt):
            return "test_generation"
        if "requirement" in prompt or "spec" in prompt:
            return "requirement_analysis"
        if "valid" in prompt or "verify" in prompt:
            return "validation"
        return "factual_lookup"

    def _mock_test_generation(self, prompt: str) -> str:
        return json.dumps({
            "feature": "Extracted from query",
            "test_cases": [
                {
                    "id": "TC-GEN-001",
                    "title": "Verify happy path for the described feature",
                    "type": "positive",
                    "priority": "high",
                    "preconditions": ["User is authenticated", "System is in default state"],
                    "steps": [
                        {"step_number": 1, "action": "Navigate to the feature", "expected_result": "Feature page loads"},
                        {"step_number": 2, "action": "Perform the primary action", "expected_result": "Action succeeds"},
                        {"step_number": 3, "action": "Verify the result", "expected_result": "Expected outcome observed"}
                    ],
                    "expected_result": "Feature works correctly as described in requirements",
                    "edge_case_rationale": None
                },
                {
                    "id": "TC-GEN-002",
                    "title": "Verify behavior with invalid input",
                    "type": "negative",
                    "priority": "medium",
                    "preconditions": ["User is authenticated"],
                    "steps": [
                        {"step_number": 1, "action": "Navigate to the feature", "expected_result": "Feature page loads"},
                        {"step_number": 2, "action": "Submit invalid input", "expected_result": "Validation error displayed"}
                    ],
                    "expected_result": "System handles invalid input gracefully with appropriate error message",
                    "edge_case_rationale": "Negative testing for input validation"
                },
                {
                    "id": "TC-GEN-003",
                    "title": "Verify boundary condition — empty state",
                    "type": "boundary",
                    "priority": "medium",
                    "preconditions": ["User is authenticated", "No existing data"],
                    "steps": [
                        {"step_number": 1, "action": "Access feature with no data", "expected_result": "Empty state message shown"}
                    ],
                    "expected_result": "System displays appropriate empty state without errors",
                    "edge_case_rationale": "Boundary condition — zero-data scenario"
                }
            ]
        })

    def _mock_requirement_analysis(self, prompt: str) -> str:
        return json.dumps({
            "requirement_id": "REQ-MOCK-001",
            "summary": "Requirement extracted from provided context",
            "preconditions": ["User must be authenticated", "Required data must exist"],
            "dependencies": ["Authentication system", "Database connectivity"],
            "acceptance_criteria": [
                "Feature performs the described function",
                "Error handling covers edge cases",
                "Performance meets SLA requirements"
            ],
            "ambiguities": [
                {
                    "text": "appropriate handling",
                    "concern": "What constitutes 'appropriate handling' is not specified",
                    "suggestion": "Define specific error codes and user-facing messages"
                }
            ],
            "test_coverage_gaps": [
                "No concurrent access testing specified",
                "No performance/load testing criteria defined"
            ]
        })

    def _mock_validation(self, prompt: str) -> str:
        return json.dumps({
            "validation_status": "validated_with_warnings",
            "confidence": 0.82,
            "validations": [
                {
                    "claim": "Primary functionality works as described",
                    "status": "confirmed",
                    "sources": ["Requirements document", "API specification"],
                    "confidence": 0.90
                },
                {
                    "claim": "Edge cases are handled",
                    "status": "warning",
                    "detail": "Edge case handling not fully documented in source materials",
                    "sources": ["Requirements document"],
                    "confidence": 0.65
                }
            ],
            "contradictions": []
        })

    def _mock_factual_response(self, prompt: str) -> str:
        return (
            "[Mock Response] Based on the ingested knowledge base, here is what I found:\n\n"
            "The system provides the requested functionality as documented in the "
            "ingested sources. Key points:\n"
            "1. The feature is documented in the requirements specification\n"
            "2. Related test cases exist in the test plan\n"
            "3. No known defects are currently open for this area\n\n"
            "Sources: Requirements Doc, Test Plan, API Documentation"
        )

    def _mock_embed(self, texts: list[str]) -> list[list[float]]:
        """Generate deterministic mock embeddings based on text content."""
        import hashlib
        results = []
        for text in texts:
            hash_bytes = hashlib.sha256(text.encode()).digest()
            dim = settings.embedding_dimension
            embedding = [
                (b / 255.0) * 2 - 1  # normalize to [-1, 1]
                for b in (hash_bytes * ((dim // len(hash_bytes)) + 1))[:dim]
            ]
            # Normalize to unit vector
            norm = sum(x * x for x in embedding) ** 0.5
            embedding = [x / norm for x in embedding]
            results.append(embedding)
        return results


# Singleton instance
llm_gateway = LLMGateway()
