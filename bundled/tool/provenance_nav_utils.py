from __future__ import annotations

import re
from typing import Any, List, Optional

import yaml
from yaml.nodes import MappingNode, Node, ScalarNode, SequenceNode


def _position_in_node(line: int, character: int, node: Node) -> bool:
    current = (line, character)
    start = (node.start_mark.line, node.start_mark.column)
    end = (node.end_mark.line, node.end_mark.column)
    return start <= current <= end


def _yaml_path_from_node(
    node: Node, line: int, character: int, path: List[Any]
) -> Optional[List[Any]]:
    if not _position_in_node(line, character, node):
        return None

    if isinstance(node, MappingNode):
        for key_node, value_node in node.value:
            key_token = key_node.value if isinstance(key_node, ScalarNode) else None
            if _position_in_node(line, character, key_node):
                return path + ([key_token] if key_token is not None else [])

            value_path = path + ([key_token] if key_token is not None else [])
            nested_path = _yaml_path_from_node(value_node, line, character, value_path)
            if nested_path is not None:
                return nested_path
        return path

    if isinstance(node, SequenceNode):
        for index, item_node in enumerate(node.value):
            nested_path = _yaml_path_from_node(item_node, line, character, path + [index])
            if nested_path is not None:
                return nested_path
        return path

    if isinstance(node, ScalarNode):
        return path

    return path


def yaml_path_at_position(source: str, line: int, character: int) -> Optional[List[Any]]:
    try:
        root_node = yaml.compose(source)
    except yaml.YAMLError:
        return None
    if root_node is None:
        return None
    return _yaml_path_from_node(root_node, line, character, [])


_INTERPOLATION_RE = re.compile(r"\$\{([^{}]+)\}")
_PATH_SEGMENT_RE = re.compile(r"([A-Za-z_][A-Za-z0-9_]*)(\[(\d+)\])?")


def _parse_reference_path(path_expr: str) -> Optional[List[Any]]:
    tokens: List[Any] = []
    for segment in path_expr.split("."):
        match = _PATH_SEGMENT_RE.fullmatch(segment)
        if not match:
            return None
        tokens.append(match.group(1))
        if match.group(3) is not None:
            tokens.append(int(match.group(3)))
    return tokens


def interpolation_reference_path_at_position(
    source: str, line: int, character: int
) -> Optional[List[Any]]:
    lines = source.splitlines()
    if line < 0 or line >= len(lines):
        return None

    line_text = lines[line]
    for match in _INTERPOLATION_RE.finditer(line_text):
        if not (match.start() <= character < match.end()):
            continue
        # Ignore delimiter positions: '$', '{', and '}' should not trigger navigation.
        if character <= match.start() + 1 or character >= match.end() - 1:
            return None
        expression = match.group(1).strip()
        # Resolver interpolations (e.g. ${oc.env:HOME}) are out of scope.
        if ":" in expression:
            return None
        return _parse_reference_path(expression)
    return None


def interpolation_expression_at_position(
    source: str, line: int, character: int
) -> Optional[str]:
    lines = source.splitlines()
    if line < 0 or line >= len(lines):
        return None

    line_text = lines[line]
    for match in _INTERPOLATION_RE.finditer(line_text):
        if match.start() <= character < match.end():
            return match.group(1).strip()
    return None


def key_position_for_path(
    source: str, path_tokens: List[Any]
) -> Optional[tuple[int, int, int]]:
    """Return 0-based (line, character, width) for final key/index target."""
    try:
        root_node = yaml.compose(source)
    except yaml.YAMLError:
        return None
    if root_node is None:
        return None

    node: Node = root_node
    for idx, token in enumerate(path_tokens):
        is_last = idx == len(path_tokens) - 1

        if isinstance(node, MappingNode):
            if not isinstance(token, str):
                return None
            matched = False
            for key_node, value_node in node.value:
                if isinstance(key_node, ScalarNode) and key_node.value == token:
                    matched = True
                    if is_last:
                        return (
                            key_node.start_mark.line,
                            key_node.start_mark.column,
                            len(key_node.value),
                        )
                    node = value_node
                    break
            if not matched:
                return None
            continue

        if isinstance(node, SequenceNode):
            if not isinstance(token, int):
                return None
            if token < 0 or token >= len(node.value):
                return None
            item_node = node.value[token]
            if is_last:
                return (item_node.start_mark.line, item_node.start_mark.column, 1)
            node = item_node
            continue

        return None

    return None
