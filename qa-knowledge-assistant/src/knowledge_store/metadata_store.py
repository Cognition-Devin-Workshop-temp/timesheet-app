"""
SQLite-backed metadata store for document lineage, versioning, and structured queries.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
from datetime import datetime
from typing import Optional

from config.settings import settings
from src.models import DocumentMetadata, SourceType, DocType

logger = logging.getLogger(__name__)


class MetadataStore:
    """SQLite store for document metadata and lineage tracking."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.metadata_db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS documents (
                doc_id TEXT PRIMARY KEY,
                source_type TEXT NOT NULL,
                source_url TEXT,
                title TEXT NOT NULL,
                author TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                tags TEXT,
                project TEXT DEFAULT 'default',
                doc_type TEXT DEFAULT 'general',
                version INTEGER DEFAULT 1,
                raw_content TEXT,
                chunk_count INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ingestion_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                details TEXT,
                FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
            );

            CREATE TABLE IF NOT EXISTS query_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_id TEXT NOT NULL,
                query_text TEXT NOT NULL,
                intent TEXT,
                agent TEXT,
                response_summary TEXT,
                confidence REAL,
                timestamp TEXT NOT NULL,
                session_id TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_docs_project ON documents(project);
            CREATE INDEX IF NOT EXISTS idx_docs_source_type ON documents(source_type);
            CREATE INDEX IF NOT EXISTS idx_docs_doc_type ON documents(doc_type);
        """)
        self.conn.commit()

    def upsert_document(self, metadata: DocumentMetadata, raw_content: str = "", chunk_count: int = 0) -> None:
        """Insert or update a document's metadata."""
        self.conn.execute("""
            INSERT OR REPLACE INTO documents
            (doc_id, source_type, source_url, title, author, created_at, updated_at,
             tags, project, doc_type, version, raw_content, chunk_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            metadata.doc_id,
            metadata.source_type.value,
            metadata.source_url,
            metadata.title,
            metadata.author,
            metadata.created_at.isoformat(),
            metadata.updated_at.isoformat(),
            json.dumps(metadata.tags),
            metadata.project,
            metadata.doc_type.value,
            metadata.version,
            raw_content,
            chunk_count,
        ))
        self.conn.commit()

        self._log_ingestion(metadata.doc_id, "upsert", f"v{metadata.version}, {chunk_count} chunks")

    def get_document(self, doc_id: str) -> Optional[DocumentMetadata]:
        """Retrieve document metadata by ID."""
        row = self.conn.execute(
            "SELECT * FROM documents WHERE doc_id = ?", (doc_id,)
        ).fetchone()
        if not row:
            return None
        return self._row_to_metadata(row)

    def search_documents(
        self,
        project: Optional[str] = None,
        source_type: Optional[str] = None,
        doc_type: Optional[str] = None,
        tags: Optional[list[str]] = None,
    ) -> list[DocumentMetadata]:
        """Search documents by metadata filters."""
        query = "SELECT * FROM documents WHERE 1=1"
        params: list = []

        if project:
            query += " AND project = ?"
            params.append(project)
        if source_type:
            query += " AND source_type = ?"
            params.append(source_type)
        if doc_type:
            query += " AND doc_type = ?"
            params.append(doc_type)

        rows = self.conn.execute(query, params).fetchall()
        results = [self._row_to_metadata(row) for row in rows]

        if tags:
            results = [
                r for r in results
                if any(t in r.tags for t in tags)
            ]

        return results

    def log_query(
        self,
        query_id: str,
        query_text: str,
        intent: str,
        agent: str,
        response_summary: str,
        confidence: float,
        session_id: Optional[str] = None,
    ) -> None:
        """Log a query for analytics and feedback."""
        self.conn.execute("""
            INSERT INTO query_log
            (query_id, query_text, intent, agent, response_summary, confidence, timestamp, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            query_id, query_text, intent, agent,
            response_summary, confidence,
            datetime.utcnow().isoformat(), session_id,
        ))
        self.conn.commit()

    def get_stats(self) -> dict:
        """Get store statistics."""
        doc_count = self.conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
        query_count = self.conn.execute("SELECT COUNT(*) FROM query_log").fetchone()[0]
        source_breakdown = dict(self.conn.execute(
            "SELECT source_type, COUNT(*) FROM documents GROUP BY source_type"
        ).fetchall())
        return {
            "total_documents": doc_count,
            "total_queries": query_count,
            "source_breakdown": source_breakdown,
        }

    def _log_ingestion(self, doc_id: str, action: str, details: str = "") -> None:
        self.conn.execute("""
            INSERT INTO ingestion_log (doc_id, action, timestamp, details)
            VALUES (?, ?, ?, ?)
        """, (doc_id, action, datetime.utcnow().isoformat(), details))
        self.conn.commit()

    def _row_to_metadata(self, row: sqlite3.Row) -> DocumentMetadata:
        tags_raw = row["tags"]
        tags = json.loads(tags_raw) if tags_raw else []
        return DocumentMetadata(
            doc_id=row["doc_id"],
            source_type=SourceType(row["source_type"]),
            source_url=row["source_url"],
            title=row["title"],
            author=row["author"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            tags=tags,
            project=row["project"],
            doc_type=DocType(row["doc_type"]),
            version=row["version"],
        )

    def close(self) -> None:
        self.conn.close()
