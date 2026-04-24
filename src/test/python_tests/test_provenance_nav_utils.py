from pathlib import Path
from textwrap import dedent
import sys


BUNDLED_PATH = Path(__file__).parents[3] / "bundled" / "tool"
sys.path.insert(0, str(BUNDLED_PATH))

from provenance_nav_utils import yaml_path_at_position


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
