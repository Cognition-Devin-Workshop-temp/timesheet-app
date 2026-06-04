# QA Knowledge Assistant — Multi-Agent LLM System Design

## 1. Executive Summary

The **QA Knowledge Assistant** is a multi-agent LLM system that consolidates fragmented product documentation — scattered across SharePoint, Confluence, PDFs, Excel sheets, Azure DevOps (ADO) work items, and emails — into a centralized, queryable knowledge hub. It answers tester queries with accurate, contextual responses, assists in test scenario creation, identifies edge cases, and reduces SME dependency.

---

## 2. Problem Statement

| Pain Point | Impact |
|---|---|
| Documentation scattered across 6+ platforms | Testers spend 30-40% of time searching for information |
| Tribal knowledge locked in SME heads | Single points of failure; slow onboarding |
| Requirement ambiguity | Missed edge cases, low test coverage |
| Inconsistent test design | Duplicate test cases, gaps in regression suites |
| Manual cross-referencing | Slow validation of test logic against requirements |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        QA KNOWLEDGE ASSISTANT                       │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │  Ingestion    │   │  Knowledge   │   │   Agent Orchestrator │    │
│  │  Pipeline     │──▶│  Store       │◀──│                      │    │
│  │              │   │  (Vector DB  │   │  ┌────────────────┐  │    │
│  │  ┌─────────┐ │   │  + Metadata) │   │  │ Doc Retrieval  │  │    │
│  │  │SharePt  │ │   │              │   │  │ Agent          │  │    │
│  │  │Confluence│ │   └──────────────┘   │  ├────────────────┤  │    │
│  │  │PDF/Excel │ │                      │  │ Requirement    │  │    │
│  │  │ADO Items │ │   ┌──────────────┐   │  │ Analyzer Agent │  │    │
│  │  │Emails   │ │   │  LLM Gateway │   │  ├────────────────┤  │    │
│  │  └─────────┘ │   │  (OpenAI /   │◀──│  │ Test Case      │  │    │
│  └──────────────┘   │  Azure /     │   │  │ Generator Agent│  │    │
│                     │  Local)      │   │  ├────────────────┤  │    │
│                     └──────────────┘   │  │ Knowledge      │  │    │
│                                        │  │ Validator Agent│  │    │
│  ┌──────────────┐                      │  └────────────────┘  │    │
│  │  API Layer   │◀─────────────────────│                      │    │
│  │  (FastAPI)   │                      └──────────────────────┘    │
│  └──────────────┘                                                   │
│         ▲                                                           │
│         │                                                           │
│  ┌──────────────┐                                                   │
│  │  Web UI /    │                                                   │
│  │  CLI / Chat  │                                                   │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.1 Component Overview

| Component | Technology | Purpose |
|---|---|---|
| Ingestion Pipeline | Python (extractors per source) | Parse, chunk, embed documents from all sources |
| Knowledge Store | ChromaDB + SQLite metadata | Vector similarity search + structured metadata queries |
| Agent Orchestrator | Custom Python framework | Route queries to agents, manage agent collaboration |
| LLM Gateway | OpenAI / Azure OpenAI / Ollama | Centralized LLM access with fallback and rate limiting |
| API Layer | FastAPI | REST endpoints for querying, ingestion triggers, health |
| Web Interface | Streamlit / React (future) | Chat-based UI for tester interaction |

---

## 4. Document Ingestion Pipeline

### 4.1 Source Connectors

```
Source             Connector             Auth Method
─────────         ─────────             ───────────
SharePoint     →  Microsoft Graph API   →  OAuth2 / App Registration
Confluence     →  Atlassian REST API    →  API Token
PDFs           →  PyPDF2 / pdfplumber   →  File system / S3
Excel          →  openpyxl / pandas     →  File system / S3
ADO Work Items →  Azure DevOps REST API →  PAT / OAuth2
Emails         →  Microsoft Graph API   →  OAuth2 (Exchange Online)
                  / IMAP                   / App Password
```

### 4.2 Processing Pipeline

```
Raw Document
    │
    ▼
┌──────────────┐
│ 1. Extract   │  Pull raw text, tables, images, metadata
│    Content   │  (title, author, date, source URL, tags)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 2. Clean &   │  Remove boilerplate, normalize whitespace,
│    Normalize │  fix encoding, extract structured data
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 3. Chunk     │  Recursive text splitting with overlap
│              │  Chunk size: 512-1024 tokens
│              │  Overlap: 64-128 tokens
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 4. Embed     │  Generate vector embeddings
│              │  Model: text-embedding-3-small (or local)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 5. Store     │  Insert into ChromaDB (vectors)
│              │  + SQLite (metadata, lineage, version)
└──────────────┘
```

### 4.3 Chunking Strategy

| Document Type | Strategy | Rationale |
|---|---|---|
| Requirements (Confluence/ADO) | Section-based splitting | Preserve requirement boundaries |
| Test Plans (Excel) | Row-based or sheet-based | Each row = one test case |
| API Docs (PDF/Markdown) | Heading-aware recursive split | Maintain endpoint context |
| Email threads | Per-message splitting | Preserve conversation context |
| Meeting notes | Paragraph-based | Topic-level granularity |

### 4.4 Metadata Schema

```json
{
  "doc_id": "uuid",
  "source_type": "confluence | sharepoint | pdf | excel | ado | email",
  "source_url": "https://...",
  "title": "Login Feature Requirements",
  "author": "jane.doe@company.com",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-06-01T14:20:00Z",
  "tags": ["auth", "login", "security"],
  "project": "timesheet-app",
  "doc_type": "requirement | test_plan | bug_report | design_doc | email",
  "version": 3,
  "chunk_index": 2,
  "total_chunks": 8,
  "parent_doc_id": "uuid (for threaded emails)",
  "related_ado_ids": ["AB#1234", "AB#5678"]
}
```

---

## 5. Agent Architecture

### 5.1 Agent Design Principles

Each agent follows a common contract:

```python
class BaseAgent:
    name: str               # Unique identifier
    description: str        # What this agent does (used by orchestrator)
    capabilities: list[str] # Queryable capabilities
    
    async def process(self, query: AgentQuery) -> AgentResponse:
        """Process a query and return structured response."""
    
    async def can_handle(self, query: AgentQuery) -> float:
        """Return confidence score 0.0-1.0 for handling this query."""
```

### 5.2 Document Retrieval Agent

**Role**: Find and return the most relevant documents/chunks for a given query.

**Capabilities**:
- Semantic search across all ingested documents
- Metadata-filtered retrieval (by source, date, project, author)
- Re-ranking results using cross-encoder models
- Summarizing retrieved context for downstream agents

**Workflow**:
```
Query → Parse intent & extract filters
      → Vector similarity search (top-k=20)
      → Metadata filter (source, date, project)
      → Cross-encoder re-rank (top-k=5)
      → Return ranked chunks with source attribution
```

**Key Features**:
- Hybrid search: combines vector similarity with keyword (BM25) matching
- Source attribution: every response links back to the original document
- Confidence scoring: each result tagged with relevance confidence
- Deduplication: merges overlapping chunks from the same document

### 5.3 Requirement Analyzer Agent

**Role**: Interpret requirements, identify dependencies, trace workflows, and surface ambiguities.

**Capabilities**:
- Parse natural-language requirements into structured format
- Identify requirement dependencies and conflicts
- Detect ambiguous or incomplete requirements
- Map requirements to existing test coverage
- Generate requirement traceability matrices

**Workflow**:
```
Query about requirements
      → Retrieve relevant requirement docs (via Doc Retrieval Agent)
      → Parse into structured requirement objects
      → Analyze dependencies (references to other requirements/ADO items)
      → Check for ambiguity signals (vague terms, missing acceptance criteria)
      → Return structured analysis with recommendations
```

**Output Format**:
```json
{
  "requirement_id": "REQ-042",
  "summary": "Users must be able to export timesheet data as CSV",
  "preconditions": ["User must be authenticated", "Client must have work entries"],
  "dependencies": ["REQ-010 (Auth)", "REQ-035 (Work Entries)"],
  "acceptance_criteria": ["CSV contains all fields", "Date range filter works"],
  "ambiguities": [
    {
      "text": "all fields",
      "concern": "Does 'all fields' include internal IDs or just display fields?",
      "suggestion": "Clarify with PO which fields are included in export"
    }
  ],
  "test_coverage": {
    "covered": ["TC-120", "TC-121"],
    "gaps": ["No test for empty work entries export", "No test for special characters in client names"]
  }
}
```

### 5.4 Test Case Generator Agent

**Role**: Generate test scenarios, edge cases, and validation logic from requirements and documentation.

**Capabilities**:
- Generate positive, negative, and boundary test cases
- Identify edge cases from requirement analysis
- Create data-driven test scenarios
- Suggest test data and expected results
- Generate BDD-style (Given/When/Then) scenarios

**Workflow**:
```
Requirement or feature description
      → Analyze requirement (via Requirement Analyzer Agent)
      → Retrieve historical test patterns (via Doc Retrieval Agent)
      → Generate test cases:
         ├── Happy path scenarios
         ├── Negative scenarios (invalid inputs, unauthorized access)
         ├── Boundary conditions (min/max values, empty states)
         ├── Edge cases (concurrent access, special characters, large data)
         └── Integration scenarios (cross-feature interactions)
      → Format as structured test cases
      → Validate against existing test suite (avoid duplicates)
      → Return with priority and effort estimates
```

**Output Format**:
```json
{
  "feature": "CSV Export",
  "test_cases": [
    {
      "id": "TC-GEN-001",
      "title": "Export CSV with valid date range",
      "type": "positive",
      "priority": "high",
      "preconditions": ["User logged in", "Client has 5+ work entries"],
      "steps": [
        "Navigate to Reports page",
        "Select client 'Acme Corp'",
        "Click 'Export CSV'",
        "Verify downloaded file"
      ],
      "expected_result": "CSV file downloaded with correct headers and all work entries",
      "test_data": {
        "client": "Acme Corp",
        "entries": 5,
        "date_range": "2025-01-01 to 2025-06-30"
      },
      "edge_case_rationale": null
    },
    {
      "id": "TC-GEN-002",
      "title": "Export CSV for client with zero entries",
      "type": "boundary",
      "priority": "medium",
      "edge_case_rationale": "Empty state — should handle gracefully",
      "expected_result": "CSV file with headers only, or appropriate message"
    }
  ]
}
```

### 5.5 Knowledge Validator Agent

**Role**: Verify accuracy, detect contradictions, and ensure knowledge consistency.

**Capabilities**:
- Cross-reference answers against multiple source documents
- Detect contradictions between documents (e.g., old spec vs new spec)
- Verify that generated test cases are consistent with requirements
- Flag outdated documentation
- Compute confidence scores for answers

**Workflow**:
```
Generated answer or test cases
      → Retrieve supporting documents (via Doc Retrieval Agent)
      → Cross-reference claims against source docs
      → Check for contradictions:
         ├── Same topic, different versions → flag staleness
         ├── Conflicting statements → highlight both sources
         └── Missing source → reduce confidence
      → Validate test case logic against requirements
      → Return validation report with confidence score
```

**Output Format**:
```json
{
  "validation_status": "validated_with_warnings",
  "confidence": 0.85,
  "validations": [
    {
      "claim": "CSV export includes date, client, hours, description",
      "status": "confirmed",
      "sources": ["confluence://specs/export-feature", "ado://AB#1234"],
      "confidence": 0.95
    },
    {
      "claim": "Export supports date range filtering",
      "status": "warning",
      "detail": "Spec says date range filter, but ADO item AB#1234 says 'all entries'. Possible stale spec.",
      "sources": ["confluence://specs/export-feature (v2)", "ado://AB#1234"],
      "confidence": 0.60
    }
  ],
  "contradictions": [
    {
      "topic": "Export scope",
      "source_a": "Confluence spec v2 (2024-08) — date range filter",
      "source_b": "ADO AB#1234 (2025-01) — all entries",
      "recommendation": "Verify with PO which behavior is current"
    }
  ]
}
```

---

## 6. Orchestrator Design

### 6.1 Query Routing

The orchestrator receives user queries and routes them to the appropriate agent(s):

```
User Query
    │
    ▼
┌──────────────────────┐
│  Intent Classifier    │  Uses LLM to classify query type:
│                      │  - factual_lookup → Doc Retrieval
│                      │  - requirement_analysis → Requirement Analyzer
│                      │  - test_generation → Test Case Generator
│                      │  - validation → Knowledge Validator
│                      │  - composite → Multi-agent pipeline
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Agent Router        │  Routes to single agent or builds
│                      │  multi-agent pipeline
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Response Assembler  │  Combines agent outputs into
│                      │  coherent user response
└──────────────────────┘
```

### 6.2 Multi-Agent Collaboration

For complex queries, agents collaborate in pipelines:

**Example: "Generate test cases for the login feature"**

```
1. Doc Retrieval Agent      → finds login-related docs (specs, existing tests, bugs)
2. Requirement Analyzer     → parses login requirements, finds dependencies
3. Test Case Generator      → generates test cases using requirement analysis
4. Knowledge Validator      → validates generated tests against docs, flags gaps
```

### 6.3 Context Management

```python
@dataclass
class ConversationContext:
    session_id: str
    history: list[Message]         # Full conversation history
    active_documents: list[str]    # Currently referenced doc IDs
    active_project: str            # Current project context
    user_role: str                 # tester | lead | manager
    accumulated_knowledge: dict    # Facts established in this session
```

---

## 7. Knowledge Store Design

### 7.1 Dual Storage Architecture

```
┌─────────────────────────────┐
│      Knowledge Store        │
│                             │
│  ┌───────────┐  ┌────────┐ │
│  │ ChromaDB  │  │ SQLite │ │
│  │ (Vectors) │  │ (Meta) │ │
│  │           │  │        │ │
│  │ Embeddings│  │ Docs   │ │
│  │ Chunks    │  │ Sources│ │
│  │ Similarity│  │ Tags   │ │
│  │ Search    │  │ Links  │ │
│  │           │  │ History│ │
│  └───────────┘  └────────┘ │
└─────────────────────────────┘
```

- **ChromaDB**: Stores vector embeddings for semantic search
- **SQLite**: Stores document metadata, source lineage, version history, inter-document links

### 7.2 Search Strategy

1. **Semantic search**: Query embedding → cosine similarity in ChromaDB
2. **Keyword search**: BM25 over raw text for exact matches
3. **Hybrid fusion**: Reciprocal Rank Fusion (RRF) to combine results
4. **Metadata filtering**: Pre/post filter by source, date, project, tags

---

## 8. LLM Integration

### 8.1 Model Configuration

| Use Case | Recommended Model | Fallback |
|---|---|---|
| Intent classification | gpt-4o-mini | Local classifier |
| Document analysis | gpt-4o | gpt-4o-mini |
| Test case generation | gpt-4o | gpt-4o-mini |
| Embeddings | text-embedding-3-small | all-MiniLM-L6-v2 (local) |
| Re-ranking | cross-encoder/ms-marco | LLM-based re-rank |

### 8.2 Prompt Engineering

Each agent has carefully designed system prompts:

- **Doc Retrieval**: Focuses on query decomposition and search strategy
- **Requirement Analyzer**: Trained to identify ambiguity signals and dependency patterns
- **Test Case Generator**: Uses few-shot examples of well-structured test cases
- **Knowledge Validator**: Instructed to be skeptical, cross-reference everything

### 8.3 Cost & Latency Optimization

- **Caching**: LRU cache for repeated queries (TTL: 1 hour)
- **Tiered models**: Use cheaper models for classification, expensive models for generation
- **Streaming**: Stream responses for better UX
- **Batch embeddings**: Process documents in batches during ingestion

---

## 9. Security & Access Control

| Concern | Mitigation |
|---|---|
| Data classification | Respect source document access controls |
| PII in documents | Regex + NER-based PII detection during ingestion |
| LLM data leakage | Use Azure OpenAI (data stays in tenant) |
| Prompt injection | Input sanitization + output validation |
| Audit trail | Log all queries, responses, and source attributions |
| RBAC | Role-based access: tester, lead, admin |

---

## 10. Evaluation & Metrics

### 10.1 Quality Metrics

| Metric | Target | Measurement |
|---|---|---|
| Answer accuracy | >90% | Human evaluation on sample queries |
| Retrieval precision@5 | >85% | Relevant docs in top 5 results |
| Test case coverage | >80% | Generated cases vs expert baseline |
| Contradiction detection | >75% | Correctly flagged inconsistencies |
| Response latency | <5s (p95) | End-to-end response time |
| User satisfaction | >4.0/5.0 | Post-query feedback |

### 10.2 Continuous Improvement

- **Feedback loop**: Users rate responses → fine-tune retrieval and prompts
- **A/B testing**: Compare agent configurations
- **Drift detection**: Monitor embedding quality over time
- **Knowledge freshness**: Alert when source docs are updated but embeddings are stale

---

## 11. Phased Rollout

### Phase 1 — Foundation (Weeks 1-4)
- [x] Document ingestion pipeline (PDF, Excel, Markdown)
- [x] ChromaDB vector store setup
- [x] Document Retrieval Agent (basic RAG)
- [x] CLI query interface
- [x] Basic API layer

### Phase 2 — Intelligence (Weeks 5-8)
- [ ] Requirement Analyzer Agent
- [ ] Test Case Generator Agent
- [ ] Multi-agent orchestration
- [ ] Conversation context management
- [ ] Web UI (Streamlit)

### Phase 3 — Validation & Scale (Weeks 9-12)
- [ ] Knowledge Validator Agent
- [ ] Connector expansion (SharePoint, Confluence, ADO, Email)
- [ ] Cross-encoder re-ranking
- [ ] RBAC and audit logging
- [ ] Feedback collection system

### Phase 4 — Production (Weeks 13-16)
- [ ] Azure OpenAI integration
- [ ] CI/CD pipeline for model/prompt updates
- [ ] Dashboard and analytics
- [ ] Performance optimization
- [ ] User training and documentation

---

## 12. Technology Stack Summary

```
Layer              Technology              Purpose
─────              ──────────              ───────
Language           Python 3.11+            Core implementation
LLM Framework     LangChain               Agent orchestration, prompt management
Vector Store       ChromaDB                Embedding storage and similarity search
Metadata Store     SQLite                  Document metadata, lineage, versioning
API Framework      FastAPI                 REST API endpoints
Embeddings         OpenAI / Sentence-XFMR  Text-to-vector conversion
PDF Parsing        PyPDF2                  PDF content extraction
Excel Parsing      openpyxl                Spreadsheet content extraction
HTTP Client        httpx                   Async API calls to connectors
Testing            pytest + pytest-asyncio Unit and integration tests
Config             Pydantic Settings       Type-safe configuration management
Logging            Python logging          Structured logging
```
