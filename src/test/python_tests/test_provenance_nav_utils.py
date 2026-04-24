from pathlib import Path
from textwrap import dedent
import sys


BUNDLED_PATH = Path(__file__).parents[3] / "bundled" / "tool"
sys.path.insert(0, str(BUNDLED_PATH))

from provenance_nav_utils import (
    interpolation_reference_path_at_position,
    yaml_path_at_position,
)


def test_yaml_path_at_top_level_mapping_key():
    content = dedent(
        """\
        server:
          host: localhost
        """
    )
    assert yaml_path_at_position(content, 1, 3) == ["server", "host"]


def test_yaml_path_at_mapping_value():
    content = dedent(
        """\
        server:
          host: localhost
        """
    )
    assert yaml_path_at_position(content, 1, 10) == ["server", "host"]


def test_yaml_path_at_sequence_item_mapping_value():
    content = dedent(
        """\
        users:
          - name: alice
            age: 30
        """
    )
    assert yaml_path_at_position(content, 2, 10) == ["users", 0, "age"]


def test_yaml_path_at_position_invalid_yaml_returns_none():
    assert yaml_path_at_position("broken: [", 0, 0) is None


def test_yaml_path_at_position_empty_yaml_returns_none():
    assert yaml_path_at_position("", 0, 0) is None


def test_interpolation_reference_path_at_position_simple_reference():
    content = dedent(
        """\
        a:
          b: 2

        c: ${a.b}
        """
    )
    # Cursor on '{' in "${a.b}"
    assert interpolation_reference_path_at_position(content, 3, 4) == ["a", "b"]


def test_interpolation_reference_path_at_position_list_reference():
    content = "x: ${users[0].name}\n"
    assert interpolation_reference_path_at_position(content, 0, 5) == ["users", 0, "name"]


def test_interpolation_reference_path_at_position_resolver_returns_none():
    content = "c: ${oc.env:HOME}\n"
    assert interpolation_reference_path_at_position(content, 0, 5) is None


def test_interpolation_reference_path_at_position_outside_token_returns_none():
    content = "c: ${a.b}\n"
    assert interpolation_reference_path_at_position(content, 0, 1) is None
