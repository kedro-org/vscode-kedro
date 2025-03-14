## Set Custom Kedro Project Path

You can specify a custom path to your Kedro project root directory in one of two ways:

1. **Using the Command Palette**:
   - Press `Cmd` + `Shift` + `P` (on macOS) or `Ctrl` + `Shift` + `P` (on Windows/Linux)
   - Type and select `Kedro: Set Project Path`
   - Enter the absolute path to your Kedro project root directory
   - The extension will validate if it's a valid Kedro project by checking for `pyproject.toml`

2. **Using Settings**:
   - Open VS Code Settings (File > Preferences > Settings)
   - Search for "Kedro Project Path"
   - Enter the absolute path to your Kedro project root directory in the `kedro.kedroProjectPath` setting

The extension will:
- Validate that the provided path contains a valid Kedro project
- Add the project folder to your workspace if it's not already included
- Use this path as the root directory for all Kedro-related features

**Note:** The project path must point to a directory containing a valid Kedro project with a `pyproject.toml` file that includes the `[tool.kedro]` section.

Example:
```
{
    "kedro.kedroProjectPath": "/absolute/path/to/your/kedro-project"
}
```