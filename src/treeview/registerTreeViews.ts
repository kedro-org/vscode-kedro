import * as vscode from 'vscode';
import { ConfigTreeProvider } from './configTreeProvider';
import { CatalogTreeProvider } from './catalogTreeProvider';
import { UndefinedDatasetProvider } from './undefinedDatasetProvider';
import { getKedroProjectPath } from '../common/utilities';
import { registerCommand } from '../common/vscodeapi';

function resolveInitialProjectPath(configuredPath: string | undefined): string | undefined {
    if (configuredPath && configuredPath.trim() !== '') {
        return configuredPath;
    }
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export async function registerTreeViews(context: vscode.ExtensionContext): Promise<void> {
    const configuredProjectPath = await getKedroProjectPath();
    const projectPath = resolveInitialProjectPath(configuredProjectPath);

    const configProvider = new ConfigTreeProvider(projectPath || undefined);
    const catalogProvider = new CatalogTreeProvider(projectPath || undefined);
    const undefinedProvider = new UndefinedDatasetProvider();

    context.subscriptions.push(
        vscode.window.createTreeView('kedroConfigView', {
            treeDataProvider: configProvider,
            showCollapseAll: true,
        }),
        vscode.window.createTreeView('kedroCatalogView', {
            treeDataProvider: catalogProvider,
            showCollapseAll: true,
        }),
        vscode.window.createTreeView('kedroUndefinedView', {
            treeDataProvider: undefinedProvider,
        }),
    );

    context.subscriptions.push(
        registerCommand('kedro.refreshCatalogView', () => {
            configProvider.refresh();
            catalogProvider.refresh();
            undefinedProvider.refresh();
        }),
    );

    const confWatcher = vscode.workspace.createFileSystemWatcher('**/conf/**');
    confWatcher.onDidChange(() => configProvider.refresh());
    confWatcher.onDidCreate(() => configProvider.refresh());
    confWatcher.onDidDelete(() => configProvider.refresh());
    context.subscriptions.push(confWatcher);

    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('kedro.kedroProjectPath')) {
            getKedroProjectPath().then((newPath) => {
                const resolvedPath = resolveInitialProjectPath(newPath);
                if (resolvedPath) {
                    configProvider.setProjectPath(resolvedPath);
                    catalogProvider.setProjectPath(resolvedPath);
                }
            });
        }
    });
}
