from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
from pathlib import Path
import pandas as pd
import subprocess
import yaml

from graphrag.config.load_config import load_config
from graphrag.language_model.providers.litellm.chat_model import LitellmChatModel
from graphrag.cli import query as gr_query
app = Flask(__name__)
CORS(app)


# Configuration
BASE_DIR = Path(__file__).parent.parent.parent
DEFAULT_RAGTEST_PATH = BASE_DIR / "graphrag" / "ragtest"
PROJECT_CONFIG_PATH = Path(__file__).parent / "project_root.yaml"

graph_data = None


def get_ragtest_path() -> str:
    """Get current project root (data root) directory."""
    root = DEFAULT_RAGTEST_PATH
    try:
        if PROJECT_CONFIG_PATH.exists():
            with open(PROJECT_CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f) or {}
            configured = cfg.get("project_root")
            if configured:
                p = Path(configured)
                if not p.is_absolute():
                    p = (BASE_DIR / p).resolve()
                root = p
    except Exception as e:
        print(f"Warning: failed to read project_root config: {e}")
    return str(root)


def run_graphrag_cli_query(method: str, question: str) -> tuple[bool, str]:
    """Run GraphRAG CLI query (local/global/basic/drift).

    Returns (success, message). On success, message is the model's answer text.
    On failure, message contains a human-readable error description (truncated stderr/stdout).
    """
    try:
        root = get_ragtest_path()
        cmd = [
            "python",
            "-m",
            "graphrag",
            "query",
            "--method",
            method,
            "--query",
            question,
            "--root",
            root,
        ]
        print(f"Running GraphRAG CLI query: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
        )

        stdout = (result.stdout or "").strip()
        stderr = (result.stderr or "").strip()

        if result.returncode == 0 and stdout:
            # Successful query, return the raw model output.
            return True, stdout

        # Build an error message surfaced to the chat UI.
        err_lines: list[str] = []
        err_lines.append(f"GraphRAG {method} 查询失败。")
        err_lines.append(f"退出码：{result.returncode}")
        if stderr:
            lines = stderr.splitlines()
            if len(lines) > 40:
                lines = ["[stderr 最后 40 行]"] + lines[-40:]
            err_lines.append("\n".join(lines))
        elif stdout:
            lines = stdout.splitlines()
            if len(lines) > 40:
                lines = ["[stdout 最后 40 行]"] + lines[-40:]
            err_lines.append("\n".join(lines))
        else:
            err_lines.append("没有可用的错误输出。")

        error_text = "\n\n".join(err_lines)
        print(error_text)
        return False, error_text
    except Exception as e:
        msg = f"GraphRAG {method} 查询执行异常：{e}"
        print(msg)
        return False, msg


def _serialize_context_data(context_data):
    """Convert GraphRAG context_data (which may contain DataFrames) into JSON-serializable dict.

    We mostly expect a dict[str, DataFrame | list[DataFrame] | list[dict] | primitive].
    This helper flattens DataFrames into list-of-records so that Flask's jsonify can handle it.
    """
    if not context_data:
        return {}

    from pandas import DataFrame
    import numpy as np

    def _to_serializable_value(value):
        # DataFrame -> list of records
        if isinstance(value, DataFrame):
            return value.to_dict(orient="records")

        # List / tuple: flatten nested DataFrames if present
        if isinstance(value, (list, tuple)):
            out = []
            for item in value:
                if isinstance(item, DataFrame):
                    out.extend(item.to_dict(orient="records"))
                else:
                    out.append(_to_serializable_value(item))
            return out

        # NumPy scalars -> Python scalars
        if isinstance(value, (np.generic,)):
            return value.item()

        # Anything else that isn't JSON-serializable will be stringified later by Flask if needed
        return value

    result = {}
    for key, value in (context_data or {}).items():
        try:
            if value is None:
                continue
            result[str(key)] = _to_serializable_value(value)
        except Exception as e:
            print(f"Warning: failed to serialize context_data key '{key}': {e}")
    return result


def _load_config_with_overrides(root: Path, overrides: dict | None = None):
    """Helper to load GraphRAG config with optional overrides (e.g. model switching)."""
    cli_overrides = overrides or {}
    return load_config(root, None, cli_overrides)

def get_config_paths():
    """Resolve input, output, and cache directories based on settings.yaml"""
    input_base_dir = "input"
    output_base_dir = "output"
    cache_base_dir = "cache"

    ragtest_path = get_ragtest_path()
    settings_path = os.path.join(ragtest_path, "settings.yaml")
    try:
        if os.path.exists(settings_path):
            with open(settings_path, "r", encoding="utf-8") as f:
                settings = yaml.safe_load(f) or {}

            input_base_dir = (
                settings.get("input", {})
                .get("storage", {})
                .get("base_dir", input_base_dir)
            )
            output_base_dir = settings.get("output", {}).get("base_dir", output_base_dir)
            cache_base_dir = settings.get("cache", {}).get("base_dir", cache_base_dir)
    except Exception as e:
        # Fallback to defaults if settings.yaml cannot be read
        print(f"Warning: failed to read settings.yaml for paths: {e}")

    # Allow both relative (to ragtest_path) and absolute paths
    if os.path.isabs(input_base_dir):
        input_path = input_base_dir
    else:
        input_path = os.path.join(ragtest_path, input_base_dir)

    if os.path.isabs(output_base_dir):
        output_path = output_base_dir
    else:
        output_path = os.path.join(ragtest_path, output_base_dir)

    if os.path.isabs(cache_base_dir):
        cache_path = cache_base_dir
    else:
        cache_path = os.path.join(ragtest_path, cache_base_dir)

    return input_path, output_path, cache_path


def load_graph_data():
    """Load graph data from output parquet files.

    This function builds a unified graph that includes:
    - entities + relationships (基础实体图)
    - documents
    - text units
    - communities + community reports
    - covariates (如果存在)
    """
    global graph_data

    try:
        # Resolve output path from settings
        _, output_path, _ = get_config_paths()

        # Prefer legacy final files; fall back to new default names used by newer GraphRAG
        legacy_entities = os.path.join(output_path, "create_final_entities.parquet")
        legacy_relationships = os.path.join(output_path, "create_final_relationships.parquet")
        default_entities = os.path.join(output_path, "entities.parquet")
        default_relationships = os.path.join(output_path, "relationships.parquet")

        if os.path.exists(legacy_entities) and os.path.exists(legacy_relationships):
            entities_path = legacy_entities
            relationships_path = legacy_relationships
        elif os.path.exists(default_entities) and os.path.exists(default_relationships):
            entities_path = default_entities
            relationships_path = default_relationships
        else:
            print("Warning: Graph data files not found in output directory")
            print(
                f"Checked: {legacy_entities}, {legacy_relationships}, "
                f"{default_entities}, {default_relationships}"
            )
            return {"nodes": [], "links": []}

        entities = pd.read_parquet(entities_path)
        relationships = pd.read_parquet(relationships_path)

        # Build a lookup so that relationships can reference nodes by either id or title.
        id_by_key: dict[str, str] = {}
        for _, row in entities.iterrows():
            ent_id = str(row.get("id", ""))
            title = str(row.get("title", ""))
            if ent_id:
                id_by_key[ent_id] = ent_id
            if title:
                id_by_key[title] = ent_id or title

        # -----------------------
        # 1) 实体节点与实体-实体边
        # -----------------------
        nodes = []
        for _, row in entities.iterrows():
            node_id = str(row.get("id", row.get("title", "")))
            nodes.append(
                {
                    "id": node_id,
                    "name": str(row.get("title", "")),
                    "type": str(row.get("type", "entity")),
                    "description": str(row.get("description", ""))[:200],
                    "degree": int(row.get("degree", 0)),
                }
            )

        links = []
        for _, row in relationships.iterrows():
            raw_source = str(row.get("source", ""))
            raw_target = str(row.get("target", ""))
            src_id = id_by_key.get(raw_source, raw_source)
            tgt_id = id_by_key.get(raw_target, raw_target)
            links.append(
                {
                    "source": src_id,
                    "target": tgt_id,
                    "description": str(row.get("description", ""))[:100],
                    "weight": float(row.get("weight", 1.0)),
                }
            )

        # Track existing node ids to avoid duplicates when adding other layers
        existing_node_ids = {n["id"] for n in nodes}

        # 为避免重复边，维护一个简单的 (source, target) 集合
        existing_edges = {(l["source"], l["target"]) for l in links}

        # -----------------------
        # 2) 文档节点
        # -----------------------
        documents_path = os.path.join(output_path, "documents.parquet")
        documents = None
        if os.path.exists(documents_path):
            try:
                documents = pd.read_parquet(documents_path)
                for _, row in documents.iterrows():
                    doc_id = str(row.get("id", ""))
                    if not doc_id or doc_id in existing_node_ids:
                        continue
                    title = str(row.get("title", "") or f"Document {row.get('human_readable_id', '')}")
                    text = str(row.get("text", ""))
                    nodes.append(
                        {
                            "id": doc_id,
                            "name": title,
                            "type": "document",
                            "description": text[:200],
                            "degree": 0,
                        }
                    )
                    existing_node_ids.add(doc_id)
            except Exception as e:
                print(f"Warning: failed to read documents.parquet: {e}")

        # -----------------------
        # 3) Text unit 节点
        # -----------------------
        text_units_path = os.path.join(output_path, "text_units.parquet")
        text_units = None
        if os.path.exists(text_units_path):
            try:
                text_units = pd.read_parquet(text_units_path)
                for _, row in text_units.iterrows():
                    tu_id = str(row.get("id", ""))
                    if not tu_id or tu_id in existing_node_ids:
                        continue
                    text = str(row.get("text", ""))
                    nodes.append(
                        {
                            "id": tu_id,
                            "name": f"TextUnit {row.get('human_readable_id', '')}",
                            "type": "text_unit",
                            "description": text[:200],
                            "degree": 0,
                        }
                    )
                    existing_node_ids.add(tu_id)
            except Exception as e:
                print(f"Warning: failed to read text_units.parquet: {e}")

        # -----------------------
        # 4) Community 节点（结合 community_reports）
        # -----------------------
        communities_path = os.path.join(output_path, "communities.parquet")
        community_reports_path = os.path.join(output_path, "community_reports.parquet")
        communities = None
        community_reports = None
        reports_by_community_id = {}
        if os.path.exists(community_reports_path):
            try:
                community_reports = pd.read_parquet(community_reports_path)
                # 索引：community -> report row
                for _, row in community_reports.iterrows():
                    cid = str(row.get("community", ""))
                    if cid:
                        reports_by_community_id[cid] = row
            except Exception as e:
                print(f"Warning: failed to read community_reports.parquet: {e}")

        if os.path.exists(communities_path):
            try:
                communities = pd.read_parquet(communities_path)
                for _, row in communities.iterrows():
                    com_id = str(row.get("id", ""))
                    if not com_id or com_id in existing_node_ids:
                        continue
                    title = str(row.get("title", "") or f"Community {row.get('human_readable_id', '')}")
                    # 找对应的 report summary 作为描述
                    report = reports_by_community_id.get(str(row.get("id", ""))) or reports_by_community_id.get(
                        str(row.get("community", ""))
                    )
                    summary = ""
                    if report is not None:
                        summary = str(report.get("summary", "") or report.get("full_content", ""))
                    nodes.append(
                        {
                            "id": com_id,
                            "name": title,
                            "type": "community",
                            "description": summary[:200],
                            "degree": 0,
                        }
                    )
                    existing_node_ids.add(com_id)
            except Exception as e:
                print(f"Warning: failed to read communities.parquet: {e}")

        # -----------------------
        # 5) Covariate 节点（如果存在）
        # -----------------------
        covariates_path = os.path.join(output_path, "covariates.parquet")
        covariates = None
        if os.path.exists(covariates_path):
            try:
                covariates = pd.read_parquet(covariates_path)
                for _, row in covariates.iterrows():
                    cov_id = str(row.get("id", ""))
                    if not cov_id or cov_id in existing_node_ids:
                        continue
                    hrid = row.get("human_readable_id", "")
                    name = f"Covariate {hrid}" if hrid != "" else f"Covariate {cov_id}"
                    desc = str(row.get("description", "") or row.get("source_text", ""))
                    nodes.append(
                        {
                            "id": cov_id,
                            "name": name,
                            "type": "covariate",
                            "description": desc[:200],
                            "degree": 0,
                        }
                    )
                    existing_node_ids.add(cov_id)
            except Exception as e:
                print(f"Warning: failed to read covariates.parquet: {e}")

        # -----------------------
        # 6) 构建跨层级边
        # -----------------------
        def add_edge(src: str, tgt: str, description: str, weight: float = 1.0):
            if not src or not tgt:
                return
            key = (src, tgt)
            if key in existing_edges:
                return
            links.append(
                {
                    "source": src,
                    "target": tgt,
                    "description": description[:100],
                    "weight": float(weight),
                }
            )
            existing_edges.add(key)

        # Document -> TextUnit
        if documents is not None and text_units is not None:
            for _, row in text_units.iterrows():
                tu_id = str(row.get("id", ""))
                for doc_ids in row.get("document_ids", []) or []:
                    # document_ids 可能是列表
                    if isinstance(doc_ids, list):
                        for did in doc_ids:
                            add_edge(str(did), tu_id, "document contains text unit")
                    else:
                        add_edge(str(doc_ids), tu_id, "document contains text unit")

        # TextUnit -> Entity
        if text_units is not None:
            for _, row in text_units.iterrows():
                tu_id = str(row.get("id", ""))
                ent_ids_val = row.get("entity_ids")
                if ent_ids_val is not None:
                    try:
                        for eid in ent_ids_val:
                            mapped = id_by_key.get(str(eid), str(eid))
                            add_edge(tu_id, mapped, "text unit mentions entity")
                    except Exception:
                        mapped = id_by_key.get(str(ent_ids_val), str(ent_ids_val))
                        add_edge(tu_id, mapped, "text unit mentions entity")

        # Community -> Entity / TextUnit
        if communities is not None:
            for _, row in communities.iterrows():
                com_id = str(row.get("id", ""))
                # community.entity_ids
                ent_ids_val = row.get("entity_ids")
                if ent_ids_val is not None:
                    # entity_ids 通常是 numpy.ndarray 或 list
                    try:
                        for eid in ent_ids_val:
                            mapped = id_by_key.get(str(eid), str(eid))
                            add_edge(com_id, mapped, "community includes entity")
                    except Exception:
                        mapped = id_by_key.get(str(ent_ids_val), str(ent_ids_val))
                        add_edge(com_id, mapped, "community includes entity")

                # community.text_unit_ids
                tu_ids_val = row.get("text_unit_ids")
                if tu_ids_val is not None:
                    try:
                        for tid in tu_ids_val:
                            add_edge(com_id, str(tid), "community includes text unit")
                    except Exception:
                        add_edge(com_id, str(tu_ids_val), "community includes text unit")

        # TextUnit -> Covariate
        if text_units is not None and covariates is not None:
            for _, row in text_units.iterrows():
                tu_id = str(row.get("id", ""))
                cov_ids_val = row.get("covariate_ids")
                if cov_ids_val is not None:
                    try:
                        for cid in cov_ids_val:
                            add_edge(tu_id, str(cid), "text unit has covariate")
                    except Exception:
                        add_edge(tu_id, str(cov_ids_val), "text unit has covariate")

        graph_data = {"nodes": nodes, "links": links}
        print(f"Loaded {len(nodes)} nodes and {len(links)} links")
        return graph_data

    except Exception as e:
        print(f"Error loading graph data: {e}")
        import traceback
        traceback.print_exc()
        return {"nodes": [], "links": []}


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "GraphRAG API is running"})


@app.route('/api/graph', methods=['GET'])
def get_graph():
    """Get graph data for visualization"""
    if graph_data is None:
        data = load_graph_data()
    else:
        data = graph_data

    return jsonify(data)


@app.route('/api/query/local', methods=['POST'])
def local_query():
    """Perform local search query using GraphRAG Python API (with context_data)."""
    try:
        data = request.json
        question = data.get('question', '') if data else ''
        model_id = (data or {}).get('model_id')

        if not question:
            return jsonify({"error": "Question is required"}), 400

        root = Path(get_ragtest_path()).resolve()

        cli_overrides: dict = {}
        # Allow overriding the chat model used for local search at query-time.
        if model_id:
            cli_overrides["local_search.chat_model_id"] = str(model_id)

        # Use GraphRAG's run_local_search to get both response and context_data
        response_text, context_data = gr_query.run_local_search(
            config_filepath=None,
            data_dir=None,
            root_dir=root,
            community_level=2,
            response_type="Multiple Paragraphs",
            streaming=False,
            query=question,
            verbose=False,
            cli_overrides=cli_overrides or None,
        )

        return jsonify({
            "response": response_text,
            "context_data": _serialize_context_data(context_data),
        })

    except Exception as e:
        print(f"Error in local query: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/query/global', methods=['POST'])
def global_query():
    """Perform global search query using GraphRAG Python API (with context_data)."""
    try:
        data = request.json
        question = data.get('question', '') if data else ''
        model_id = (data or {}).get('model_id')

        if not question:
            return jsonify({"error": "Question is required"}), 400

        root = Path(get_ragtest_path()).resolve()

        cli_overrides: dict = {}
        # Allow overriding the chat model used for global search at query-time.
        if model_id:
            cli_overrides["global_search.chat_model_id"] = str(model_id)

        # Use GraphRAG's run_global_search to get both response and context_data
        response_text, context_data = gr_query.run_global_search(
            config_filepath=None,
            data_dir=None,
            root_dir=root,
            community_level=2,
            response_type="Multiple Paragraphs",
            streaming=False,
            query=question,
            dynamic_community_selection=False,
            verbose=False,
            cli_overrides=cli_overrides or None,
        )

        return jsonify({
            "response": response_text,
            "context_data": _serialize_context_data(context_data),
        })

    except Exception as e:
        print(f"Error in global query: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def chat_only():
    """Direct chat with the configured default_chat_model (no search/RAG)."""
    try:
        data = request.json or {}
        question = str(data.get('question', '')).strip()
        model_id = str(data.get("model_id", "")).strip()
        if not question:
            return jsonify({"error": "Question is required"}), 400

        # Load GraphRAG config to reuse default_chat_model settings
        root = Path(get_ragtest_path()).resolve()
        overrides: dict = {}
        # Allow overriding which chat model id to use for pure chat.
        if model_id:
            # For chat-only, we assume caller passes a valid model id (key in models)
            # and we use it directly.
            overrides = {}
        config = load_config(root, None, overrides)

        # Get the default chat model config
        # If caller specified a model_id, use that; otherwise, fall back to default_chat_model
        target_model_id = model_id if model_id else "default_chat_model"
        chat_cfg = config.get_language_model_config(target_model_id)

        # Create a Litellm-based chat model directly
        chat_model = LitellmChatModel(
            name="default_chat_model",
            config=chat_cfg,
            cache=None,
        )

        # Simple prompt: directly send user question; history can be extended later
        resp = chat_model.chat(prompt=question, history=None)
        # LitellmModelResponse has .output.content; fall back to other attrs if needed
        text = getattr(getattr(resp, "output", None), "content", None) or getattr(
            resp, "content", None
        ) or getattr(resp, "text", None) or str(resp)

        return jsonify({
            "response": text,
            "context_data": {},
        })
    except Exception as e:
        print(f"Error in chat_only: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/index/build', methods=['POST'])
def build_index():
    """Build GraphRAG index"""
    try:
        # Run graphrag index command
        result = subprocess.run(
            ["python", "-m", "graphrag.index", "--root", get_ragtest_path()],
            capture_output=True,
            text=True,
            timeout=3600
        )

        if result.returncode == 0:
            # Reload graph data after successful indexing
            load_graph_data()
            return jsonify({"status": "success", "message": "索引构建成功"})
        else:
            return jsonify({"status": "error", "message": result.stderr}), 500

    except Exception as e:
        print(f"Error building index: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get current settings from settings.yaml"""
    try:
        ragtest_path = get_ragtest_path()
        settings_path = os.path.join(ragtest_path, "settings.yaml")

        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = yaml.safe_load(f)

        return jsonify(settings)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/settings', methods=['PUT'])
def update_settings():
    """Update settings.yaml"""
    try:
        ragtest_path = get_ragtest_path()
        settings_path = os.path.join(ragtest_path, "settings.yaml")

        new_settings = request.json

        with open(settings_path, 'w', encoding='utf-8') as f:
            yaml.dump(new_settings, f, default_flow_style=False, allow_unicode=True)

        return jsonify({"status": "success", "message": "设置更新成功"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/files/list', methods=['GET'])
def list_files():
    """List files and directories in ragtest"""
    try:
        path = request.args.get('path', '')
        ragtest_path = get_ragtest_path()
        base_path = os.path.join(ragtest_path, path)

        # Security check: ensure path is within RAGTEST_PATH
        if not os.path.abspath(base_path).startswith(os.path.abspath(ragtest_path)):
            return jsonify({"error": "Invalid path"}), 400

        if not os.path.exists(base_path):
            return jsonify({"error": "Path not found"}), 404

        items = []
        for item in os.listdir(base_path):
            item_path = os.path.join(base_path, item)
            relative_path = os.path.relpath(item_path, ragtest_path)

            item_info = {
                "name": item,
                "path": relative_path,
                "type": "directory" if os.path.isdir(item_path) else "file",
            }

            if os.path.isfile(item_path):
                item_info["size"] = os.path.getsize(item_path)
                item_info["extension"] = os.path.splitext(item)[1]

            items.append(item_info)

        # Sort: directories first, then files
        items.sort(key=lambda x: (x["type"] != "directory", x["name"].lower()))

        return jsonify({
            "current_path": path,
            "items": items
        })

    except Exception as e:
        print(f"Error listing files: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/files/read', methods=['GET'])
def read_file():
    """Read file content"""
    try:
        path = request.args.get('path', '')
        ragtest_path = get_ragtest_path()
        file_path = os.path.join(ragtest_path, path)

        # Security check
        if not os.path.abspath(file_path).startswith(os.path.abspath(ragtest_path)):
            return jsonify({"error": "Invalid path"}), 400

        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return jsonify({"error": "File not found"}), 404

        # Check file size (limit to 1MB)
        if os.path.getsize(file_path) > 1024 * 1024:
            return jsonify({"error": "File too large (max 1MB)"}), 400

        # Try to read as text
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            return jsonify({
                "path": path,
                "content": content,
                "size": os.path.getsize(file_path)
            })
        except UnicodeDecodeError:
            return jsonify({"error": "Binary file cannot be displayed"}), 400

    except Exception as e:
        print(f"Error reading file: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/files/stats', methods=['GET'])
def get_stats():
    """Get statistics about ragtest directory"""
    try:
        stats = {
            "input_files": 0,
            "output_files": 0,
            "cache_files": 0,
            "total_size": 0
        }

        # Resolve paths from settings
        input_path, output_path, cache_path = get_config_paths()

        # Count input files
        if os.path.exists(input_path):
            for root, dirs, files in os.walk(input_path):
                stats["input_files"] += len(files)
                for file in files:
                    stats["total_size"] += os.path.getsize(os.path.join(root, file))

        # Count output files
        if os.path.exists(output_path):
            for root, dirs, files in os.walk(output_path):
                stats["output_files"] += len(files)

        # Count cache files
        if os.path.exists(cache_path):
            for root, dirs, files in os.walk(cache_path):
                stats["cache_files"] += len(files)

        return jsonify(stats)

    except Exception as e:
        print(f"Error getting stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/root-path', methods=['GET'])
def get_root_path():
    """Get current project root path."""
    try:
        return jsonify({"root_path": get_ragtest_path()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/root-path', methods=['PUT'])
def update_root_path():
    """Update project root path configuration."""
    global graph_data
    try:
        data = request.json or {}
        new_root = str(data.get("root_path", "")).strip()

        if not new_root:
            return jsonify({"error": "root_path is required"}), 400

        # Store the value as-is; resolution relative to BASE_DIR happens in get_ragtest_path
        config = {"project_root": new_root}
        with open(PROJECT_CONFIG_PATH, "w", encoding="utf-8") as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True)

        # Clear cached graph and reload for the new root
        graph_data = None
        load_graph_data()

        return jsonify({"status": "success", "root_path": get_ragtest_path()})

    except Exception as e:
        print(f"Error updating root path: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Load environment variables
    from dotenv import load_dotenv
    ragtest_path = get_ragtest_path()
    env_path = os.path.join(ragtest_path, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)

    # Initialize on startup
    print("="*50)
    print("GraphRAG Backend Server")
    print("="*50)
    input_path, output_path, cache_path = get_config_paths()
    print(f"RAGTEST_PATH: {ragtest_path}")
    print(f"Input path: {input_path}")
    print(f"Output path: {output_path}")
    print(f"Cache path: {cache_path}")
    print("Loading graph data...")
    load_graph_data()
    print("="*50)
    print("Starting Flask server on http://localhost:5001")
    print("="*50)

    app.run(host='0.0.0.0', port=5001, debug=True)
