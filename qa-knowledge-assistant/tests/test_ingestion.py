"""
Tests for the document ingestion pipeline.
"""

import os
import sys
import tempfile
import pytest

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.models import SourceType, DocType
from src.ingestion.parsers import MarkdownParser, get_parser
from src.ingestion.pipeline import TextChunker, IngestionPipeline
from src.knowledge_store.vector_store import VectorStore
from src.knowledge_store.metadata_store import MetadataStore


class TestTextChunker:
    def test_short_text_no_split(self):
        chunker = TextChunker(chunk_size=100, chunk_overlap=10)
        text = "This is a short text."
        chunks = chunker.chunk(text)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_long_text_splits(self):
        chunker = TextChunker(chunk_size=50, chunk_overlap=10)
        text = "First paragraph about topic A.\n\nSecond paragraph about topic B.\n\nThird paragraph about topic C."
        chunks = chunker.chunk(text)
        assert len(chunks) > 1

    def test_preserves_content(self):
        chunker = TextChunker(chunk_size=100, chunk_overlap=0)
        text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
        chunks = chunker.chunk(text)
        for chunk in chunks:
            assert chunk.strip()  # No empty chunks


class TestMarkdownParser:
    def test_parse_markdown_file(self, tmp_path):
        md_file = tmp_path / "test.md"
        md_file.write_text("# Test Document\n\nThis is a test document about requirements.\n")

        parser = MarkdownParser()
        content, metadata = parser.parse(str(md_file))

        assert "Test Document" in content
        assert metadata.title == "Test Document"
        assert metadata.source_type == SourceType.MARKDOWN

    def test_detect_requirement_doc_type(self, tmp_path):
        md_file = tmp_path / "requirements_spec.md"
        md_file.write_text("# Requirements Specification\n\nThe system shall...")

        parser = MarkdownParser()
        content, metadata = parser.parse(str(md_file))
        assert metadata.doc_type == DocType.REQUIREMENT

    def test_detect_api_doc_type(self, tmp_path):
        md_file = tmp_path / "api_docs.md"
        md_file.write_text("# API Documentation\n\nGET /endpoint...")

        parser = MarkdownParser()
        content, metadata = parser.parse(str(md_file))
        assert metadata.doc_type == DocType.API_DOC


class TestParserRegistry:
    def test_get_markdown_parser(self):
        parser = get_parser("document.md")
        assert isinstance(parser, MarkdownParser)

    def test_get_unknown_parser_fallback(self):
        parser = get_parser("document.xyz")
        assert parser is not None  # Falls back to PlainTextParser


class TestMetadataStore:
    def test_upsert_and_retrieve(self, tmp_path):
        db_path = str(tmp_path / "test_meta.db")
        store = MetadataStore(db_path=db_path)

        from src.models import DocumentMetadata
        meta = DocumentMetadata(
            source_type=SourceType.MARKDOWN,
            title="Test Doc",
            project="test-project",
            tags=["test", "demo"],
        )

        store.upsert_document(meta, "test content", 3)
        retrieved = store.get_document(meta.doc_id)

        assert retrieved is not None
        assert retrieved.title == "Test Doc"
        assert retrieved.project == "test-project"
        assert "test" in retrieved.tags

        store.close()

    def test_search_by_project(self, tmp_path):
        db_path = str(tmp_path / "test_meta2.db")
        store = MetadataStore(db_path=db_path)

        from src.models import DocumentMetadata
        meta1 = DocumentMetadata(
            source_type=SourceType.MARKDOWN, title="Doc 1", project="proj-a"
        )
        meta2 = DocumentMetadata(
            source_type=SourceType.PDF, title="Doc 2", project="proj-b"
        )

        store.upsert_document(meta1)
        store.upsert_document(meta2)

        results = store.search_documents(project="proj-a")
        assert len(results) == 1
        assert results[0].title == "Doc 1"

        store.close()

    def test_stats(self, tmp_path):
        db_path = str(tmp_path / "test_meta3.db")
        store = MetadataStore(db_path=db_path)

        stats = store.get_stats()
        assert stats["total_documents"] == 0
        assert stats["total_queries"] == 0

        store.close()


class TestVectorStore:
    def test_add_and_search(self, tmp_path):
        store = VectorStore(
            persist_dir=str(tmp_path / "chroma"),
            collection_name="test_collection",
        )

        from src.models import DocumentChunk, DocumentMetadata
        meta = DocumentMetadata(
            source_type=SourceType.MARKDOWN,
            title="Test Doc",
        )
        chunks = [
            DocumentChunk(
                doc_id=meta.doc_id,
                content="Authentication uses JWT tokens",
                chunk_index=0,
                total_chunks=1,
                metadata=meta,
            )
        ]

        # Use simple embeddings for testing
        embeddings = [[0.1] * 384]

        store.add_chunks(chunks, embeddings)
        assert store.count() == 1

        # Search
        results = store.search([0.1] * 384, top_k=1)
        assert len(results) == 1
        assert "JWT" in results[0].chunk.content

    def test_count_empty(self, tmp_path):
        store = VectorStore(
            persist_dir=str(tmp_path / "chroma_empty"),
            collection_name="empty_collection",
        )
        assert store.count() == 0


@pytest.mark.asyncio
class TestIngestionPipeline:
    async def test_ingest_markdown_file(self, tmp_path):
        md_file = tmp_path / "test.md"
        md_file.write_text(
            "# Test Requirement\n\n"
            "The system shall support email-based authentication.\n"
            "Users must provide a valid email address to log in.\n"
        )

        pipeline = IngestionPipeline(
            vector_store=VectorStore(
                persist_dir=str(tmp_path / "chroma"),
                collection_name="test_ingest",
            ),
            metadata_store=MetadataStore(db_path=str(tmp_path / "meta.db")),
        )

        metadata = await pipeline.ingest_file(str(md_file), project="test")
        assert metadata.title == "Test Requirement"
        assert metadata.project == "test"

        stats = pipeline.get_stats()
        assert stats["vector_store_count"] > 0
        assert stats["total_documents"] == 1

    async def test_ingest_text(self, tmp_path):
        pipeline = IngestionPipeline(
            vector_store=VectorStore(
                persist_dir=str(tmp_path / "chroma2"),
                collection_name="test_text",
            ),
            metadata_store=MetadataStore(db_path=str(tmp_path / "meta2.db")),
        )

        metadata = await pipeline.ingest_text(
            text="The API uses JWT tokens for authentication. Tokens expire after 24 hours.",
            title="Auth Docs",
            project="test",
        )

        assert metadata.title == "Auth Docs"
        assert pipeline.get_stats()["vector_store_count"] > 0
