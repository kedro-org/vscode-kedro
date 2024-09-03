// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import {
    selectEnvironment,
    executeServerCommand,
    executeServerDefinitionCommand,
    executeGetProjectDataCommand,
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
import { restartServer } from './common/server';
import { checkIfConfigurationChanged, getInterpreterFromSetting } from './common/settings';
import { loadServerDefaults } from './common/setup';
import { createStatusBar } from './common/status_bar';
import { getLSClientTraceLevel, installDependenciesIfNeeded } from './common/utilities';
import { createOutputChannel, onDidChangeConfiguration, registerCommand } from './common/vscodeapi';
import KedroVizPanel from './webview/vizWebView';

let lsClient: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await installDependenciesIfNeeded(context);

    // This is required to get server name and module. This should be
    // the first thing that we do in this extension.
    const serverInfo = loadServerDefaults();
    const serverName = serverInfo.name;
    const serverId = serverInfo.module;

    // Log Server information
    traceLog(`Name: ${serverInfo.name}`);
    traceLog(`Module: ${serverInfo.module}`);
    traceVerbose(`Full Server Info: ${JSON.stringify(serverInfo)}`);

    // List of commands
    const CMD_RESTART_SERVER = `${serverId}.restart`;
    const CMD_SELECT_ENV = `${serverId}.selectEnvironment`;
    const CMD_RUN_KEDRO_VIZ = `${serverId}.runKedroViz`;

    // Status Bar
    const statusBarItem = await createStatusBar(CMD_SELECT_ENV, serverId);
    context.subscriptions.push(statusBarItem);

    // Setup logging
    const outputChannel = createOutputChannel(serverName);
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

    context.subscriptions.push(
        registerCommand(CMD_RUN_KEDRO_VIZ, async () => {
            KedroVizPanel.createOrShow(context.extensionUri);
            const projectData = await executeGetProjectDataCommand(lsClient);
            KedroVizPanel.currentPanel?.updateData(projectData);
        }),
    );

    // Log Server information
    traceLog(`Name: ${serverInfo.name}`);
    traceLog(`Module: ${serverInfo.module}`);
    traceVerbose(`Full Server Info: ${JSON.stringify(serverInfo)}`);

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
        }),
        registerCommand(CMD_SELECT_ENV, async () => {
            const result = await selectEnvironment();
            runServer(result);
            if (result) {
                statusBarItem.text = `$(kedro-logo)` + ' ' + result.label;
            }
        }),
        registerCommand('pygls.server.executeCommand', async () => {
            await executeServerCommand(lsClient);
        }),
        registerCommand('kedro.sendDefinitionRequest', async (word) => {
            await executeServerDefinitionCommand(lsClient, word);
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
