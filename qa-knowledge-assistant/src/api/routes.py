"""
FastAPI application with REST endpoints for the QA Knowledge Assistant.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config.settings import settings
from src.models import AgentQuery, QueryIntent
from src.orchestrator import AgentOrchestrator
from src.ingestion.pipeline import IngestionPipeline
from src.knowledge_store.vector_store import VectorStore
from src.knowledge_store.metadata_store import MetadataStore

logger = logging.getLogger(__name__)


# --- Request/Response Models ---

class QueryRequest(BaseModel):
    query: str = Field(..., description="The user's question or request")
    intent: Optional[str] = Field(None, description="Optional intent override")
    project: Optional[str] = Field(None, description="Filter by project")
    source_type: Optional[str] = Field(None, description="Filter by source type")
    validate: bool = Field(False, description="Run validation on the response")
    session_id: Optional[str] = Field(None, description="Session ID for conversation tracking")


class QueryResponse(BaseModel):
    answer: str
    confidence: float
    agent: str
    sources: list[dict]
    structured_data: Optional[dict] = None
    processing_time_ms: float
    metadata: dict


class IngestTextRequest(BaseModel):
    text: str = Field(..., description="The text content to ingest")
    title: str = Field(..., description="Document title")
    source_type: str = Field("markdown", description="Source type")
    project: str = Field("default", description="Project name")
    tags: list[str] = Field(default_factory=list, description="Tags for the document")


class IngestResponse(BaseModel):
    doc_id: str
    title: str
    source_type: str
    chunk_count: int
    message: str


class StatsResponse(BaseModel):
    vector_store_count: int
    total_documents: int
    total_queries: int
    source_breakdown: dict


# --- Application Factory ---

def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title="QA Knowledge Assistant",
        description=(
            "Multi-agent LLM system for consolidating product documentation "
            "and assisting QA testers."
        ),
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize shared stores
    vector_store = VectorStore()
    metadata_store = MetadataStore()
    orchestrator = AgentOrchestrator(vector_store)
    pipeline = IngestionPipeline(vector_store, metadata_store)

    # --- Health ---

    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "llm_provider": settings.llm_provider,
            "vector_store_count": vector_store.count(),
        }

    # --- Query ---

    @app.post("/api/query", response_model=QueryResponse)
    async def query(request: QueryRequest):
        """Submit a query to the QA Knowledge Assistant."""
        filters = {}
        if request.project:
            filters["project"] = request.project
        if request.source_type:
            filters["source_type"] = request.source_type

        intent = None
        if request.intent:
            try:
                intent = QueryIntent(request.intent)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid intent: {request.intent}. "
                    f"Valid: {[i.value for i in QueryIntent]}",
                )

        agent_query = AgentQuery(
            text=request.query,
            intent=intent,
            filters=filters,
            context={"validate": request.validate},
            session_id=request.session_id,
        )

        response = await orchestrator.process_query(agent_query)

        # Log the query
        metadata_store.log_query(
            query_id=response.query_id,
            query_text=request.query,
            intent=agent_query.intent.value if agent_query.intent else "unknown",
            agent=response.agent_name,
            response_summary=response.answer[:200],
            confidence=response.confidence,
            session_id=request.session_id,
        )

        return QueryResponse(
            answer=response.answer,
            confidence=response.confidence,
            agent=response.agent_name,
            sources=[
                {
                    "title": s.chunk.metadata.title,
                    "source_type": s.chunk.metadata.source_type.value,
                    "relevance_score": s.relevance_score,
                    "source_url": s.chunk.metadata.source_url,
                    "excerpt": s.chunk.content[:200],
                }
                for s in response.sources
            ],
            structured_data=response.structured_data,
            processing_time_ms=response.processing_time_ms,
            metadata=response.metadata,
        )

    # --- Ingestion ---

    @app.post("/api/ingest/text", response_model=IngestResponse)
    async def ingest_text(request: IngestTextRequest):
        """Ingest raw text content into the knowledge base."""
        metadata = await pipeline.ingest_text(
            text=request.text,
            title=request.title,
            source_type=request.source_type,
            project=request.project,
            tags=request.tags,
        )
        return IngestResponse(
            doc_id=metadata.doc_id,
            title=metadata.title,
            source_type=metadata.source_type.value,
            chunk_count=pipeline.get_stats()["vector_store_count"],
            message=f"Successfully ingested '{metadata.title}'",
        )

    @app.post("/api/ingest/file", response_model=IngestResponse)
    async def ingest_file(
        file: UploadFile = File(...),
        project: str = Form("default"),
        tags: str = Form(""),
    ):
        """Upload and ingest a file into the knowledge base."""
        import tempfile
        import os

        # Save uploaded file to temp location
        suffix = os.path.splitext(file.filename or "document.txt")[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]
            metadata = await pipeline.ingest_file(
                tmp_path,
                title=file.filename,
                project=project,
                tags=tag_list,
            )
            return IngestResponse(
                doc_id=metadata.doc_id,
                title=metadata.title,
                source_type=metadata.source_type.value,
                chunk_count=pipeline.get_stats()["vector_store_count"],
                message=f"Successfully ingested '{file.filename}'",
            )
        finally:
            os.unlink(tmp_path)

    # --- Stats & Management ---

    @app.get("/api/stats", response_model=StatsResponse)
    async def get_stats():
        """Get knowledge base statistics."""
        stats = pipeline.get_stats()
        return StatsResponse(**stats)

    @app.get("/api/agents")
    async def list_agents():
        """List all available agents and their capabilities."""
        return orchestrator.list_agents()

    @app.get("/api/documents")
    async def list_documents(
        project: Optional[str] = None,
        source_type: Optional[str] = None,
        doc_type: Optional[str] = None,
    ):
        """List ingested documents with optional filters."""
        docs = metadata_store.search_documents(
            project=project,
            source_type=source_type,
            doc_type=doc_type,
        )
        return [
            {
                "doc_id": d.doc_id,
                "title": d.title,
                "source_type": d.source_type.value,
                "doc_type": d.doc_type.value,
                "project": d.project,
                "author": d.author,
                "tags": d.tags,
                "updated_at": d.updated_at.isoformat(),
            }
            for d in docs
        ]

    return app
