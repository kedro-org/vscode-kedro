import * as fs from 'fs';
import * as path from 'path';
import { QuickPickItem, window } from 'vscode';
import * as vscode from 'vscode';

import { getWorkspaceFolders } from './vscodeapi';
import { LanguageClient, State } from 'vscode-languageclient/node';
import { getKedroProjectPath, isKedroProject, updateKedroVizPanel } from './utilities';
export async function selectEnvironment() {
    let kedroProjectPath = await getKedroProjectPath();
    let kedroProjectRootDir: string | undefined = undefined;

    if (kedroProjectPath) {
        kedroProjectRootDir = kedroProjectPath;
    } else {
        let workspaces = getWorkspaceFolders();
        kedroProjectRootDir = workspaces[0].uri.fsPath; // Only pick the first workspace
    }

    const confDir = `${kedroProjectRootDir}/conf`;
    // Iterate the `conf` directory to get folder names
    const directories = fs
        .readdirSync(confDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    const envs: QuickPickItem[] = directories.filter((dir) => dir !== 'base').map((label) => ({ label }));

    const result = await window.showQuickPick(envs, {
        placeHolder: 'Select Kedro runtime environment',
    });

    return result;
}

export async function setKedroProjectPath() {
    const result = await vscode.window.showInputBox({
        placeHolder: 'Enter the Kedro Project Root Directory',
        prompt: 'Please provide the path to the Kedro project root directory',
        validateInput: async (value) => {
            if (!value) {
                return 'Path cannot be empty';
            }
            // Verify if path exists and is a Kedro project
            if (!(await isKedroProject(value))) {
                return 'Invalid Kedro project path. Please ensure it contains pyproject.toml';
            }
            return null;
        },
    });

    if (result) {
        // Create URI from the path
        const uri = vscode.Uri.file(result);

        // Get current workspace folders
        const currentFolders = vscode.workspace.workspaceFolders || [];

        // Check if the entered path is already part of any workspace folder
        const isPartOfWorkspace = currentFolders.some((folder) => {
            const folderPath = folder.uri.fsPath;
            return result.startsWith(folderPath) || folderPath.startsWith(result);
        });

        // If path is not part of workspace, add it as a new workspace folder
        if (!isPartOfWorkspace) {
            // Add new folder to workspace
            const success = await vscode.workspace.updateWorkspaceFolders(
                currentFolders.length,
                0,
                { uri: uri, name: path.basename(result) }, // New folder to add
            );

            if (!success) {
                vscode.window.showErrorMessage('Failed to add folder to workspace');
                return;
            }
        }

        // Update kedro configuration
        const config = vscode.workspace.getConfiguration('kedro');
        await config.update('kedroProjectPath', result, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage('Kedro project path updated successfully');
    }
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

export async function executeGetProjectDataCommand(
    lsClient: LanguageClient | undefined,
    pipelineName: string | undefined = undefined,
) {
    if (!lsClient || lsClient.state !== State.Running) {
        await vscode.window.showErrorMessage('There is no language server running.');
        return;
    }
    if (!lsClient.initializeResult) {
        await vscode.window.showErrorMessage('The Language Server failed to initialize.');
        return;
    }

    const commandName = 'kedro.getProjectData';
    logger.info(`executing command: '${commandName}'`);
    const result = await vscode.commands.executeCommand(commandName, pipelineName);
    return result;
}

export async function filterPipelines(lsClient?: LanguageClient) {
    try {
        const projectData: any = await executeGetProjectDataCommand(lsClient);
        const pipelineArray = projectData?.pipelines;

        if (!pipelineArray || !Array.isArray(pipelineArray) || !pipelineArray.length) {
            vscode.window.showInformationMessage('No pipelines found in this Kedro project.');
            return;
        }

        const pipelineItems = pipelineArray.map((p: any) => {
            return {
                label: p.id,
                description: p.name,
            };
        });

        const picked = await vscode.window.showQuickPick(pipelineItems, {
            placeHolder: 'Select a pipeline to filter...',
        });
        if (!picked) {
            // user canceled the pick
            return;
        }

        // Send the updated projectData to the webview
        updateKedroVizPanel(lsClient, picked.label);
    } catch (err) {
        vscode.window.showErrorMessage(
            `Error filtering pipelines: ${err instanceof Error ? err.message : String(err)}`,
        );
    }
}
