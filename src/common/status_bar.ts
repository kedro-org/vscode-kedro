import * as vscode from 'vscode';
import {
    getWorkspaceSettings,
} from './settings';
import { getProjectRoot } from './utilities';

export async function createStatusBar(commandName: string, serverId:string): Promise<vscode.StatusBarItem>{
    // Create a status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = commandName;
    // https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration
    const projectRoot = await getProjectRoot();
    const workspaceSetting = await getWorkspaceSettings(serverId, projectRoot, true);
    let environment = 'base'; // todo: Assume base, better to take this from server as it could be changed in project settings.

    if (workspaceSetting.environment) {
    environment = workspaceSetting.environment;
    }

    statusBarItem.text = `$(kedro-logo) ${environment}`;
    statusBarItem.show();
    return statusBarItem;
}
