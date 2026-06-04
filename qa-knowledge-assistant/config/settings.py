"""
Application settings using Pydantic Settings.
Reads from environment variables and .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # LLM Configuration
    llm_provider: str = Field(
        default="mock",
        description="LLM provider: 'openai', 'azure_openai', or 'mock'"
    )
    openai_api_key: Optional[str] = Field(default=None)
    azure_openai_endpoint: Optional[str] = Field(default=None)
    azure_openai_api_key: Optional[str] = Field(default=None)
    azure_openai_deployment: str = Field(default="gpt-4o")

    # Embedding Configuration
    embedding_provider: str = Field(
        default="mock",
        description="Embedding provider: 'openai', 'local', or 'mock'"
    )
    embedding_model: str = Field(default="text-embedding-3-small")
    embedding_dimension: int = Field(default=384)

    # ChromaDB Configuration
    chroma_persist_dir: str = Field(default="./data/chroma")
    chroma_collection_name: str = Field(default="qa_knowledge")

    # SQLite Metadata Store
    metadata_db_path: str = Field(default="./data/metadata.db")

    # Chunking Configuration
    chunk_size: int = Field(default=512)
    chunk_overlap: int = Field(default=64)

    # Retrieval Configuration
    retrieval_top_k: int = Field(default=10)
    rerank_top_k: int = Field(default=5)

    # API Configuration
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)

    # Logging
    log_level: str = Field(default="INFO")

    model_config = {
        "env_file": ".env",
        "env_prefix": "QA_",
        "case_sensitive": False,
    }


settings = Settings()
