import sys

import pytest
import pytest_lsp
from lsprotocol.types import (
    CompletionParams,
    InitializeParams,
    Position,
    TextDocumentIdentifier,
)
from pygls.workspace import TextDocument
from pytest_lsp import (
    ClientServerConfig,
    LanguageClient,
    client_capabilities,
)


@pytest_lsp.fixture(
    config=ClientServerConfig(
        server_command=[
            sys.executable,
            "/Users/Nok_Lam_Chan/dev/vscode-python-tools-extension-template/bundled/tool/lsp_server.py",
        ],
    ),
)
async def client(lsp_client: LanguageClient):
    # Setup
    await lsp_client.initialize_session(
        InitializeParams(
            capabilities=client_capabilities("visual-studio-code"),
            root_uri="file:///Users/Nok_Lam_Chan/dev/pygls/examples/servers/old_kedro_project",
        )
    )

    yield

    # Teardown
    await lsp_client.shutdown_session()


@pytest.mark.asyncio
async def test_completion(client: LanguageClient):
    result = await client.text_document_completion_async(
        params=CompletionParams(
            position=Position(line=5, character=23),
            text_document=TextDocumentIdentifier(
                uri="file:///path/to/test/project/root/test_file.rst"
            ),
        )
    )

    assert len(result.items) > 0


@pytest.mark.xfail(
    reason="This should fail but currently autocompletion is trigger for every file"
)
@pytest.mark.asyncio
async def test_completion_fail(client: LanguageClient):
    result = await client.text_document_completion_async(
        params=CompletionParams(
            position=Position(line=5, character=23),
            text_document=TextDocumentIdentifier(
                uri="file:///path/to/test/project/root/test_file.rst"
            ),
        )
    )

    assert len(result.items) < 1


def test_definition(client):
    path = "/Users/Nok_Lam_Chan/dev/vscode-python-tools-extension-template/src/test/python_tests/conftest.py"
    td = TextDocument(f"file://{path}")

    import re

    RE_START_WORD = re.compile("[A-Za-z_0-9\.:]*$")
    RE_END_WORD = re.compile("^[A-Za-z_0-9\.:]*")

    pos = Position(0, 17)  # "a" at "params:a.b.c."
    print(td.word_at_position(pos, RE_START_WORD, RE_END_WORD))
    print(td.word_at_position(pos))
    assert False
