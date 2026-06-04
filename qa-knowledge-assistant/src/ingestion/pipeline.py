"""
Document ingestion pipeline.
Handles parsing, chunking, embedding, and storing documents.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

from config.settings import settings
from src.llm_gateway import llm_gateway
from src.models import DocumentChunk, DocumentMetadata
from src.knowledge_store.vector_store import VectorStore
from src.knowledge_store.metadata_store import MetadataStore

from .parsers import get_parser

logger = logging.getLogger(__name__)


class TextChunker:
    """Recursive text splitter with heading awareness."""

    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 64):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk(self, text: str) -> list[str]:
        """Split text into overlapping chunks, respecting paragraph boundaries."""
        if len(text) <= self.chunk_size:
            return [text]

        # Split on paragraph boundaries first
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) + 2 <= self.chunk_size:
                current_chunk = f"{current_chunk}\n\n{para}" if current_chunk else para
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    # Keep overlap from end of previous chunk
                    overlap_text = current_chunk[-self.chunk_overlap:] if len(current_chunk) > self.chunk_overlap else ""
                    current_chunk = f"{overlap_text}\n\n{para}" if overlap_text else para
                else:
                    # Single paragraph exceeds chunk size — split on sentences
                    sub_chunks = self._split_long_paragraph(para)
                    chunks.extend(sub_chunks[:-1])
                    current_chunk = sub_chunks[-1] if sub_chunks else ""

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    def _split_long_paragraph(self, text: str) -> list[str]:
        """Split a long paragraph on sentence boundaries."""
        sentences = []
        for delim in [". ", "! ", "? ", ".\n", "\n"]:
            if delim in text:
                parts = text.split(delim)
                return self._merge_parts(parts, delim)

        # Fall back to character-level splitting
        chunks = []
        for i in range(0, len(text), self.chunk_size - self.chunk_overlap):
            chunks.append(text[i:i + self.chunk_size])
        return chunks

    def _merge_parts(self, parts: list[str], delimiter: str) -> list[str]:
        """Merge sentence parts into chunks that fit the size limit."""
        chunks = []
        current = ""
        for part in parts:
            candidate = f"{current}{delimiter}{part}" if current else part
            if len(candidate) <= self.chunk_size:
                current = candidate
            else:
                if current:
                    chunks.append(current.strip())
                current = part
        if current.strip():
            chunks.append(current.strip())
        return chunks


class IngestionPipeline:
    """End-to-end document ingestion: parse → chunk → embed → store."""

    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        metadata_store: Optional[MetadataStore] = None,
    ):
        self.vector_store = vector_store or VectorStore()
        self.metadata_store = metadata_store or MetadataStore()
        self.chunker = TextChunker(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

    async def ingest_file(self, file_path: str, **kwargs) -> DocumentMetadata:
        """Ingest a single file into the knowledge store."""
        logger.info(f"Ingesting file: {file_path}")

        # 1. Parse
        parser = get_parser(file_path)
        content, metadata = parser.parse(file_path, **kwargs)
        logger.info(f"Parsed '{metadata.title}' ({len(content)} chars)")

        # 2. Chunk
        chunk_texts = self.chunker.chunk(content)
        logger.info(f"Split into {len(chunk_texts)} chunks")

        # 3. Create chunk objects
        chunks = [
            DocumentChunk(
                doc_id=metadata.doc_id,
                content=text,
                chunk_index=i,
                total_chunks=len(chunk_texts),
                metadata=metadata,
            )
            for i, text in enumerate(chunk_texts)
        ]

        # 4. Embed
        embeddings = await llm_gateway.embed_texts(chunk_texts)
        logger.info(f"Generated {len(embeddings)} embeddings")

        # 5. Store
        self.vector_store.add_chunks(chunks, embeddings)
        self.metadata_store.upsert_document(metadata, content, len(chunks))
        logger.info(f"Stored document '{metadata.title}' (doc_id={metadata.doc_id})")

        return metadata

    async def ingest_directory(self, dir_path: str, **kwargs) -> list[DocumentMetadata]:
        """Ingest all supported files from a directory."""
        results = []
        supported_exts = {".pdf", ".xlsx", ".xls", ".md", ".markdown", ".txt"}

        for root, dirs, files in os.walk(dir_path):
            for filename in sorted(files):
                ext = os.path.splitext(filename)[1].lower()
                if ext in supported_exts:
                    file_path = os.path.join(root, filename)
                    try:
                        metadata = await self.ingest_file(file_path, **kwargs)
                        results.append(metadata)
                    except Exception as e:
                        logger.error(f"Failed to ingest {file_path}: {e}")

        logger.info(f"Ingested {len(results)} files from {dir_path}")
        return results

    async def ingest_text(
        self,
        text: str,
        title: str,
        source_type: str = "markdown",
        **kwargs,
    ) -> DocumentMetadata:
        """Ingest raw text content directly."""
        from src.models import SourceType, DocType

        st = SourceType(source_type) if isinstance(source_type, str) else source_type
        metadata = DocumentMetadata(
            source_type=st,
            title=title,
            source_url=kwargs.get("source_url"),
            author=kwargs.get("author"),
            tags=kwargs.get("tags", []),
            project=kwargs.get("project", "default"),
            doc_type=kwargs.get("doc_type", DocType.GENERAL),
        )

        chunk_texts = self.chunker.chunk(text)
        chunks = [
            DocumentChunk(
                doc_id=metadata.doc_id,
                content=ct,
                chunk_index=i,
                total_chunks=len(chunk_texts),
                metadata=metadata,
            )
            for i, ct in enumerate(chunk_texts)
        ]

        embeddings = await llm_gateway.embed_texts(chunk_texts)
        self.vector_store.add_chunks(chunks, embeddings)
        self.metadata_store.upsert_document(metadata, text, len(chunks))

        return metadata

    def get_stats(self) -> dict:
        """Get ingestion statistics."""
        return {
            "vector_store_count": self.vector_store.count(),
            **self.metadata_store.get_stats(),
        }
