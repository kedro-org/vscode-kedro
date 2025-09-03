"""Validation utility functions"""
from typing import Dict, Optional, Tuple, Any, List
import json
import re
from lsprotocol.types import Position, Diagnostic, DiagnosticSeverity, Range


def find_line_number_and_character(text: str, dataset_name: str, field_name: str = "") -> Optional[Tuple[int, int]]:
    """Find the line number and character position of a dataset or field in YAML content"""
    lines = text.split('\n')
    in_dataset = False

    for idx, line in enumerate(lines):
        stripped_line = line.lstrip()

        if stripped_line.startswith(f"{dataset_name}:"):
            in_dataset = True
            if not field_name:  # If we're looking for the dataset name itself
                start_char = len(line) - len(line.lstrip())
                return idx, start_char

        elif in_dataset:
            # Restructured conditionals for clarity
            if field_name and stripped_line.startswith(f"{field_name}:"):
                start_char = len(line) - len(line.lstrip())
                return idx, start_char
            elif stripped_line and not line.startswith(' '):  # Check original line for indentation
                in_dataset = False  # End of current dataset

    return None


def create_diagnostic(
    range_start: Position, 
    range_end: Position, 
    message: str, 
    severity: DiagnosticSeverity = DiagnosticSeverity.Error
) -> Diagnostic:
    """Helper function to create diagnostics with consistent formatting"""
    return Diagnostic(
        range=Range(start=range_start, end=range_end),
        message=message,
        severity=severity,
        source="Kedro LSP",
    )


def has_config_references(dataset_config) -> bool:
    """Check if dataset config contains any configuration references (OmegaConf interpolations)"""
    if not isinstance(dataset_config, dict):
        return False

    dataset_str = json.dumps(dataset_config)
    # Match OmegaConf interpolation patterns like ${globals:columns} or ${oc.env:VAR}
    return bool(re.search(r'\$\{[^{}]+:[^{}]+\}', dataset_str))


def is_valid_dataset_entry(dataset_name: Any) -> bool:
    """Check if an entry is a valid dataset (not a variable definition or invalid type)"""
    return (
        isinstance(dataset_name, str) and
        not dataset_name.startswith("_")
    )


def remove_line_numbers(config):
    """Remove __line__ information from config for validation purposes"""
    if isinstance(config, dict):
        return {k: remove_line_numbers(v) for k, v in config.items() if k != '__line__'}
    elif isinstance(config, list):
        return [remove_line_numbers(i) for i in config]
    else:
        return config
