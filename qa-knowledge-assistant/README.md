# QA Knowledge Assistant — Multi-Agent LLM System

An intelligent QA knowledge assistant that consolidates fragmented product documentation into a centralized, queryable knowledge hub using a multi-agent LLM architecture.

## Overview

This system ingests documents from multiple sources (PDF, Excel, Markdown, and extensible to SharePoint, Confluence, ADO, and Email) and provides an AI-powered interface for QA testers to:

- **Ask questions** about product behavior, requirements, and architecture
- **Analyze requirements** for ambiguities, dependencies, and test coverage gaps
- **Generate test cases** including edge cases, boundary conditions, and negative scenarios
- **Validate knowledge** consistency across multiple documentation sources

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  QA Knowledge Assistant                   │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Ingestion│  │ Knowledge    │  │ Agent Orchestrator │  │
│  │ Pipeline │→ │ Store        │← │                   │  │
│  │          │  │ (ChromaDB +  │  │ • Doc Retrieval   │  │
│  │ PDF      │  │  SQLite)     │  │ • Req Analyzer    │  │
│  │ Excel    │  └──────────────┘  │ • Test Generator  │  │
│  │ Markdown │                    │ • Knowledge Valid. │  │
│  └──────────┘                    └───────────────────┘  │
│                                         ↑               │
│  ┌──────────────┐                  ┌────────────┐       │
│  │ LLM Gateway  │← ────────────── │ FastAPI     │       │
│  │ OpenAI/Azure │                  │ REST API    │       │
│  │ /Mock        │                  └────────────┘       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

## Agent Roles

| Agent | Purpose |
|-------|---------|
| **Document Retrieval** | Semantic search, metadata filtering, source attribution |
| **Requirement Analyzer** | Parse requirements, detect ambiguities, trace dependencies |
| **Test Case Generator** | Generate positive/negative/boundary/edge-case test scenarios |
| **Knowledge Validator** | Cross-reference sources, detect contradictions, confidence scoring |

## Quick Start

### Prerequisites
- Python 3.10+

### Setup

```bash
cd qa-knowledge-assistant

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
```

### Run the Demo

The demo ingests sample documentation (from the timesheet-app) and runs sample queries through all four agents — **no API key required** (uses mock LLM provider):

```bash
python main.py demo
```

### Start the API Server

```bash
python main.py serve
```

Then visit `http://localhost:8000/docs` for the interactive Swagger UI.

### Run Individual Queries

```bash
# Ingest sample docs first
python main.py ingest

# Then query
python main.py query "How does authentication work?"
python main.py query "Generate test cases for CSV export"
python main.py query "Analyze the client management requirements"
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/query` | Submit a query to the assistant |
| `POST` | `/api/ingest/text` | Ingest raw text content |
| `POST` | `/api/ingest/file` | Upload and ingest a file |
| `GET` | `/api/stats` | Knowledge base statistics |
| `GET` | `/api/agents` | List available agents |
| `GET` | `/api/documents` | List ingested documents |

### Query Example

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Generate test cases for the login feature",
    "project": "timesheet-app"
  }'
```

## Using with Real LLMs

Edit `.env` to switch from mock to a real LLM provider:

```env
# OpenAI
QA_LLM_PROVIDER=openai
QA_OPENAI_API_KEY=sk-your-key
QA_EMBEDDING_PROVIDER=openai

# Or Azure OpenAI
QA_LLM_PROVIDER=azure_openai
QA_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
QA_AZURE_OPENAI_API_KEY=your-key
QA_EMBEDDING_PROVIDER=azure_openai
```

## Running Tests

```bash
pytest tests/ -v
```

## Design Document

See [docs/DESIGN.md](docs/DESIGN.md) for the full architecture design, including:
- Detailed ingestion pipeline design
- Agent architecture and prompt engineering
- Knowledge store dual-storage approach
- Multi-agent orchestration patterns
- Security, evaluation metrics, and phased rollout plan

## Project Structure

```
qa-knowledge-assistant/
├── config/
│   ├── __init__.py
│   └── settings.py          # Pydantic settings from env vars
├── docs/
│   └── DESIGN.md            # Full architecture design document
├── sample_docs/              # Sample docs for demo (timesheet-app)
│   ├── requirements_spec.md
│   ├── api_documentation.md
│   ├── test_plan.md
│   └── known_bugs.md
├── src/
│   ├── agents/
│   │   ├── base.py               # BaseAgent contract
│   │   ├── document_retrieval.py  # Semantic search + RAG
│   │   ├── requirement_analyzer.py # Requirement analysis
│   │   ├── test_case_generator.py  # Test case generation
│   │   └── knowledge_validator.py  # Cross-reference validation
│   ├── api/
│   │   └── routes.py             # FastAPI REST endpoints
│   ├── ingestion/
│   │   ├── parsers.py            # PDF, Excel, Markdown parsers
│   │   └── pipeline.py           # Ingest → chunk → embed → store
│   ├── knowledge_store/
│   │   ├── vector_store.py       # ChromaDB wrapper
│   │   └── metadata_store.py     # SQLite metadata + lineage
│   ├── orchestrator/
│   │   └── orchestrator.py       # Query routing + multi-agent pipelines
│   ├── models.py                 # Shared Pydantic data models
│   └── llm_gateway.py           # LLM provider abstraction + mock
├── tests/
│   ├── test_ingestion.py         # Ingestion pipeline tests
│   └── test_agents.py           # Agent and orchestrator tests
├── main.py                       # CLI entry point (serve/ingest/query/demo)
├── requirements.txt
├── .env.example
└── README.md
```
