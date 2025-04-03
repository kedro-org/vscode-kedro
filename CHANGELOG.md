# Change Log

# 0.0.9
## Major changes and new features
- test

# 0.0.8
## Major changes and new features
- Support settings of custom project path in Kedro Extension.
- Validate dataset classes in catalog using LSP.
- Enable primary tool bar with toolbarOptions.
- Remove the old dependencies with yaml schema.

# 0.2.3
## Major changes and new features
- Silenced the server initialisation error when working on a non-Kedro project.
- Improved UX: when clicking on the visualisation it will not refocus every time.

## Bug fix
- Fixed Windows path issue.

# 0.2.2
- Reduce size of packaged artifacts.

# 0.2.1
- Added a new command `Kedro: Show logs` for troubleshooting.

# 0.2.0 (pre-release)
## Major changes and new features
- Integrated Kedro-Viz flowchart into the extension with a new command `Kedro: Run Kedro Viz`.
- Modified the extension to search pipelines from all `<package_name>/pipelines` folder.
- Added new command `Kedro: Show Logs`

## Bug fix
- `Select Environment` actions now update the run environment instead of base.
- Modified status bar to show both environments, i.e.`base + local`, and `base` is no longer selectable.
- Fixed a bug where `Find reference` return too many matches for catalog dataset, it returns only exact matches now.
- Fixed a bug where namespace dataset navigation is not working properly
- Fixed a bug where navigating on nested parameters should go to the top level key.
- Modify the extension to search pipelines from all <package_name>/pipelines folder.


# 0.1.0
- Expanded pipeline discovery to support `*pipeline*.py` patterns and improved handling of nested subdirectories.
- Add new extension setting `Kedro: Environment` to change the configuration environment.
- Add new command `kedro: Select Environment` to change the configuration environment.
- `Go to Definition` now search `default_run_env` first.
- Add Kedro Icon and Status bar to select environment.
- Fix a bug that cause server panic when config is empty.

# 0.0.3
- Add catalog config preview for mouse hover.

# 0.0.2
- Fix a **startup** error bug.

# 0.0.1
- Support basic go to definition
