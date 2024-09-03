# vscode-kedro
The extension integrates [Kedro](https://github.com/kedro-org/kedro) projects with Visual Studio Code, providing features like enhanced code navigation and autocompletion for seamless development.

If you encounter issue, report it in [Github](https://github.com/kedro-org/vscode-kedro/issues) or [Slack](https://slack.kedro.org), we will try to fix ASAP.


## Requirements
1. VS Code 1.64.0 or greater
2. Python extension for VS Code
3. Kedro Project >= 0.19

## How to use this extension
1. Install `Kedro` from the extension
2. Select the correct Python interpreter that you use to run the Kedro project with the `> Python: select interpreter` command

p.s. If you can `kedro run` with the environment, you are good to go.

The extension requires `bootstrap_project` in Kedro, you need to make sure you can do `kedro run` without getting any immediate error, otherwise you may get a server panic error.

## Settings
### Change Configuration Environment
By default, the extension references the configuration loader's base_env (typically `base`). To change the directory where the extension looks for configurations, the extension provides 3 different ways to do this:

1. Click on the Kedro Icon in the status bar (bottom right)
 ![Status Bar](assets/status-bar.png)
2. Use Command (`Cmd` + `Shift` + `P`) and choose `kedro: Select Environment`
3. [Change default environment](assets/settings_environment.png)


## How to restart a server if there are error
Click `Output` and select `Kedro` from the dropdown list. It may gives you some hints and report back if you think this is a bug.

Hit `Cmd` + `Shift` + `P` to open the VSCode command, look for `kedro: restart server` in case it's panic.

## Assumptions
### Configuration Source
Currently, the extension assume the source of configuration is in the `base_env` defined by the config loader (if you didn't speficy, [usually it is `conf/base`](https://docs.kedro.org/en/stable/configuration/configuration_basics.html#configuration-loading)).

This mean that if the configuration is overrided by the `default_run_env`(usually it is `local`), the extension may fails to resolve to the correct location.

### Pipeline Discovery
The extension follows Kedro [pipeline autodiscovery mechanism](https://docs.kedro.org/en/stable/nodes_and_pipelines/pipeline_registry.html#pipeline-autodiscovery). It means that in general it is looking for modular pipelines structure, i.e. `<src/package/pipelines/<pipeline>`. It can be visualised as follows:
```
.
├── conf
│   ├── base
│   └── local
├── notebooks
├── src
│   └── demo
│       ├── pipelines
│           ├── first_pipeline
│           └── second_pipeline

```

## Visualisation with Kedro-Viz
To visualize Kedro project within Kedro extension with the help of inbuilt pipeline visualisation tool Kedro-Viz.
Use Command (`Cmd` + `Shift` + `P`) and choose `kedro: Run Kedro Viz`
![start kedro viz](assets/viz-vsc-start.gif)


# Feature
## Go to Definition from pipeline.py to configuration files
Use `Cmd` (Mac)/ `Ctrl` (Window) + `Click` or `F12` to trigger `Go to Definition`
![go to definition](assets/lsp-go-to-definition.gif)

## Go to Reference from configuration files to pipeline.py
- `Cmd` or `Ctrl` (Window) + `Click` on the definition.
- Use `Find Reference`
- Use the shortcut `Shift` + `F12`
![find reference](assets/lsp-find-reference.gif)

**Note:** You can find pipeline reference in all the files containing "pipeline" in their names, even in nested subdirectories.
```
- pipelines
  - sub_pipeline
    - pipeline_data_processing.py
    - sub_pipeline_1
        - pipeline_data_processing_1.py
```

## Autocompletion in Python
Type `"` in any `pipeline.py` and it should trigger the autocompletion list.
![autocompletion](assets/lsp-autocompletion.gif)

## Schema Validation
![schema validation](assets/lsp-schema-validation.gif)

## Hover
Just hover your mouse over any `params:`, datasets or hit the command `Show or Focus Hover`
![hover](assets/lsp-hover.gif)

## Flowchart to Editor navigation

Clicking on a node in flowchart navigate to the corresponding node function in the code.
![navigation to node function](assets/viz-vsc-nav-function-node.gif)


Clicking on a data node in flowchart navigate to the corresponding dataset yaml file.
![navigation to dataset](assets/viz-vsc-nav-data-node.gif)
