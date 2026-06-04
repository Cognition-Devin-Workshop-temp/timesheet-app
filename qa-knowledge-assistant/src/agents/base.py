"""
Base agent class — defines the contract for all agents.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod

from src.models import AgentQuery, AgentResponse

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Abstract base class for all agents in the multi-agent system."""

    name: str = "base_agent"
    description: str = "Base agent"
    capabilities: list[str] = []

    @abstractmethod
    async def process(self, query: AgentQuery) -> AgentResponse:
        """Process a query and return a structured response."""

    async def can_handle(self, query: AgentQuery) -> float:
        """
        Return a confidence score (0.0 - 1.0) indicating how well
        this agent can handle the given query.
        """
        return 0.0

    async def _timed_process(self, query: AgentQuery) -> AgentResponse:
        """Wrapper that measures processing time."""
        start = time.time()
        response = await self.process(query)
        elapsed_ms = (time.time() - start) * 1000
        response.processing_time_ms = elapsed_ms
        logger.info(
            f"[{self.name}] Processed query '{query.text[:60]}...' "
            f"in {elapsed_ms:.0f}ms (confidence={response.confidence:.2f})"
        )
        return response
