from __future__ import annotations

from typing import Any, Dict, List, Set


def _flatten_dataset_names(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        flattened: List[str] = []
        for nested in value.values():
            flattened.extend(_flatten_dataset_names(nested))
        return flattened
    if isinstance(value, (list, tuple, set)):
        flattened = []
        for nested in value:
            flattened.extend(_flatten_dataset_names(nested))
        return flattened
    return []


def _to_symbol(symbol_id: str, kind: str, name: str, detail: str, project_path: str) -> Dict[str, Any]:
    return {
        "id": symbol_id,
        "kind": kind,
        "name": name,
        "detail": detail,
        "projectPath": project_path,
    }


def _collect_dataset_and_parameter_symbols(server, project_path: str) -> List[Dict[str, Any]]:
    symbols: List[Dict[str, Any]] = []
    if server.dummy_catalog is None:
        return symbols

    dataset_names = server.dummy_catalog.list()
    for dataset_name in dataset_names:
        if dataset_name.startswith("params:") or dataset_name == "parameters":
            symbols.append(
                _to_symbol(
                    symbol_id=f"parameter:{dataset_name}",
                    kind="parameter",
                    name=dataset_name,
                    detail="Parameter",
                    project_path=project_path,
                )
            )
        else:
            dataset_config = server.dummy_catalog.conf_catalog.get(dataset_name, {})
            dataset_type = dataset_config.get("type", "Dataset")
            symbols.append(
                _to_symbol(
                    symbol_id=f"dataset:{dataset_name}",
                    kind="dataset",
                    name=dataset_name,
                    detail=dataset_type,
                    project_path=project_path,
                )
            )
    return symbols


def _collect_pipeline_and_node_symbols(server, project_path: str) -> List[Dict[str, Any]]:
    symbols: List[Dict[str, Any]] = []
    context = server.context
    if context is None:
        return symbols

    pipelines = getattr(context, "pipelines", None)
    if not pipelines:
        return symbols

    for pipeline_name, pipeline_obj in pipelines.items():
        symbols.append(
            _to_symbol(
                symbol_id=f"pipeline:{pipeline_name}",
                kind="pipeline",
                name=pipeline_name,
                detail="Pipeline",
                project_path=project_path,
            )
        )
        for node in getattr(pipeline_obj, "nodes", []):
            node_name = getattr(node, "name", None) or getattr(node, "_func_name", None) or str(node)
            symbols.append(
                _to_symbol(
                    symbol_id=f"node:{pipeline_name}:{node_name}",
                    kind="node",
                    name=node_name,
                    detail=pipeline_name,
                    project_path=project_path,
                )
            )
    return symbols


def _collect_references(server, project_path: str) -> List[Dict[str, Any]]:
    references: List[Dict[str, Any]] = []
    context = server.context
    if context is None:
        return references

    pipelines = getattr(context, "pipelines", None)
    if not pipelines:
        return references

    for pipeline_name, pipeline_obj in pipelines.items():
        for node in getattr(pipeline_obj, "nodes", []):
            node_name = getattr(node, "name", None) or getattr(node, "_func_name", None) or str(node)
            inputs = _flatten_dataset_names(getattr(node, "inputs", None))
            outputs = _flatten_dataset_names(getattr(node, "outputs", None))
            for dataset_name in inputs:
                if not dataset_name:
                    continue
                references.append(
                    {
                        "datasetName": dataset_name,
                        "pipelineName": str(pipeline_name),
                        "nodeName": str(node_name),
                        "relation": "consumes",
                        "projectPath": project_path,
                    }
                )
            for dataset_name in outputs:
                if not dataset_name:
                    continue
                references.append(
                    {
                        "datasetName": dataset_name,
                        "pipelineName": str(pipeline_name),
                        "nodeName": str(node_name),
                        "relation": "produces",
                        "projectPath": project_path,
                    }
                )
    return references


def get_symbol_index(server) -> Dict[str, Any]:
    workspace_settings = getattr(server, "workspace_settings", {}) or {}
    project_path = workspace_settings.get("kedroProjectPath") or server.workspace.root_path or ""

    symbol_map: Dict[str, Dict[str, Any]] = {}
    symbols: List[Dict[str, Any]] = []
    references: List[Dict[str, Any]] = []

    for symbol in _collect_dataset_and_parameter_symbols(server, project_path):
        if symbol["id"] not in symbol_map:
            symbol_map[symbol["id"]] = symbol
            symbols.append(symbol)

    for symbol in _collect_pipeline_and_node_symbols(server, project_path):
        if symbol["id"] not in symbol_map:
            symbol_map[symbol["id"]] = symbol
            symbols.append(symbol)

    seen_refs: Set[str] = set()
    for ref in _collect_references(server, project_path):
        ref_key = f"{ref['datasetName']}|{ref['pipelineName']}|{ref['nodeName']}|{ref.get('relation', '')}"
        if ref_key not in seen_refs:
            seen_refs.add(ref_key)
            references.append(ref)

    return {
        "symbols": symbols,
        "references": references,
    }
