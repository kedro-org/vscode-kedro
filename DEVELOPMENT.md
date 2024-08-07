# Requirements

1. VS Code 1.64.0 or greater
2. Python 3.8 or greater
3. node >= 18.17.0
4. npm >= 8.19.0 (npm is installed with node, check npm version, use npm install -g npm@8.3.0 to update)
5. Python and YAML (RedHat) extension for VS Code
6. Create a new kedro project with pipelines kedro new



 # Dev Setup
 1. `make dev-install`
 2. `pip install -r requirements.txt` in `vscode-kedro`
 3. `pip install -r requirements.txt` in the test project (to make sure you can do `kedro run`)
 4. `make sign-off` to make sure the DCO will pass.
 5. `nox --session build_package` (it builds `bundled/libs`)


 # Release
 `make build` and manually upload it to VSCode MarketPlace and Open VSX Registry.

`make dev-install` installs a few different things:
- `npm install` for the VSCode frontend
- `pip isntall -r dev-requirements.txt` for the Python backend
- `nox --sesssion build_pakcage` for building `bundled/libs` locally

# Debug
You can start debug with `F5`, this should lauch an "Extension Development Host". If it doesn't check if there is a process stuck in the terminal, try to hit `Cmd + C` or `Ctrl + C` to terminate the `npm watch` process.
![alt text](docs/assets/image.png)

Once you have the extension host launched, you can start putting breakpoint in `lsp_server.py` to start development.
