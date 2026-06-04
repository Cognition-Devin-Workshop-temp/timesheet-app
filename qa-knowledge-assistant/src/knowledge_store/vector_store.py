"""
Vector store for semantic search over document chunks.

Uses an in-memory implementation with cosine similarity.
In production, swap this for ChromaDB, Pinecone, Qdrant, or Weaviate.
"""

from __future__ import annotations

import json
import logging
import math
import os
from typing import Optional

from config.settings import settings
from src.models import DocumentChunk, DocumentMetadata, RetrievedChunk, SourceType, DocType

logger = logging.getLogger(__name__)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class _StoredChunk:
    """Internal storage record for a chunk with its embedding and metadata."""
    __slots__ = ("chunk_id", "doc_id", "content", "embedding", "metadata_dict",
                 "chunk_index", "total_chunks")

    def __init__(
        self,
        chunk_id: str,
        doc_id: str,
        content: str,
        embedding: list[float],
        metadata_dict: dict,
        chunk_index: int,
        total_chunks: int,
    ):
        self.chunk_id = chunk_id
        self.doc_id = doc_id
        self.content = content
        self.embedding = embedding
        self.metadata_dict = metadata_dict
        self.chunk_index = chunk_index
        self.total_chunks = total_chunks


class VectorStore:
    """In-memory vector store with cosine similarity search.

    This PoC implementation keeps all embeddings in memory and computes
    brute-force cosine similarity at query time.  It is functionally
    equivalent to ChromaDB / FAISS for small-to-medium knowledge bases
    (< 100k chunks) and requires no native dependencies.

    For production, replace this class with a ChromaDB, Pinecone, Qdrant,
    or Weaviate adapter — the interface remains identical.
    """

    def __init__(self, persist_dir: Optional[str] = None, collection_name: Optional[str] = None):
        self.persist_dir = persist_dir or settings.chroma_persist_dir
        self.collection_name = collection_name or settings.chroma_collection_name
        self._store: list[_StoredChunk] = []

        # Try to load persisted data
        self._persistence_path = os.path.join(self.persist_dir, f"{self.collection_name}.json")
        self._load()

        logger.info(
            f"VectorStore initialized: collection='{self.collection_name}', "
            f"count={len(self._store)}"
        )

    def add_chunks(
        self,
        chunks: list[DocumentChunk],
        embeddings: list[list[float]],
    ) -> None:
        """Add document chunks with their embeddings to the store."""
        for chunk, emb in zip(chunks, embeddings):
            self._store.append(_StoredChunk(
                chunk_id=chunk.chunk_id,
                doc_id=chunk.doc_id,
                content=chunk.content,
                embedding=emb,
                metadata_dict={
                    "doc_id": chunk.doc_id,
                    "title": chunk.metadata.title,
                    "source_type": chunk.metadata.source_type.value,
                    "doc_type": chunk.metadata.doc_type.value,
                    "project": chunk.metadata.project,
                    "tags": ",".join(chunk.metadata.tags),
                    "author": chunk.metadata.author or "",
                    "source_url": chunk.metadata.source_url or "",
                },
                chunk_index=chunk.chunk_index,
                total_chunks=chunk.total_chunks,
            ))

        self._persist()
        logger.info(f"Added {len(chunks)} chunks to vector store (total: {len(self._store)})")

    def search(
        self,
        query_embedding: list[float],
        top_k: int = 10,
        filters: Optional[dict] = None,
    ) -> list[RetrievedChunk]:
        """Search for similar chunks using cosine similarity."""
        candidates = self._store

        # Apply metadata filters
        if filters:
            candidates = [
                c for c in candidates
                if all(c.metadata_dict.get(k) == v for k, v in filters.items())
            ]

        if not candidates:
            return []

        # Compute similarities
        scored = []
        for stored in candidates:
            sim = _cosine_similarity(query_embedding, stored.embedding)
            scored.append((stored, sim))

        # Sort by similarity descending
        scored.sort(key=lambda x: x[1], reverse=True)

        # Take top-k
        results = []
        for stored, sim in scored[:top_k]:
            meta = stored.metadata_dict
            doc_meta = DocumentMetadata(
                doc_id=meta["doc_id"],
                source_type=SourceType(meta["source_type"]),
                source_url=meta.get("source_url") or None,
                title=meta["title"],
                author=meta.get("author") or None,
                tags=meta.get("tags", "").split(",") if meta.get("tags") else [],
                project=meta.get("project", "default"),
                doc_type=DocType(meta["doc_type"]),
            )

            chunk = DocumentChunk(
                chunk_id=stored.chunk_id,
                doc_id=stored.doc_id,
                content=stored.content,
                chunk_index=stored.chunk_index,
                total_chunks=stored.total_chunks,
                metadata=doc_meta,
            )

            source_attr = f"{meta['title']} ({meta['source_type']})"
            if meta.get("source_url"):
                source_attr += f" — {meta['source_url']}"

            results.append(RetrievedChunk(
                chunk=chunk,
                relevance_score=max(0.0, sim),
                source_attribution=source_attr,
            ))

        return results

    def delete_by_doc_id(self, doc_id: str) -> None:
        """Delete all chunks belonging to a document."""
        self._store = [c for c in self._store if c.doc_id != doc_id]
        self._persist()
        logger.info(f"Deleted chunks for doc_id={doc_id}")

    def count(self) -> int:
        """Return total number of chunks in the store."""
        return len(self._store)

    def reset(self) -> None:
        """Clear all data from the collection."""
        self._store.clear()
        self._persist()
        logger.info("Vector store reset")

    def _persist(self) -> None:
        """Persist store to disk as JSON."""
        try:
            os.makedirs(os.path.dirname(self._persistence_path), exist_ok=True)
            data = [
                {
                    "chunk_id": s.chunk_id,
                    "doc_id": s.doc_id,
                    "content": s.content,
                    "embedding": s.embedding,
                    "metadata_dict": s.metadata_dict,
                    "chunk_index": s.chunk_index,
                    "total_chunks": s.total_chunks,
                }
                for s in self._store
            ]
            with open(self._persistence_path, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception as e:
            logger.warning(f"Failed to persist vector store: {e}")

    def _load(self) -> None:
        """Load persisted store from disk."""
        if not os.path.exists(self._persistence_path):
            return
        try:
            with open(self._persistence_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data:
                self._store.append(_StoredChunk(
                    chunk_id=item["chunk_id"],
                    doc_id=item["doc_id"],
                    content=item["content"],
                    embedding=item["embedding"],
                    metadata_dict=item["metadata_dict"],
                    chunk_index=item["chunk_index"],
                    total_chunks=item["total_chunks"],
                ))
        except Exception as e:
            logger.warning(f"Failed to load vector store: {e}")
