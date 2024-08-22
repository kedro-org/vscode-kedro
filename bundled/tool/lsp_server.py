# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
"""Implementation of tool support over LSP."""

from __future__ import annotations

import glob
import json
import logging
import os
import pathlib
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from common import update_sys_path

# **********************************************************
# Update sys.path before importing any bundled libraries.
# **********************************************************
logger = logging.getLogger(__name__)

# Ensure that we can import LSP libraries, and other bundled libraries.
before_update_path = sys.path.copy()
update_sys_path(
    os.fspath(pathlib.Path(__file__).parent.parent / "libs"),
    os.getenv("LS_IMPORT_STRATEGY", "useBundled"),
)
after_update_path = sys.path.copy()

logger.warning(f"{before_update_path=}")
logger.warning(f"{after_update_path=}")
# **********************************************************
# Imports needed for the language server goes below this.
# **********************************************************
# pylint: disable=wrong-import-position,import-error
import lsprotocol.types as lsp

# ******************************************************
# Kedro LSP Server.
# ******************************************************
from lsprotocol.types import (
    TEXT_DOCUMENT_COMPLETION,
    TEXT_DOCUMENT_DEFINITION,
    TEXT_DOCUMENT_HOVER,
    TEXT_DOCUMENT_REFERENCES,
    WORKSPACE_DID_CHANGE_CONFIGURATION,
    CompletionItem,
    CompletionList,
    CompletionOptions,
    CompletionParams,
    DidChangeConfigurationParams,
    Hover,
    HoverParams,
    Location,
    MarkupContent,
    MarkupKind,
    Position,
    Range,
    TextDocumentPositionParams,
)
from pygls import uris, workspace
from pygls.workspace import TextDocument

"""Kedro Language Server."""
# todo: we should either investigate why logging interact with lsp or find a better way.
# Need to stop kedro.framework.project.LOGGING from changing logging settings, otherwise pygls fails with unknown reason.
import os

os.environ["KEDRO_LOGGING_CONFIG"] = str(Path(__file__).parent / "dummy_logging.yml")

from typing import List

import yaml
from _lsp_server import DummyDataCatalog, SafeLineLoader
from kedro.config import OmegaConfigLoader
from kedro.framework.hooks.manager import _NullPluginManager
from kedro.framework.session import KedroSession
from kedro.framework.startup import (
    ProjectMetadata,
    bootstrap_project,
)
from pygls.server import LanguageServer


class KedroLanguageServer(LanguageServer):
    """Store Kedro-specific information in the language server."""

    project_metadata: Optional[ProjectMetadata] = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def is_kedro_project(self) -> bool:
        """Returns whether the current workspace is a kedro project."""
        return self.project_metadata is not None

    def _set_project_with_workspace(self):
        if self.project_metadata:
            return
        try:
            self.workspace_settings = next(iter(WORKSPACE_SETTINGS.values()))
            root_path = pathlib.Path(
                self.workspace.root_path
            )  # todo: From language server, can we get it from client initialise response instead?
            project_metadata = bootstrap_project(root_path)
            env = None
            if self.workspace_settings.get("environment"):
                env = self.workspace_settings.get("environment")
            session = KedroSession.create(root_path, env=env)
            # todo: less hacky way to override session hook manager
            # avoid initialise spark hooks etc
            session._hook_manager = _NullPluginManager()
            context = session.load_context()
            config_loader: OmegaConfigLoader = context.config_loader
            # context.env is set when KEDRO_ENV or kedro run --env is set
            conf_env = context.env if context.env else config_loader.base_env
            base_path = str(Path(config_loader.conf_source) / conf_env)

        except RuntimeError as e:
            log_for_lsp_debug(str(e))
            project_metadata = None
            context = None
            config_loader = None
            base_path = None
        finally:
            self.project_metadata = project_metadata
            self.context = context
            self.config_loader = config_loader
            self.dummy_catalog = self._get_dummy_catalog()
            self.base_path = base_path

    def _get_dummy_catalog(self):
        # '**/catalog*' reads modular pipeline configs
        conf_catalog = self.config_loader["catalog"]
        params = self.config_loader["parameters"]
        catalog: DummyDataCatalog = DummyDataCatalog(
            conf_catalog=conf_catalog, feed_dict=params
        )
        feed_dict = catalog._get_feed_dict()
        catalog.add_feed_dict(feed_dict)
        return catalog


LSP_SERVER = KedroLanguageServer("pygls-kedro-example", "v0.1")
ADDITION = re.compile(
    r"^\s*(\d+)\s*\+\s*(\d+)\s*=(?=\s*$)"
)  # todo: remove this when mature
RE_START_WORD = re.compile(r"[A-Za-z_0-9:\.]*$")
RE_END_WORD = re.compile(r"^[A-Za-z_0-9:\.]*")

### Settings
GLOBAL_SETTINGS = {}
WORKSPACE_SETTINGS = {}
IS_EXPERIMENTAL = "yes"
RUNNER = pathlib.Path(__file__).parent / "lsp_runner.py"
MAX_WORKERS = 5


@LSP_SERVER.feature(lsp.INITIALIZE)
async def initialize(params: lsp.InitializeParams) -> None:
    log_to_output(f"CWD Server: {os.getcwd()}")
    paths = "\r\n   ".join(sys.path)
    log_to_output(f"sys.path used to run Server:\r\n   {paths}")
    GLOBAL_SETTINGS.update(**params.initialization_options.get("globalSettings", {}))
    settings = params.initialization_options["settings"]
    _update_workspace_settings(settings)

    # Read the first workspace only in case there are multiples of them.
    workspace_settings = next(iter(WORKSPACE_SETTINGS.values()))
    if not workspace_settings.get("isExperimental") == "yes":
        IS_EXPERIMENTAL = workspace_settings.get("isExperimental")

    log_to_output(
        f"Settings used to run Server:\r\n{json.dumps(settings, indent=4, ensure_ascii=False)}\r\n"
    )
    log_to_output(
        f"Global settings:\r\n{json.dumps(GLOBAL_SETTINGS, indent=4, ensure_ascii=False)}\r\n"
    )
    log_to_output(
        f"Workspace settings:\r\n{json.dumps(WORKSPACE_SETTINGS, indent=4, ensure_ascii=False)}\r\n"
    )
    _check_project()


### Kedro LSP logic
def _get_conf_paths(server: KedroLanguageServer, key):
    """
    Get the configuration paths of parameters based on the project metadata.

    Args:
        project_metadata: The metadata of the project.

    Returns:
        A set of configuration paths.

    """
    config_loader: OmegaConfigLoader = LSP_SERVER.config_loader
    patterns = config_loader.config_patterns.get(key, [])
    default_run_env = str(
        Path(config_loader.conf_source) / config_loader.default_run_env
    )
    base_env = str(Path(config_loader.conf_source) / config_loader.base_env)

    # Extract from OmegaConfigLoader source code
    paths = []
    # It is important to preserve the order. As Kedro gives default_run_env higher priority
    # That is, if a config is found in both environment, the LSP should return the default_run_env one.
    # The LSP start searching in default_run_env first, if there is match it will end eagerly.

    for base_path in [default_run_env, base_env]:
        tmp_paths = []
        for pattern in patterns:
            for each in config_loader._fs.glob(
                Path(f"{str(base_path)}/{pattern}").as_posix()
            ):
                if not config_loader._is_hidden(each):
                    tmp_paths.append(Path(each))
        paths = paths + list(set(tmp_paths))
    return paths


def _get_param_location(
    project_metadata: ProjectMetadata, word: str
) -> Optional[Location]:
    words = word.split("params:")
    if len(words) > 1:
        param = words[0]  # Top key
    else:
        return None
    log_to_output(f"Attempt to search `{param}` from parameters file")

    # TODO: cache -- we shouldn't have to re-read the file on every request
    params_paths = _get_conf_paths(project_metadata, "parameters")
    param_line_no = None

    for parameters_file in params_paths:
        with open(parameters_file) as f:
            for line_no, line in enumerate(f, 1):
                if line.startswith(param):
                    param_line_no = line_no
                    break
        if param_line_no is None:
            continue

        location = Location(
            uri=f"file://{parameters_file.resolve().as_posix()}",
            range=Range(
                start=Position(line=param_line_no - 1, character=0),
                end=Position(
                    line=param_line_no,
                    character=0,
                ),
            ),
        )
        return location

    if param_line_no is None:
        return


@LSP_SERVER.feature(TEXT_DOCUMENT_DEFINITION)
def definition(
    server: KedroLanguageServer, params: TextDocumentPositionParams, word=None
) -> Optional[List[Location]]:
    """Support Goto Definition for a dataset or parameter."""
    _check_project()
    if not server.is_kedro_project():
        return None

    def _query_parameter(document, word=None):
        if not word:
            word = document.word_at_position(
                params.position, RE_START_WORD, RE_END_WORD
            )

        log_for_lsp_debug(f"Query keyword for params: {word}")

        if word.startswith("params:"):
            param_location = _get_param_location(server.project_metadata, word)
            if param_location:
                log_for_lsp_debug(f"{param_location=}")
                return [param_location]

    def _query_catalog(document, word=None):
        if not word:
            word = document.word_at_position(params.position)
        catalog_paths = _get_conf_paths(server, "catalog")
        log_for_lsp_debug(f"Attempt to search `{word}` from catalog")
        log_for_lsp_debug(f"{catalog_paths=}")

        for catalog_path in catalog_paths:
            log_for_lsp_debug(f"    {catalog_path=}")
            catalog_conf = yaml.load(catalog_path.read_text(), Loader=SafeLineLoader)
            if not catalog_conf:
                continue
            if word in catalog_conf:
                line = catalog_conf[word]["__line__"]
                location = Location(
                    uri=f"file://{catalog_path}",
                    range=Range(
                        start=Position(line=line - 1, character=0),
                        end=Position(
                            line=line,
                            character=0,
                        ),
                    ),
                )
                log_for_lsp_debug(f"{location=}")
                return [location]

    if params:
        document: TextDocument = server.workspace.get_text_document(
            params.text_document.uri
        )
    else:
        document = None
    result = _query_parameter(document, word)
    if result:
        return result
    result = _query_catalog(document, word)
    if result:
        return result

    # If no result, return current location
    # This is a VSCode specific logic called Alternative Definition Command
    # By default, it triggers Go to Reference so it supports using mouse click for both directions
    # from pipline to config and config to pipeline
    uri = params.text_document.uri
    pos = params.position
    curr_pos = Position(line=pos.line, character=pos.character)
    return Location(uri=uri, range=Range(start=curr_pos, end=curr_pos))


def reference_location(path, line):
    location = Location(
        uri=f"file://{path.resolve().as_posix()}",
        range=Range(
            start=Position(line=line, character=0),
            end=Position(
                line=line + 1,
                character=0,
            ),
        ),
    )
    log_for_lsp_debug(f"{location=}")
    return location


@LSP_SERVER.feature(TEXT_DOCUMENT_REFERENCES)
def references(
    server: KedroLanguageServer, params: TextDocumentPositionParams
) -> Optional[List[Location]]:
    """Obtain all references to text."""
    _check_project()
    if not server.is_kedro_project():
        return None

    document: TextDocument = server.workspace.get_text_document(
        params.text_document.uri
    )
    word = document.word_at_position(params.position)

    log_for_lsp_debug(f"Query Reference keyword: {word}")
    word = word.strip(":")
    import importlib_resources
    from kedro.framework.project import PACKAGE_NAME

    # Find pipelines module
    importlib_resources.files(f"{PACKAGE_NAME}.pipelines")

    pipelines_package = importlib_resources.files(f"{PACKAGE_NAME}.pipelines")

    # Iterate on pipelines/<pipeline_name>/**/*pipeline*.py
    result = []
    for pipeline_dir in pipelines_package.iterdir():
        if not pipeline_dir.is_dir():
            continue
        # Use glob to find files matching the pattern recursively
        pipeline_files = glob.glob(f"{pipeline_dir}/**/*pipeline*.py", recursive=True)
        for pipeline_file in pipeline_files:
            # Read the line number and match keywords naively
            with open(pipeline_file) as f:
                for i, line in enumerate(f):
                    if word in line:
                        result.append((Path(pipeline_file), i))

    locations = []
    if result:
        for ref in result:
            locations.append(reference_location(ref[0], ref[1]))

    return locations if locations else None


@LSP_SERVER.feature(
    TEXT_DOCUMENT_COMPLETION, CompletionOptions(trigger_characters=['"'])
)
def completions(server: KedroLanguageServer, params: CompletionParams):
    """Placeholder
    i.e. params:  (completion)
    i.e. pipelines (completion)
    may actually just load it from DataCatalog
    """
    _check_project()
    # Experimental feature that only enabled if the flag is on.
    if not IS_EXPERIMENTAL:
        return None
    if not server.is_kedro_project():
        return None
    if not _is_pipeline(params.text_document.uri):
        return

    completion_items = []
    for item in server.dummy_catalog.list():
        completion_items.append(CompletionItem(label=item))

    return CompletionList(
        is_incomplete=False,
        items=completion_items,
    )


@LSP_SERVER.feature(TEXT_DOCUMENT_HOVER)
def hover(ls: KedroLanguageServer, params: HoverParams):
    import pprint

    pos = params.position
    document_uri = params.text_document.uri

    def _highlight(text, language="python"):
        return f"""```{language}
{text}
```"""

    if not _is_pipeline(document_uri):
        return
    document = ls.workspace.get_text_document(document_uri)
    catalog = ls.dummy_catalog

    word = document.word_at_position(params.position, RE_START_WORD, RE_END_WORD)
    if not word.startswith("params:"):
        # Search catalog
        ds = ls.dummy_catalog._datasets.get(word)
        if not ds:
            # Not a dataset or does not exist in catalog.yml
            return
        hover_content = catalog.conf_catalog.get(word)

    else:
        # parameters
        hover_content = ls.dummy_catalog.load(word)

    hover_content = pprint.pformat(hover_content, sort_dicts=False)
    highlight = _highlight(hover_content)

    return Hover(
        contents=MarkupContent(kind=MarkupKind.Markdown, value=highlight),
        range=Range(
            start=Position(line=pos.line, character=0),
            end=Position(line=pos.line + 1, character=0),
        ),
    )


@LSP_SERVER.feature(WORKSPACE_DID_CHANGE_CONFIGURATION)
def did_change_configuration(
    server: KedroLanguageServer,  # pylint: disable=unused-argument
    params: DidChangeConfigurationParams,  # pylint: disable=unused-argument
) -> None:
    """Implement event for workspace/didChangeConfiguration.
    Currently does nothing, but necessary for pygls.
    """


def _get_global_defaults():
    return {
        "path": GLOBAL_SETTINGS.get("path", []),
        "interpreter": GLOBAL_SETTINGS.get("interpreter", [sys.executable]),
        "args": GLOBAL_SETTINGS.get("args", []),
        "importStrategy": GLOBAL_SETTINGS.get("importStrategy", "useBundled"),
        "showNotifications": GLOBAL_SETTINGS.get("showNotifications", "off"),
        "environment": GLOBAL_SETTINGS.get("environment", ""),
    }


def _update_workspace_settings(settings):
    if not settings:
        key = os.getcwd()
        WORKSPACE_SETTINGS[key] = {
            "cwd": key,
            "workspaceFS": key,
            "workspace": uris.from_fs_path(key),
            **_get_global_defaults(),
        }
        return

    for setting in settings:
        key = uris.to_fs_path(setting["workspace"])
        WORKSPACE_SETTINGS[key] = {
            "cwd": key,
            **setting,
            "workspaceFS": key,
        }


def get_cwd(settings: Dict[str, Any], document: Optional[workspace.Document]) -> str:
    """Returns cwd for the given settings and document."""
    if settings["cwd"] == "${workspaceFolder}":
        return settings["workspaceFS"]

    if settings["cwd"] == "${fileDirname}":
        if document is not None:
            return os.fspath(pathlib.Path(document.path).parent)
        return settings["workspaceFS"]

    return settings["cwd"]


def _check_project():
    """This was a workaround because the server.workspace.root_path is not available at __init__ time.
    Ideally there should be some place to inject this logic after client send back the information.
    For now this function will be triggered for every LSP feature"""
    LSP_SERVER._set_project_with_workspace()


def log_for_lsp_debug(msg: str):
    """The log_to_output is too verbose for now, once the LSP is stable these log should
    be removed. Default level set as warning otherwise user cannot see the log and report
    back easily without touching configuration.
    """
    logger.warning(f"Kedro LSP: {msg}")


def _is_pipeline(uri):
    from pathlib import Path

    filename = Path(uri).name
    if "pipeline" in str(filename):
        return True
    return False


###### Commands
@LSP_SERVER.command("kedro.goToDefinitionFromFlowchart")
def definition_from_flowchart(ls, word):
    """Starts counting down and showing message synchronously.
    It will `block` the main thread, which can be tested by trying to show
    completion items.
    """
    word = word[0]
    result = definition(LSP_SERVER, params=None, word=word)
    return result

### End of  kedro-lsp


# *****************************************************
# Logging and notification.
# *****************************************************
def log_to_output(
    message: str, msg_type: lsp.MessageType = lsp.MessageType.Log
) -> None:
    LSP_SERVER.show_message_log(message, msg_type)


def log_error(message: str) -> None:
    LSP_SERVER.show_message_log(message, lsp.MessageType.Error)
    if os.getenv("LS_SHOW_NOTIFICATION", "off") in ["onError", "onWarning", "always"]:
        LSP_SERVER.show_message(message, lsp.MessageType.Error)


def log_warning(message: str) -> None:
    LSP_SERVER.show_message_log(message, lsp.MessageType.Warning)
    if os.getenv("LS_SHOW_NOTIFICATION", "off") in ["onWarning", "always"]:
        LSP_SERVER.show_message(message, lsp.MessageType.Warning)


def log_always(message: str) -> None:
    LSP_SERVER.show_message_log(message, lsp.MessageType.Info)
    if os.getenv("LS_SHOW_NOTIFICATION", "off") in ["always"]:
        LSP_SERVER.show_message(message, lsp.MessageType.Info)


# *****************************************************
# Start the server.
# *****************************************************
if __name__ == "__main__":
    LSP_SERVER.start_io()
