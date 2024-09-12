# Change Log


# 0.2.0
- `Select Environment` actions now update the run environment instead of base.
- Modified status bar to show both environments, i.e.`base + local`, and `base` is no longer selectable.
- Fixed a minor bug where status bar showing incorrect text, i.e. it shows `prod` insteadf of `base + prod`.

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