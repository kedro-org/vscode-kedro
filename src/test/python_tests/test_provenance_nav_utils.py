from pathlib import Path
import tempfile
from textwrap import dedent
import sys

from omegaconf import OmegaConf


BUNDLED_PATH = Path(__file__).parents[3] / "bundled" / "tool"
sys.path.insert(0, str(BUNDLED_PATH))

from provenance_nav_utils import (
    interpolation_expression_at_position,
    interpolation_reference_path_at_position,
    key_position_for_path,
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
    # Cursor on 'a' in "${a.b}"
    assert interpolation_reference_path_at_position(content, 3, 6) == ["a", "b"]


def test_interpolation_reference_path_at_position_list_reference():
    content = "x: ${users[0].name}\n"
    assert interpolation_reference_path_at_position(content, 0, 5) == ["users", 0, "name"]


def test_interpolation_reference_path_at_position_resolver_returns_none():
    content = "c: ${oc.env:HOME}\n"
    assert interpolation_reference_path_at_position(content, 0, 5) is None


def test_interpolation_reference_path_at_position_outside_token_returns_none():
    content = "c: ${a.b}\n"
    assert interpolation_reference_path_at_position(content, 0, 1) is None


def test_interpolation_reference_path_at_dollar_or_braces_returns_none():
    content = "c: ${a.b}\n"
    assert interpolation_reference_path_at_position(content, 0, 3) is None  # $
    assert interpolation_reference_path_at_position(content, 0, 4) is None  # {
    assert interpolation_reference_path_at_position(content, 0, 8) is None  # }


def test_interpolation_expression_at_position_returns_raw_expression():
    content = "c: ${a.b}\n"
    assert interpolation_expression_at_position(content, 0, 5) == "a.b"


def test_interpolation_expression_at_position_outside_token_returns_none():
    content = "c: ${a.b}\n"
    assert interpolation_expression_at_position(content, 0, 0) is None


def _provenance_for_reference(cfg, path_tokens):
    parent = cfg
    for token in path_tokens[:-1]:
        parent = parent[token]
    return OmegaConf.get_provenance(parent, path_tokens[-1])


def test_interpolation_reference_resolves_provenance_same_file():
    content = dedent(
        """\
        a:
          b: 2

        c: ${a.b}
        """
    )
    # Cursor on 'a' in "c: ${a.b}"
    path_tokens = interpolation_reference_path_at_position(content, 3, 6)
    assert path_tokens == ["a", "b"]

    with tempfile.TemporaryDirectory() as tmp:
        yaml_path = Path(tmp) / "example.yaml"
        yaml_path.write_text(content, encoding="utf-8")
        cfg = OmegaConf.load(yaml_path)

        provenance = _provenance_for_reference(cfg, path_tokens)
        assert provenance is not None
        assert provenance.kind == "file"
        assert Path(provenance.source).resolve() == yaml_path.resolve()
        # "b: 2" line (1-based)
        assert provenance.line == 2


def test_interpolation_reference_resolves_provenance_across_merge():
    base_content = dedent(
        """\
        shuttle_passenger_capacity_plot_exp:
          plotly_args:
            title: "From base"
        """
    )
    override_content = dedent(
        """\
        dummy_confusion_matrix:
          something: "${shuttle_passenger_capacity_plot_exp.plotly_args}"
        """
    )

    # Cursor at '$' in interpolation on second line
    path_tokens = interpolation_reference_path_at_position(override_content, 1, 17)
    assert path_tokens == ["shuttle_passenger_capacity_plot_exp", "plotly_args"]

    with tempfile.TemporaryDirectory() as tmp:
        base_path = Path(tmp) / "base.yaml"
        override_path = Path(tmp) / "override.yaml"
        base_path.write_text(base_content, encoding="utf-8")
        override_path.write_text(override_content, encoding="utf-8")

        merged = OmegaConf.merge(OmegaConf.load(base_path), OmegaConf.load(override_path))
        provenance = _provenance_for_reference(merged, path_tokens)
        assert provenance is not None
        assert provenance.kind == "file"
        assert Path(provenance.source).resolve() == base_path.resolve()
        # Value node under "plotly_args:" line (1-based) in base file
        assert provenance.line == 3


def test_key_position_for_path_points_to_mapping_key_line():
    content = dedent(
        """\
        shuttle_passenger_capacity_plot_exp:
          type: plotly.PlotlyDataset
          plotly_args:
            type: bar
        """
    )
    pos = key_position_for_path(
        content, ["shuttle_passenger_capacity_plot_exp", "plotly_args"]
    )
    assert pos == (2, 2, len("plotly_args"))
