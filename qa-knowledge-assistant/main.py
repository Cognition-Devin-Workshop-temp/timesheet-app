"""
QA Knowledge Assistant — Main entry point.

Usage:
    # Start the API server
    python main.py serve

    # Ingest sample documents
    python main.py ingest

    # Run an interactive query session
    python main.py query "How does authentication work?"

    # Run the full demo (ingest + sample queries)
    python main.py demo
"""

from __future__ import annotations

import asyncio
import logging
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("qa_assistant")


async def ingest_sample_docs():
    """Ingest the sample documentation into the knowledge base."""
    from src.ingestion.pipeline import IngestionPipeline

    pipeline = IngestionPipeline()
    sample_dir = os.path.join(os.path.dirname(__file__), "sample_docs")

    if not os.path.exists(sample_dir):
        logger.error(f"Sample docs directory not found: {sample_dir}")
        return

    logger.info(f"Ingesting sample documents from {sample_dir}")
    results = await pipeline.ingest_directory(sample_dir, project="timesheet-app")
    logger.info(f"Ingested {len(results)} documents")

    stats = pipeline.get_stats()
    logger.info(f"Knowledge base stats: {stats}")
    return results


async def run_query(query_text: str, validate: bool = False):
    """Run a single query through the orchestrator."""
    from src.orchestrator import AgentOrchestrator
    from src.models import AgentQuery

    orchestrator = AgentOrchestrator()
    query = AgentQuery(
        text=query_text,
        context={"validate": validate},
    )

    response = await orchestrator.process_query(query)

    print("\n" + "=" * 80)
    print(f"Query: {query_text}")
    print(f"Agent: {response.agent_name}")
    print(f"Confidence: {response.confidence:.0%}")
    print(f"Processing Time: {response.processing_time_ms:.0f}ms")
    print("=" * 80)
    print(response.answer)
    print("=" * 80)

    if response.sources:
        print(f"\nSources ({len(response.sources)}):")
        for s in response.sources:
            print(f"  - {s.source_attribution} (relevance: {s.relevance_score:.2f})")

    return response


async def run_demo():
    """Run a full demo: ingest sample docs, then run sample queries."""
    print("\n" + "=" * 80)
    print("  QA Knowledge Assistant — Demo")
    print("=" * 80)

    # Step 1: Ingest
    print("\n[1/5] Ingesting sample documentation...")
    await ingest_sample_docs()

    # Step 2: Factual lookup
    print("\n[2/5] Factual query: 'How does authentication work?'")
    await run_query("How does authentication work in the time tracking application?")

    # Step 3: Requirement analysis
    print("\n[3/5] Requirement analysis: 'Analyze the CSV export requirement'")
    await run_query("Analyze the requirements for the CSV export feature, identify any ambiguities")

    # Step 4: Test case generation
    print("\n[4/5] Test generation: 'Generate test cases for client management'")
    await run_query("Generate comprehensive test cases for the client management feature")

    # Step 5: Validation
    print("\n[5/5] Validation: 'Are there contradictions in the export feature docs?'")
    await run_query("Validate whether the export feature documentation is consistent across all sources")

    print("\n" + "=" * 80)
    print("  Demo complete!")
    print("=" * 80)


def serve():
    """Start the FastAPI server."""
    import uvicorn
    from src.api.routes import create_app

    app = create_app()
    logger.info(f"Starting QA Knowledge Assistant API on {settings.api_host}:{settings.api_port}")
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]

    if command == "serve":
        serve()
    elif command == "ingest":
        asyncio.run(ingest_sample_docs())
    elif command == "query":
        if len(sys.argv) < 3:
            print("Usage: python main.py query \"Your question here\"")
            sys.exit(1)
        query_text = " ".join(sys.argv[2:])
        validate = "--validate" in sys.argv
        asyncio.run(run_query(query_text, validate=validate))
    elif command == "demo":
        asyncio.run(run_demo())
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
