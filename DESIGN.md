- [Overview](#overview)
- [Supported Feature](#supported-feature)
- [Completion Provider](#completion-provider)
  - [Backend LSP Server](#backend-lsp-server)
  - [Client](#client)
    - [Dataset YAML schema validation](#dataset-yaml-schema-validation)
    - [User environment](#user-environment)
- [todo](#todo)
    - [lsp\_server.py](#lsp_serverpy)
- [Questions](#questions)


# Overview
This extension includes two components

# Supported Feature
- Cmd + Click (pipeline.py -> catalog.yml or parameters.yml)
- "Reference" from parameters.yml or catalog.yml -> pipeline.py
- Autocompletion (incomplete)
- schema validation via YAML extension

# Completion Provider

## Backend LSP Server
The LSP server is implemented in Python and the code is in `bundled`.

The most important logic is in `lsp_server.py`, the rest of the file is boilerplate code to allow the LSP communicate with the client properly (not the interesting bit).

notes:
- `editor.gotoLocation.alternativeDefinitionCommand` to define ctrl+click behavior

## Client
The client is implemented in `src`, and the most important part is in `extension.ts`.

1. `extension.ts`: This is the main entry point for a VS Code extension. It typically contains the activate and deactivate functions that VS Code calls when the extension is activated or deactivated

2. `package.json`

The extension bundles a few Python libraries such as `pygls` (Python Language Server Protocol implementation). It also relies on `vscode/ms-python` extension to select the proper Python intepreter.
### Dataset YAML schema validation
- via the Redhat YAML extension packaged through the contribution point in `package.json` as `yaml.schemas`.
- Alternatively, can use the `YamlValidation` contribution points
- https://github.com/Lona/vscode-github-actions/blob/master/src/yaml-support/yaml-schema.ts look at how other extension works

### User environment
The extension requires loading a Kedro project instead of just parsing configurations for few reasons:
- Project coded is needed to resolve `$resolver` properly
- The actual pipeline code is needed in order to build the lineage between `parameters.yml` and `pipeline.py`. Alternative is to hard code this but it will be very fragile.
- To support project settings defined in `settings.py`
- To support environment resolution. i.e. user can have `base`, `local`, `prod`. The extension need to know which environment the user is using in order to resolve properly.

todo: On the other hand, it's a heavy requirement for LSP to load a kedro project, this may also trigger connections with hooks etc and it should be avoided.


# Webview
The webview component is used to render the Kedro visualization within the VS Code extension. It is implemented using React and is bundled separately from the main extension code.

## Components

### KedroVizPanel
The `KedroVizPanel` class in [`src/webview/vizWebView.ts`](src/webview/vizWebView.ts) manages the webview panels. It includes methods to set up the HTML content for the webview, update the data, and handle theme changes.

- `_getHtmlForWebview(webview: vscode.Webview)`: Generates the HTML content for the webview, including linking to the necessary JavaScript and CSS files.
- `updateData(data: any)`: Sends a message to the webview to update the data.

### App
The `App` component in [`webview/src/App.jsx`](webview/src/App.jsx) is the main React component rendered in the webview. It uses the `KedroViz` library to display the visualization.

- `vscodeApi`: Acquires the VS Code API to communicate between the webview and the extension with `postMessage`.
- `onActionCallback`: Callback function to be invoked when the specified action is dispatched from Kedro-Viz e.g. `const action = { type: NODE_CLICK, payload: node }; onActionCallback(action);`

## Data fetching

We are using the VSCode API (`vscode.commands.executeCommand`) to run the LSP server command, which in turn uses the Kedro-Viz Python package to fetch Kedro project JSON data. This data is then rendered as a flowchart in the webview managed by the `KedroVizPanel` class in [`src/webview/vizWebView.ts`](src/webview/vizWebView.ts).


## Build and Bundle

- Configuration: The webview component is built and bundled using Vite, a modern frontend build tool. The configuration for Vite is defined in [`webview/vite.config.js`](webview/vite.config.js).
- Entry Point: The main entry point for the webview is [`webview/src/index.jsx`](webview/src/index.jsx).
- Install Commands: Installation of React App dependencies is managed by scripts in the root `package.json`
    - `npm run install:webview`: Installs the webview dependencies.
- Build Commands: The build process is managed by scripts in the root `package.json`
    - `npm run build:webview`: Builds the webview using Vite.
- Output: The build output is configured to be in the `dist` directory with assets in dist/assets
- Integration: The built assets are integrated into the webview by the `_getHtmlForWebview` method in [`src/webview/vizWebView.ts`](src/webview/vizWebView.ts).

# todo
- [] Static validation of `catalog.yml` against a defined JSON schema (planning to experiment with the JSON `kedro` provide and move that to `kedro-datasets` so it can supported different version easily)
- [] Support references of configuration -> maybe able to support refactor as well.
- [] `get_conf_paths` requires some extra inspection feature from `OmegaConfigloader` which doesn't exist yet.

```python
config["a"]["b"].source
>> {file: "abc.yml", line: 10, col: 4}

#### Python Interpreter
- `PythonExtension.api()` returns the interpreter information from `vscode/ms-python`


### Logging
- `lsp_runner.py` controls the traceback that get sent back into output channel (VS Code)


### Workspace settings
The settings is defined in `package.json` and some extra logic in `src/common/settings.ts`.

For example, user can update the Python interpreter path to have a global settings.

You will find this in `package.json`

```json
                "kedro-lsp.interpreter": {
                    "default": [],
                    "description": "When set to a path to python executable, extension will use that to launch the server and any subprocess.",
                    "scope": "resource",
                    "items": {
                        "type": "string"
                    },
                    "type": "array"
                }
```

### lsp_server.py
- `_check_project()` is a workaround to check the workspace path at the beginning of every LSP function. Ideally it should be VScode client passing this before KedroLanguageServer get init. It should be done in `initialise` but for some reason it doesn't work.
- ctrl + click on config should go to current location to trigger `editor.gotoLocation.alternativeDefinitionCommand`

# Questions
- Should it navigate to a resolved version (for read) or to the raw source code (for editing)? The former is easier to implement.