"""
Document Retrieval Agent — finds and returns the most relevant documents for a query.

Capabilities:
- Semantic search across all ingested documents
- Metadata-filtered retrieval
- Result re-ranking
- Source attribution
"""

from __future__ import annotations

import logging
from typing import Optional

from config.settings import settings
from src.llm_gateway import llm_gateway
from src.models import AgentQuery, AgentResponse, QueryIntent, RetrievedChunk
from src.knowledge_store.vector_store import VectorStore

from .base import BaseAgent

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Document Retrieval specialist for a QA Knowledge Assistant.
Your job is to find and summarize the most relevant information from a knowledge base
to answer tester queries.

Given the user's query and a set of retrieved document chunks, produce a clear,
well-organized answer that:
1. Directly addresses the query
2. Cites specific sources for each claim
3. Highlights any gaps where information was not found
4. Uses bullet points and structure for readability

If the retrieved context is insufficient, say so clearly."""


class DocumentRetrievalAgent(BaseAgent):
    name = "document_retrieval"
    description = "Finds and returns the most relevant documents/chunks for a given query"
    capabilities = [
        "semantic_search",
        "metadata_filtering",
        "result_reranking",
        "source_attribution",
        "context_summarization",
    ]

    def __init__(self, vector_store: Optional[VectorStore] = None):
        self.vector_store = vector_store or VectorStore()

    async def can_handle(self, query: AgentQuery) -> float:
        if query.intent == QueryIntent.FACTUAL_LOOKUP:
            return 0.95
        if query.intent in (QueryIntent.REQUIREMENT_ANALYSIS, QueryIntent.TEST_GENERATION):
            return 0.5  # supporting role
        return 0.3

    async def process(self, query: AgentQuery) -> AgentResponse:
        # 1. Generate query embedding
        query_embedding = await llm_gateway.embed_query(query.text)

        # 2. Build metadata filters from query
        filters = self._build_filters(query)

        # 3. Retrieve from vector store
        top_k = query.context.get("top_k", settings.retrieval_top_k)
        results = self.vector_store.search(query_embedding, top_k=top_k, filters=filters)

        # 4. Deduplicate overlapping chunks from same document
        results = self._deduplicate(results)

        # 5. Take top-k after dedup
        rerank_k = query.context.get("rerank_top_k", settings.rerank_top_k)
        top_results = results[:rerank_k]

        # 6. Build context and generate answer
        if top_results:
            context_text = self._format_context(top_results)
            prompt = (
                f"User Query: {query.text}\n\n"
                f"Retrieved Context:\n{context_text}\n\n"
                "Based on the retrieved context above, provide a comprehensive answer "
                "to the user's query. Cite sources using [Source: title] format."
            )
            answer = await llm_gateway.generate(prompt, system_prompt=SYSTEM_PROMPT)
            confidence = max(r.relevance_score for r in top_results)
        else:
            answer = (
                "No relevant documents found in the knowledge base for this query. "
                "Consider:\n"
                "- Rephrasing your query\n"
                "- Checking if the relevant documents have been ingested\n"
                "- Using different search filters"
            )
            confidence = 0.0

        return AgentResponse(
            agent_name=self.name,
            query_id=query.query_id,
            answer=answer,
            confidence=confidence,
            sources=top_results,
            metadata={
                "total_retrieved": len(results),
                "returned": len(top_results),
                "filters_applied": filters or {},
            },
        )

    async def retrieve_context(self, query: AgentQuery, top_k: int = 5) -> list[RetrievedChunk]:
        """Retrieve raw chunks without LLM summarization (for use by other agents)."""
        query_embedding = await llm_gateway.embed_query(query.text)
        filters = self._build_filters(query)
        results = self.vector_store.search(query_embedding, top_k=top_k, filters=filters)
        return self._deduplicate(results)[:top_k]

    def _build_filters(self, query: AgentQuery) -> Optional[dict]:
        """Extract metadata filters from the query."""
        filters = {}
        if "source_type" in query.filters:
            filters["source_type"] = query.filters["source_type"]
        if "project" in query.filters:
            filters["project"] = query.filters["project"]
        if "doc_type" in query.filters:
            filters["doc_type"] = query.filters["doc_type"]
        return filters if filters else None

    def _deduplicate(self, results: list[RetrievedChunk]) -> list[RetrievedChunk]:
        """Remove duplicate chunks from the same document, keeping highest scored."""
        seen_docs: dict[str, RetrievedChunk] = {}
        unique = []
        for r in results:
            doc_key = f"{r.chunk.doc_id}:{r.chunk.chunk_index}"
            if doc_key not in seen_docs:
                seen_docs[doc_key] = r
                unique.append(r)
        return unique

    def _format_context(self, results: list[RetrievedChunk]) -> str:
        """Format retrieved chunks into a context string for the LLM."""
        parts = []
        for i, r in enumerate(results, 1):
            meta = r.chunk.metadata
            parts.append(
                f"[Source {i}: {meta.title} ({meta.source_type.value})] "
                f"(relevance: {r.relevance_score:.2f})\n"
                f"{r.chunk.content}\n"
            )
        return "\n---\n".join(parts)
