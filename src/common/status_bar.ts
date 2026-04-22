import * as path from 'path';
import * as vscode from 'vscode';
import {
    getWorkspaceSettings,
} from './settings';
import { getProjectRoot } from './utilities';

export async function createStatusBar(commandName: string, serverId: string): Promise<vscode.StatusBarItem> {
    // Create a status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = commandName;
    // https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration
    const projectRoot = await getProjectRoot();
    const workspaceSetting = await getWorkspaceSettings(serverId, projectRoot, true);
    let environment = 'local';

    if (workspaceSetting.environment) {
        environment = workspaceSetting.environment;
    }

    const projectName = workspaceSetting.kedroProjectPath
        ? path.basename(workspaceSetting.kedroProjectPath)
        : projectRoot.name;

    statusBarItem.text = `$(kedro-logo) ${projectName} | ${environment}`;
    statusBarItem.tooltip = `Kedro: ${projectName} (${environment})`;
    statusBarItem.show();
    return statusBarItem;
}

export function updateStatusBarProject(statusBarItem: vscode.StatusBarItem, projectPath: string, environment: string) {
    const projectName = path.basename(projectPath);
    statusBarItem.text = `$(kedro-logo) ${projectName} | ${environment}`;
    statusBarItem.tooltip = `Kedro: ${projectName} (${environment})`;
}
