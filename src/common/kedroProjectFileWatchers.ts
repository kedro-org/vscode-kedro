import * as vscode from 'vscode';
import * as path from 'path';
import { traceLog } from './log/logging';
import KedroVizPanel from '../webview/vizWebView';

let isRestartInProgress = false;
let watchers: vscode.FileSystemWatcher[] = [];

/**
 * Disposes of all existing file watchers
 */
export function disposeKedroProjectFileWatchers(): void {
    watchers.forEach(watcher => watcher.dispose());
    watchers = [];
    traceLog('Kedro file watchers disposed');
}

/**
 * Sets up file watchers in the Kedro project
 * @param context Extension context for managing subscriptions
 */
export function setupKedroProjectFileWatchers(context: vscode.ExtensionContext): void {
    // Dispose of existing watchers first
    disposeKedroProjectFileWatchers();

    // Check if auto reload is enabled
    const config = vscode.workspace.getConfiguration('kedro');
    const autoReloadEnabled = config.get<boolean>('autoReloadViz', false);

    if (!autoReloadEnabled) {
        traceLog('Auto reload is disabled, skipping file watchers setup');
        return;
    }

    // Watch for Kedro-specific files that affect the pipeline structure
    const kedroConfigWatcher = vscode.workspace.createFileSystemWatcher('**/conf/**/*.{yml,yaml}');
    const pipelinesFolderWatcher = vscode.workspace.createFileSystemWatcher('**/pipelines/**/*.py');
    const pythonCatalogWatcher = vscode.workspace.createFileSystemWatcher('**/catalog*.py');

    const handleFileChange = (uri: vscode.Uri, changeType: string) => {
        traceLog(`${changeType}: ${uri.fsPath}`);
        handleKedroProjectChange(changeType);
    };

    // Set up change listeners
    kedroConfigWatcher.onDidChange((uri) => handleFileChange(uri, 'Config changed'));
    pipelinesFolderWatcher.onDidChange((uri) => handleFileChange(uri, 'Pipeline code changed'));
    pythonCatalogWatcher.onDidChange((uri) => handleFileChange(uri, 'Python catalog changed'));

    // Store watchers for later disposal and register for cleanup
    watchers = [kedroConfigWatcher, pipelinesFolderWatcher, pythonCatalogWatcher];
    context.subscriptions.push(...watchers);

    traceLog('Kedro file watchers initialized');
}

/**
 * Handler for Kedro project file changes, Also prevents overlapping server restarts
 */
async function handleKedroProjectChange(changeType: string): Promise<void> {
    // Only update if KedroViz panel is currently open
    if (!KedroVizPanel.currentPanel) {
        traceLog('KedroViz panel not open, skipping update');
        return;
    }

    // If restart is already in progress, ignore this change
    if (isRestartInProgress) {
        traceLog(`Server restart already in progress, ignoring ${changeType}`);
        return;
    }

    try {
        isRestartInProgress = true;
        traceLog(`Updating KedroViz panel due to ${changeType}`);

        // Restart the language server to pick up changes
        await vscode.commands.executeCommand('kedro.restart');

        traceLog('Kedro server restarted successfully');
    } catch (restartError) {
        traceLog(`Server restart failed: ${restartError}`);
    } finally {
        isRestartInProgress = false;
    }
}
