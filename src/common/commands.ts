import * as fs from 'fs';
import { QuickPickItem, window } from 'vscode';
import * as vscode from 'vscode';

import { getWorkspaceFolders } from './vscodeapi';
import { LanguageClient, LanguageClientOptions, ServerOptions, State, integer } from 'vscode-languageclient/node';
export async function selectEnvironment() {
    let workspaces = getWorkspaceFolders();
    const root_dir = workspaces[0].uri.fsPath; // Only pick the first workspace
    const confDir = `${root_dir}/conf`;
    // Iterate the `conf` directory to get folder names
    const directories = fs
        .readdirSync(confDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    const envs: QuickPickItem[] = directories.filter(dir => dir !== 'base').map((label) => ({ label }));

    const result = await window.showQuickPick(envs, {
        placeHolder: 'Select Kedro runtime environment',
    });

    return result;
}
let logger: vscode.LogOutputChannel;

/**
 * Execute a command provided by the language server.
 */
logger = vscode.window.createOutputChannel('pygls', { log: true });

export async function executeServerCommand(lsClient: LanguageClient | undefined) {
    if (!lsClient || lsClient.state !== State.Running) {
        await vscode.window.showErrorMessage('There is no language server running.');
        return;
    }
    if (!lsClient.initializeResult) {
        await vscode.window.showErrorMessage('The Language Server fail to initialise.');
        return;
    }

    const knownCommands = lsClient.initializeResult.capabilities.executeCommandProvider?.commands;
    if (!knownCommands || knownCommands.length === 0) {
        const info = lsClient.initializeResult.serverInfo;
        const name = info?.name || 'Server';
        const version = info?.version || '';

        await vscode.window.showInformationMessage(`${name} ${version} does not implement any commands.`);
        return;
    }

    const commandName = await vscode.window.showQuickPick(knownCommands, { canPickMany: false });
    if (!commandName) {
        return;
    }
    logger.info(`executing command: '${commandName}'`);

    const result = await vscode.commands.executeCommand(
        commandName /* if your command accepts arguments you can pass them here */,
    );
    logger.info(`${commandName} result: ${JSON.stringify(result, undefined, 2)}`);
}

export async function executeServerDefinitionCommand(lsClient: LanguageClient | undefined, word?: string | undefined) {
    if (!lsClient || lsClient.state !== State.Running) {
        await vscode.window.showErrorMessage('There is no language server running.');
        return;
    }
    if (!lsClient.initializeResult) {
        await vscode.window.showErrorMessage('The Language Server fail to initialise.');
        return;
    }

    const commandName = 'kedro.goToDefinitionFromFlowchart';
    let target: any = word;
    if (!target) {
        target = await window.showInputBox({
            placeHolder: 'Type the name of the dataset/parameters, i.e. companies',
        });
    }

    logger.info(`executing command: '${commandName}'`);

    const result: any[] | undefined = await vscode.commands.executeCommand(
        commandName /* if your command accepts arguments you can pass them here */,
        target,
    );
    logger.info(`${commandName} result: ${JSON.stringify(result, undefined, 2)}`);
    if (result && result.length > 0) {
        const location = result[0];
        const uri: vscode.Uri = vscode.Uri.parse(location.uri);
        const range = location.range;

        vscode.window.showTextDocument(uri, {
            selection: range,
            viewColumn: vscode.ViewColumn.One,
        });
    }
}

export async function executeGetProjectDataCommand(lsClient: LanguageClient | undefined) {
    if (!lsClient || lsClient.state !== State.Running) {
        await vscode.window.showErrorMessage('There is no language server running.');
        return;
    }
    if (!lsClient.initializeResult) {
        await vscode.window.showErrorMessage('The Language Server fail to initialise.');
        return;
    }

    const commandName = 'kedro.getProjectData';
    logger.info(`executing command: '${commandName}'`);
    const result = await vscode.commands.executeCommand(commandName);
    return result;
}

