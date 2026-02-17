import pathlib
import sys
from types import SimpleNamespace

import pytest
from lsprotocol.types import Location, Position, Range

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "bundled" / "tool"))
import lsp_server  # noqa: E402  pylint: disable=wrong-import-position


class FakeDocument:
    def __init__(self, word):
        self._word = word

    def word_at_position(self, *_args, **_kwargs):
        return self._word


class FakeWorkspace:
    def __init__(self, word):
        self._document = FakeDocument(word)

    def get_text_document(self, _uri):
        return self._document


class FakeServer:
    def __init__(self, word):
        self.workspace = FakeWorkspace(word)

    def is_kedro_project(self):
        return True


def make_params(uri: str, line: int = 1, character: int = 1):
    return SimpleNamespace(
        text_document=SimpleNamespace(uri=uri),
        position=Position(line=line, character=character),
    )


@pytest.fixture(autouse=True)
def patch_check_project(monkeypatch):
    monkeypatch.setattr(lsp_server, "_check_project", lambda: None)
    monkeypatch.setattr(lsp_server, "_get_conf_paths", lambda _server, _key: [])


def test_definition_python_symbol_but_not_kedro_symbol():
    server = FakeServer(word="my_python_function")
    params = make_params("file:///workspace/src/module.py")

    result = lsp_server.definition(server, params)

    assert result is None


def test_definition_no_match_from_pylance_and_kedro_returns_none():
    server = FakeServer(word="totally_unknown_symbol")
    params = make_params("file:///workspace/src/pipelines/data_science/pipeline.py")

    result = lsp_server.definition(server, params)

    assert result is None


def test_definition_kedro_symbol_find_definition(monkeypatch):
    server = FakeServer(word="params:my_param")
    params = make_params("file:///workspace/src/pipelines/data_science/pipeline.py")
    expected = Location(
        uri="file:///workspace/conf/base/parameters.yml",
        range=Range(
            start=Position(line=5, character=0),
            end=Position(line=6, character=0),
        ),
    )

    monkeypatch.setattr(lsp_server, "_get_param_location", lambda _server, _word: expected)

    result = lsp_server.definition(server, params)

    assert result == [expected]


def test_definition_kedro_symbol_no_definition_returns_self_location():
    server = FakeServer(word="unknown_catalog_entry")
    params = make_params("file:///workspace/conf/base/catalog.yml", line=10, character=4)

    result = lsp_server.definition(server, params)

    assert result is not None
    assert len(result) == 1
    assert result[0].uri == "file:///workspace/conf/base/catalog.yml"
    assert result[0].range.start == Position(line=10, character=4)
    assert result[0].range.end == Position(line=10, character=4)
