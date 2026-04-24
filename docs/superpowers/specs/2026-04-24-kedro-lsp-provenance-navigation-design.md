# Kedro LSP Provenance Navigation Design

## Overview

Add provenance-based YAML navigation to the Kedro VS Code extension so "Go to Definition" from Kedro config YAML jumps to the origin of the current effective value.

This design uses OmegaConf provenance as the primary path and keeps existing definition logic as fallback.

## Problem Statement

Current definition behavior for Kedro config relies on heuristics (line scanning and key matching). It does not consistently represent effective merged values across environments or layered config files.

The goal is to support YAML-to-YAML navigation based on resolved effective values for all Kedro config groups, with no user-facing noise on misses.

## Scope

In scope:
- YAML -> YAML navigation only (not Python -> YAML in this phase)
- All Kedro config groups loaded through `OmegaConfigLoader`
- Provenance-first definition path with legacy fallback
- Output-channel logging for provenance attempt/hit/fallback

Out of scope:
- Changes to dependency vendoring strategy
- New settings or notifications for provenance misses
- Replacing non-YAML definition behavior
- Full provenance history or interpolation provenance

## Product Decisions

- v1 priority is YAML navigation in Kedro config files.
- Config handling should be uniform across groups (no special-case by default for `parameters`, `catalog`, etc.).
- Missing provenance should silently fall back (no popup).
- Existing definition logic remains as fallback.
- Runtime behavior depends on the selected project interpreter.

## Architecture

`TEXT_DOCUMENT_DEFINITION` remains the entrypoint. The handler adds a new provenance path for Kedro config YAML documents and preserves existing branches as fallback.

Proposed internal functions in `bundled/tool/lsp_server.py`:

- `_is_conf_yaml(uri: str) -> bool`
  - Detects Kedro config YAML under `conf/**`.

- `_yaml_path_at_position(document: TextDocument, position: Position) -> Optional[list[Any]]`
  - Maps cursor position to a logical node path in the YAML structure.

- `_resolve_effective_config_for_uri(server: KedroLanguageServer, uri: str) -> Optional[Any]`
  - Uses current Kedro context and `OmegaConfigLoader` to resolve the effective config object for the active file's group.

- `_lookup_provenance_location(resolved_cfg: Any, path_tokens: list[Any]) -> Optional[Location]`
  - Traverses target node and calls `OmegaConf.get_provenance(...)`.
  - Converts file provenance (`source`, `line`, `column`) to LSP `Location`.

- `_definition_from_yaml_provenance(server, params, document) -> Optional[list[Location]]`
  - Orchestrates the provenance path and returns a single definition result when available.

Integration order inside `definition(...)`:
1. If document is Kedro config YAML, attempt provenance definition first.
2. If provenance returns a location, return it immediately.
3. If provenance misses/errors, log fallback reason and continue existing logic.
4. Preserve existing final `None` return to allow VS Code provider fallthrough.

## Navigation Semantics

- Navigate to the origin of the current effective value ("winning value"), aligned with OmegaConf merge semantics.
- For aliases/merges, provenance should reflect definition-site winner semantics provided by OmegaConf.
- If provenance is unavailable, non-file, or unresolved, do not notify user; continue fallback chain.

## Logging Design

Use output-channel logging only (no notifications):

- `provenance_nav_attempt`:
  - fields: `uri`, `line`, `character`
- `provenance_nav_hit`:
  - fields: `source`, `line`, `column`
- `provenance_nav_fallback`:
  - fields: `reason`, optional details
  - reason values:
    - `path_not_resolved`
    - `provenance_unavailable`
    - `provenance_non_file`
    - `exception`
- `legacy_nav_hit`:
  - field: `branch` (`parameter`, `catalog`, or `pipeline_from_catalog`)

Logs should be concise, machine-readable enough for debugging, and emitted once per request path.

## Backward and Forward Compatibility

- Do not change dependency vendoring in this phase.
- Use project interpreter/runtime as source of truth for Kedro + OmegaConf behavior.
- Keep legacy logic as fallback to preserve behavior when provenance is unavailable.

## Testing Strategy

### Unit tests (Python)

- Cursor/path extraction for:
  - top-level keys
  - nested mapping keys
  - list indices
- Provenance conversion:
  - file provenance -> valid `Location`
  - missing/non-file provenance -> `None` + fallback log
- Fallback chaining:
  - provenance miss/error still executes legacy branches

### Integration tests

- Merged config winner navigation:
  - from overridden YAML node -> origin in winning file
- Provenance miss:
  - no popup, no exception, legacy path still attempted
- Regression:
  - existing definition paths continue to function

### Manual verification

- Confirm output channel contains attempt/hit/fallback logs
- Confirm no new user-facing notification noise

## Rollout Gates

1. Correct winner-origin navigation for merged YAML config.
2. No regressions in existing definition behavior.
3. Fallback reason logs are present and actionable.
4. Interactive performance remains acceptable for definition requests.

## Risks and Mitigations

- Risk: Cursor-to-path extraction may fail on complex YAML layout.
  - Mitigation: fail safely to fallback; add targeted parsing tests.
- Risk: Runtime differences across interpreters.
  - Mitigation: keep fallback path and log reason codes for debugging.
- Risk: Ambiguity around document-to-config-group mapping.
  - Mitigation: use `OmegaConfigLoader` patterns and keep branch-local logging.

## Implementation Notes

- Keep changes surgical inside `bundled/tool/lsp_server.py` unless extraction improves clarity with minimal churn.
- Prefer additive helpers and explicit fallback rather than large refactors.
- Maintain current silent behavior contract for unresolved definitions.
