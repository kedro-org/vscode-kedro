# Kedro Navigation Pane - Design Spec

## Overview

Add a native VS Code TreeView-based navigation pane to the Kedro extension. The pane appears as a dedicated Kedro icon in the Activity Bar, containing three tree views: Configuration files (grouped by environment), Data Catalog (datasets grouped by pipeline), and Undefined Datasets (free inputs not defined in any catalog file).

The catalog and undefined dataset views use mock data initially, with interfaces designed for future LSP integration.

## Architecture

```
Activity Bar (Kedro Icon)
└── View Container: kedro-explorer
    ├── kedroConfigView      → ConfigTreeProvider
    ├── kedroCatalogView     → CatalogTreeProvider
    └── kedroUndefinedView   → UndefinedDatasetProvider
```

### Data Flow

- **ConfigTreeProvider**: Reads the `conf/` directory from the filesystem using the Kedro project path (from `kedro.kedroProjectPath` setting or workspace root). Groups files by environment folder (base, local, etc.). Refreshes on file system changes.
- **CatalogTreeProvider**: Consumes mock data shaped as `{ pipeline: string, datasets: { name: string, type: string }[] }[]`. Future: replace with LSP command `kedro.getCatalogTree`.
- **UndefinedDatasetProvider**: Consumes mock data shaped as `{ name: string, pipelines: string[] }[]`. Future: replace with LSP command `kedro.getFreeInputs`.

## Tree View Details

### 1. Configuration View (`kedroConfigView`)

Title: "Configuration"

Structure:
```
CONFIGURATION
├── base
│   ├── catalog.yml
│   ├── parameters.yml
│   ├── logging.yml
│   └── ...
├── local
│   ├── catalog.yml
│   ├── credentials.yml
│   └── ...
└── staging
    └── ...
```

Tree items:
- **Environment nodes** (collapsible): Folder name as label, folder icon, `TreeItemCollapsibleState.Expanded` for the first environment, `Collapsed` for the rest.
- **File nodes** (leaf): File name as label, file URI as `resourceUri` so VS Code shows the correct file icon. `command` set to `vscode.open` with the file URI.

Data source: `fs.readdir` on `<kedroProjectPath>/conf/`, then `fs.readdir` on each subdirectory. Filters to only show directories at the top level and files at the second level.

Refresh triggers:
- `kedro.refreshConfigView` command (manual)
- File watcher on `**/conf/**` (create/change/delete)

### 2. Data Catalog View (`kedroCatalogView`)

Title: "Data Catalog"

Structure:
```
DATA CATALOG
├── __default__ (3)
│   ├── companies          CSVDataset
│   ├── shuttles           ExcelDataset
│   └── reviews            CSVDataset
├── data_processing (2)
│   ├── preprocessed_companies    ParquetDataset
│   └── preprocessed_shuttles     ParquetDataset
└── data_science (2)
    ├── model_input_table         ParquetDataset
    └── regressor                 PickleDataset
```

Tree items:
- **Pipeline nodes** (collapsible): Pipeline name as label, dataset count as description. Uses a pipeline/folder icon.
- **Dataset nodes** (leaf): Dataset name as label, dataset type as description (short form, e.g., `CSVDataset` not `kedro_datasets.pandas.CSVDataset`). Uses a database/table icon.
  - `command`: Executes Go to Definition for the dataset name. Uses the existing LSP definition handler by opening a catalog file and triggering `vscode.executeDefinitionProvider`.

Mock data: Hardcoded array in `catalogTreeProvider.ts` representing a typical Kedro spaceflights project structure.

Future LSP interface:
```typescript
interface CatalogTreeData {
  pipelines: {
    name: string;
    datasets: {
      name: string;
      type: string;
    }[];
  }[];
}
```

### 3. Undefined Datasets View (`kedroUndefinedView`)

Title: "Undefined Datasets"

Structure:
```
UNDEFINED DATASETS
├── ⚠ raw_data
├── ⚠ intermediate_results
└── ⚠ model_metrics
```

Tree items:
- **Dataset nodes** (leaf): Dataset name as label, warning icon (`ThemeIcon('warning')`). Tooltip shows "Dataset used in pipeline but not defined in catalog".
  - `command`: Go to Definition (will navigate to pipeline Python code where referenced).

Mock data: Hardcoded array in `undefinedDatasetProvider.ts`.

Future LSP interface:
```typescript
interface UndefinedDataset {
  name: string;
  pipelines: string[];  // which pipelines reference this dataset
}
```

## File Structure

New files:
```
src/treeview/
├── configTreeProvider.ts       -- Configuration files tree provider
├── catalogTreeProvider.ts      -- Data Catalog tree provider (mock)
├── undefinedDatasetProvider.ts  -- Undefined datasets tree provider (mock)
├── treeItems.ts                -- Shared TreeItem subclasses
└── registerTreeViews.ts        -- Registration, refresh commands, wiring
```

## package.json Changes

### viewsContainers

```json
"viewsContainers": {
  "activitybar": [
    {
      "id": "kedro-explorer",
      "title": "Kedro",
      "icon": "assets/kedro-logo/kedro-icon.svg"
    }
  ]
}
```

Note: VS Code Activity Bar containers require an SVG file path (not icon fonts). The existing `kedro-logo` is a woff font only. We need to create a simple monochrome SVG icon at `assets/kedro-sidebar.svg` based on the Kedro logo. The SVG should be 24x24, monochrome (single color, typically dark), as VS Code will apply its own theming.

### views

```json
"views": {
  "kedro-explorer": [
    {
      "id": "kedroConfigView",
      "name": "Configuration"
    },
    {
      "id": "kedroCatalogView",
      "name": "Data Catalog"
    },
    {
      "id": "kedroUndefinedView",
      "name": "Undefined Datasets"
    }
  ]
}
```

### commands (additions)

```json
{
  "command": "kedro.refreshCatalogView",
  "title": "Refresh",
  "category": "kedro",
  "icon": "$(refresh)"
}
```

### menus

```json
"menus": {
  "view/title": [
    {
      "command": "kedro.refreshCatalogView",
      "when": "view == kedroConfigView || view == kedroCatalogView || view == kedroUndefinedView",
      "group": "navigation"
    }
  ]
}
```

## Integration Points

### extension.ts

In `registerCommandsAndEvents` (or called from it), invoke `registerTreeViews(context)` which:
1. Instantiates all three providers.
2. Calls `vscode.window.createTreeView(...)` for each.
3. Registers the refresh command.
4. Sets up file watchers for conf/ changes to auto-refresh the config view.

### Go to Definition (click handler)

Dataset tree items set their `command` property to trigger definition lookup:
```typescript
command: {
  command: 'kedro.sendDefinitionRequest',
  title: 'Go to Definition',
  arguments: [datasetName]
}
```

This reuses the existing `kedro.sendDefinitionRequest` command which calls `kedro.goToDefinitionFromFlowchart` on the LSP server.

### Kedro Project Path

The config tree provider needs the project path. It reads from:
1. `kedro.kedroProjectPath` setting (if set)
2. Workspace root (fallback)

When the project path changes (via `kedro.kedroProjectPath` or `kedro.selectProject`), all tree views refresh.

## Activation

Add `onView:kedroConfigView` to `activationEvents` in package.json so the extension activates when the sidebar is opened (in addition to existing activation events).

## Constraints

- Mock data for catalog and undefined datasets views. Real LSP integration is out of scope.
- No search/filter functionality in the initial version.
- No drag-and-drop or multi-select.
- Tree depth is fixed: environment > files for config, pipeline > datasets for catalog, flat for undefined.

## Future Work (out of scope)

- New LSP commands (`kedro.getCatalogTree`, `kedro.getFreeInputs`) to replace mock data
- Pipeline-aware free input detection (comparing pipeline node I/O against catalog)
- Search/filter within tree views
- Context menu actions (find references, copy name, open in Kedro Viz)
- Dataset preview/peek on hover
