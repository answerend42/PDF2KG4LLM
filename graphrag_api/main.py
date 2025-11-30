"""
Simple GraphRAG HTTP API server.

This wraps the Graphrag indexing and query APIs behind a FastAPI service
that matches the endpoints used by the existing `graphrag-visualizer`
frontend:

  - GET  /status
  - GET  /search/local?query=...
  - GET  /search/global?query=...
  - POST /index/build

Configuration is driven by environment variables:

  GRAPHRAG_ROOT      - project root directory containing settings.yaml
                       (default: current working directory)
  GRAPHRAG_CONFIG    - optional explicit config file path
  GRAPHRAG_DATA_DIR  - optional override for output.base_dir in config

Run with:

  uvicorn graphrag-api.main:app --reload --port 8000
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Try importing graphrag as an installed package first.
# If that fails (e.g. Python 3.13 where pip install is blocked),
# fall back to using the local source tree under ../graphrag.
try:
    from graphrag.api import build_index, global_search, local_search  # type: ignore
    from graphrag.config.enums import IndexingMethod  # type: ignore
    from graphrag.config.load_config import load_config  # type: ignore
    from graphrag.config.models.graph_rag_config import GraphRagConfig  # type: ignore
    from graphrag.utils.api import (  # type: ignore
        create_storage_from_config,
        reformat_context_data,
    )
    from graphrag.utils.storage import (  # type: ignore
        load_table_from_storage,
        storage_has_table,
    )
except ModuleNotFoundError:
    # Add the local graphrag repo to sys.path and try again.
    repo_root = Path(__file__).resolve().parents[1] / "graphrag"
    sys.path.insert(0, str(repo_root))

    from graphrag.api import build_index, global_search, local_search  # type: ignore
    from graphrag.config.enums import IndexingMethod  # type: ignore
    from graphrag.config.load_config import load_config  # type: ignore
    from graphrag.config.models.graph_rag_config import GraphRagConfig  # type: ignore
    from graphrag.utils.api import (  # type: ignore
        create_storage_from_config,
        reformat_context_data,
    )
    from graphrag.utils.storage import (  # type: ignore
        load_table_from_storage,
        storage_has_table,
    )

app = FastAPI(title="GraphRAG API", version="0.1.0")

# Allow calls from the React dev server by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_root_dir() -> Path:
    """Resolve GraphRAG project root directory."""
    root = os.getenv("GRAPHRAG_ROOT", ".")
    return Path(root).resolve()


def _get_config_path() -> Optional[Path]:
    """Resolve explicit config file path if provided."""
    cfg = os.getenv("GRAPHRAG_CONFIG")
    return Path(cfg).resolve() if cfg else None


async def _load_graphrag_config() -> GraphRagConfig:
    """Load GraphRAG configuration using the same logic as the CLI."""
    root = _get_root_dir()
    if not root.is_dir():
        raise HTTPException(status_code=500, detail=f"Invalid GRAPHRAG_ROOT: {root}")

    overrides: Dict[str, Any] = {}
    data_dir = os.getenv("GRAPHRAG_DATA_DIR")
    if data_dir:
        overrides["output.base_dir"] = data_dir

    # load_config already searches for settings.yaml if config path is None
    return load_config(root_dir=root, config_filepath=_get_config_path(), cli_overrides=overrides or None)


async def _load_single_index_tables(
    config: GraphRagConfig,
    *,
    include_text_units: bool = True,
    include_relationships: bool = True,
    include_covariates: bool = True,
) -> Dict[str, Any]:
    """
    Load parquet tables from the configured output storage.

    This mirrors the single-index branch of `graphrag.cli.query._resolve_output_files`.
    """
    storage = create_storage_from_config(config.output)

    tables: Dict[str, Any] = {}

    # Always needed for GraphRAG queries
    tables["entities"] = await load_table_from_storage("entities", storage)
    tables["communities"] = await load_table_from_storage("communities", storage)
    tables["community_reports"] = await load_table_from_storage("community_reports", storage)

    if include_text_units:
        tables["text_units"] = await load_table_from_storage("text_units", storage)
    if include_relationships:
        tables["relationships"] = await load_table_from_storage("relationships", storage)

    if include_covariates:
        if await storage_has_table("covariates", storage):
            tables["covariates"] = await load_table_from_storage("covariates", storage)
        else:
            tables["covariates"] = None

    return tables


def _format_search_result(
    response: Any,
    context_data: Any,
    *,
    started_at: float,
) -> Dict[str, Any]:
    """
    Convert GraphRAG search output into the `SearchResult` shape expected by
    `graphrag-visualizer` (see src/app/models/search-result.ts).
    """
    # Convert context_data (dict of DataFrames) into dict of lists
    context_json = reformat_context_data(context_data) if isinstance(context_data, dict) else context_data

    elapsed_ms = int((time.perf_counter() - started_at) * 1000)

    # We don't currently hook into Graphrag's internal telemetry here,
    # so llm_calls / prompt_tokens are best-effort placeholders.
    return {
        "response": str(response),
        "context_data": context_json,
        "context_text": "",
        "completion_time": elapsed_ms,
        "llm_calls": 0,
        "prompt_tokens": 0,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/status")
async def status() -> Dict[str, str]:
    """Health check endpoint used by the visualizer."""
    return {"status": "Server is up and running"}


@app.get("/search/local")
async def search_local(
    query: str = Query(..., min_length=1, description="User query for local search."),
    community_level: int = Query(
        2,
        description=(
            "Leiden hierarchy level used for local search. "
            "Higher values represent smaller communities."
        ),
    ),
    response_type: str = Query(
        "Multiple Paragraphs",
        description="Free-form description of the desired response format.",
    ),
) -> Dict[str, Any]:
    """
    Run a GraphRAG local search over the indexed graph.

    Requires that a GraphRAG index has already been built for the configured
    project root.
    """
    started_at = time.perf_counter()
    config = await _load_graphrag_config()

    try:
        tables = await _load_single_index_tables(
            config,
            include_text_units=True,
            include_relationships=True,
            include_covariates=True,
        )
    except Exception as exc:  # pragma: no cover - surfaced as HTTP error
        raise HTTPException(status_code=500, detail=f"Failed to load index tables: {exc}") from exc

    response, context = await local_search(
        config=config,
        entities=tables["entities"],
        communities=tables["communities"],
        community_reports=tables["community_reports"],
        text_units=tables.get("text_units"),
        relationships=tables.get("relationships"),
        covariates=tables.get("covariates"),
        community_level=community_level,
        response_type=response_type,
        query=query,
    )

    return _format_search_result(response, context, started_at=started_at)


@app.get("/search/global")
async def search_global(
    query: str = Query(..., min_length=1, description="User query for global search."),
    community_level: int = Query(
        2,
        description=(
            "Leiden hierarchy level from which to load community reports. "
            "Higher values represent smaller communities."
        ),
    ),
    dynamic_community_selection: bool = Query(
        False,
        description="Enable dynamic community selection instead of using all reports at a fixed level.",
    ),
    response_type: str = Query(
        "Multiple Paragraphs",
        description="Free-form description of the desired response format.",
    ),
) -> Dict[str, Any]:
    """
    Run a GraphRAG global search over the indexed graph.
    """
    started_at = time.perf_counter()
    config = await _load_graphrag_config()

    try:
        tables = await _load_single_index_tables(
            config,
            include_text_units=False,
            include_relationships=False,
            include_covariates=False,
        )
    except Exception as exc:  # pragma: no cover - surfaced as HTTP error
        raise HTTPException(status_code=500, detail=f"Failed to load index tables: {exc}") from exc

    response, context = await global_search(
        config=config,
        entities=tables["entities"],
        communities=tables["communities"],
        community_reports=tables["community_reports"],
        community_level=community_level,
        dynamic_community_selection=dynamic_community_selection,
        response_type=response_type,
        query=query,
    )

    return _format_search_result(response, context, started_at=started_at)


@app.post("/index/build")
async def index_build(
    method: str = "standard",
    verbose: bool = False,
) -> Dict[str, Any]:
    """
    Trigger a GraphRAG indexing run for the configured project.

    This assumes that `settings.yaml` and the input documents are already
    prepared under `GRAPHRAG_ROOT` (same layout as the GraphRAG CLI quickstart).
    """
    started_at = time.perf_counter()
    config = await _load_graphrag_config()

    # Normalise method argument to an IndexingMethod value if possible
    try:
        indexing_method = IndexingMethod(method)
    except ValueError:
        indexing_method = IndexingMethod.Standard

    try:
        results = await build_index(
            config=config,
            method=indexing_method,
            verbose=verbose,
        )
    except Exception as exc:  # pragma: no cover - surfaced as HTTP error
        raise HTTPException(status_code=500, detail=f"Indexing failed: {exc}") from exc

    elapsed_ms = int((time.perf_counter() - started_at) * 1000)

    return {
        "status": "ok",
        "workflows": [r.workflow for r in results],
        "completion_time": elapsed_ms,
    }


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
