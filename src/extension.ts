// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import {
    selectEnvironment,
    executeServerCommand,
    executeServerDefinitionCommand,
    setKedroProjectPath,
} from './common/commands';

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { registerLogger, traceError, traceLog, traceVerbose } from './common/log/logging';
import {
    checkVersion,
    getInterpreterDetails,
    initializePython,
    onDidChangePythonInterpreter,
    resolveInterpreter,
} from './common/python';
import { sendHeapEventWithMetadata } from './common/telemetry';
import { restartServer } from './common/server';
import { checkIfConfigurationChanged, getInterpreterFromSetting } from './common/settings';
import { loadServerDefaults } from './common/setup';
import { createStatusBar } from './common/status_bar';
import {
    getLSClientTraceLevel,
    updateKedroVizPanel,
    checkKedroProjectConsent,
    installTelemetryDependenciesIfNeeded,
    isKedroProject,
} from './common/utilities';
import { createOutputChannel, onDidChangeConfiguration, registerCommand } from './common/vscodeapi';
import KedroVizPanel from './webview/vizWebView';
import { handleKedroViz } from './webview/createOrShowKedroVizPanel';

let lsClient: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // This is required to get server name and module. This should be
    // the first thing that we do in this extension.
    const serverInfo = loadServerDefaults();
    const serverName = serverInfo.name;
    const serverId = serverInfo.module;

    // Setup logging
    const outputChannel = createOutputChannel(serverName);

    const config = vscode.workspace.getConfiguration('kedro');
    let kedroProjectPath = config.get<string>('kedroProjectPath', '');

    const runServer = async (selectedEnvironment?: vscode.QuickPickItem) => {
        const interpreter = getInterpreterFromSetting(serverId);
        let env = undefined;
        if (selectedEnvironment) {
            env = selectedEnvironment.label;
        }

        if (interpreter && interpreter.length > 0) {
            if (checkVersion(await resolveInterpreter(interpreter))) {
                traceVerbose(`Using interpreter from ${serverInfo.module}.interpreter: ${interpreter.join(' ')}`);
                lsClient = await restartServer(serverId, serverName, outputChannel, lsClient, env);
            }
            return;
        }

        const interpreterDetails = await getInterpreterDetails();
        console.log('===============DEBUG============');
        console.log(interpreterDetails);
        console.log('===============DEBUG============');

        if (interpreterDetails.path) {
            traceVerbose(`Using interpreter from Python extension: ${interpreterDetails.path.join(' ')}`);
            lsClient = await restartServer(serverId, serverName, outputChannel, lsClient, env);
            return;
        }

        traceError(
            'Python interpreter missing:\r\n' +
                '[Option 1] Select python interpreter using the ms-python.python.\r\n' +
                `[Option 2] Set an interpreter using "${serverId}.interpreter" setting.\r\n` +
                'Please use Python 3.8 or greater.',
        );
    };

    if (kedroProjectPath && kedroProjectPath.trim() !== '') {
        // User provided a Kedro project path in settings
        if (await isKedroProject(kedroProjectPath)) {
            traceLog(`Using Kedro project path from settings: ${kedroProjectPath}`);
        } else {
            // The user set a path, but it's not a valid Kedro project
            traceError(`The provided Kedro project path (${kedroProjectPath}) is not a Kedro project.`);
            return;
        }
    } else {
        // No project path set, fallback to checking workspace
        if (await isKedroProject()) {
            // If a Kedro project is detected in the workspace root,
            // we can determine that path from the first workspace folder
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                kedroProjectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                traceLog(`Detected Kedro project at workspace root: ${kedroProjectPath}`);
            } else {
                traceError('No workspace folder found, cannot determine Kedro project path.');
                return;
            }
        } else {
            // Not a Kedro project and no path provided
            console.log('Kedro VSCode extension: No Kedro project detected and no project path set.');
            traceLog('No Kedro project detected and no kedro.projectPath set. Extension deactivated.');

            context.subscriptions.push(
                onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
                    if (checkIfConfigurationChanged(e, serverId)) {
                        // Clean up existing
                        if (lsClient) {
                            await lsClient.stop();
                        }
                        await runServer();
                    }
                }),
                registerCommand('kedro.kedroProjectPath', async () => {
                    setKedroProjectPath();
                }),
            );

            return;
        }
    }

    await installTelemetryDependenciesIfNeeded(context);

    // Check for consent in the Kedro Project
    const consent = await checkKedroProjectConsent(context);

    // Log Server information
    traceLog(`Name: ${serverInfo.name}`);
    traceLog(`Module: ${serverInfo.module}`);
    traceVerbose(`Full Server Info: ${JSON.stringify(serverInfo)}`);

    // List of commands
    const CMD_RESTART_SERVER = `${serverId}.restart`;
    const CMD_SELECT_ENV = `${serverId}.selectEnvironment`;
    const CMD_RUN_KEDRO_VIZ = `${serverId}.runKedroViz`;
    const CMD_DEFINITION_REQUEST = `${serverId}.sendDefinitionRequest`;
    const CMD_SHOW_OUTPUT_CHANNEL = `${serverId}.showOutputChannel`;
    const CMD_SET_PROJECT_PATH = `${serverId}.kedroProjectPath`;

    // Status Bar
    const statusBarItem = await createStatusBar(CMD_SELECT_ENV, serverId);
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(outputChannel, registerLogger(outputChannel));

    const changeLogLevel = async (c: vscode.LogLevel, g: vscode.LogLevel) => {
        const level = getLSClientTraceLevel(c, g);
        await lsClient?.setTrace(level);
    };

    context.subscriptions.push(
        outputChannel.onDidChangeLogLevel(async (e) => {
            await changeLogLevel(e, vscode.env.logLevel);
        }),
        vscode.env.onDidChangeLogLevel(async (e) => {
            await changeLogLevel(outputChannel.logLevel, e);
        }),
    );

    // Log Server information
    traceLog(`Name: ${serverInfo.name}`);
    traceLog(`Module: ${serverInfo.module}`);
    traceVerbose(`Full Server Info: ${JSON.stringify(serverInfo)}`);

    context.subscriptions.push(
        onDidChangePythonInterpreter(async () => {
            await runServer();
        }),
        onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
            if (checkIfConfigurationChanged(e, serverId)) {
                await runServer();
            }
        }),
        registerCommand(CMD_RESTART_SERVER, async () => {
            await runServer();
            await sendHeapEventWithMetadata(CMD_RESTART_SERVER, context);

            // If KedroVizPanel is open, update the data on server restart
            if (KedroVizPanel.currentPanel) {
                updateKedroVizPanel(lsClient);
            }
        }),
        registerCommand(CMD_SELECT_ENV, async () => {
            const result = await selectEnvironment();
            runServer(result);
            if (result) {
                statusBarItem.text = `$(kedro-logo) base + ${result.label}`;
            }
            await sendHeapEventWithMetadata(CMD_SELECT_ENV, context);
        }),
        registerCommand('pygls.server.executeCommand', async () => {
            await executeServerCommand(lsClient);
        }),
        registerCommand(CMD_DEFINITION_REQUEST, async (word) => {
            await executeServerDefinitionCommand(lsClient, word);
            await sendHeapEventWithMetadata(CMD_DEFINITION_REQUEST, context);
        }),
        registerCommand(CMD_RUN_KEDRO_VIZ, async () => {
            await handleKedroViz(context, lsClient);
        }),
        registerCommand(CMD_SHOW_OUTPUT_CHANNEL, () => {
            outputChannel.show();
        }),
        registerCommand(CMD_SET_PROJECT_PATH, () => {
            setKedroProjectPath();
        }),
    );

    setImmediate(async () => {
        const interpreter = getInterpreterFromSetting(serverId);
        if (interpreter === undefined || interpreter.length === 0) {
            traceLog(`Python extension loading`);
            traceLog(`Python Interpreter: ${interpreter}`);
            await initializePython(context.subscriptions);
            traceLog(`Python extension loaded`);
        } else {
            await runServer();
        }
    });
}

export async function deactivate(): Promise<void> {
    if (lsClient) {
        await lsClient.stop();
    }
}
