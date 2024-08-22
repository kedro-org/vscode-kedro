// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { selectEnvironment, executeServerCommand, executeServerDefinitionCommand } from './common/commands';
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
import { getLSClientTraceLevel } from './common/utilities';
import { createOutputChannel, onDidChangeConfiguration, registerCommand } from './common/vscodeapi';
import KedroVizPanel from './webview/vizWebView';
import { runKedroVizServer } from './webview/vizServer';

let lsClient: LanguageClient | undefined;
let kedroVizProcess: any;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
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
        vscode.commands.registerCommand('kedro.runKedroViz', () => {
            KedroVizPanel.createOrShow(context.extensionUri, lsClient);
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

        // Start kedro viz server
        if (kedroVizProcess) {
            process.kill(-kedroVizProcess.pid);
        }
        kedroVizProcess = await runKedroVizServer();

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
        registerCommand('kedro.sendDefinitionRequest', async () => {
            await executeServerDefinitionCommand(lsClient);
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
    if (kedroVizProcess) {
        process.kill(-kedroVizProcess.pid);
        kedroVizProcess = null; // Reset the reference after killing the process
    }
}
