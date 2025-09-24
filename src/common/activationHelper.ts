// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import {
    selectEnvironment,
    executeServerCommand,
    executeServerDefinitionCommand,
    setKedroProjectPath,
    filterPipelines,
} from './commands';

import * as vscode from 'vscode';
import { registerLogger, traceError, traceLog, traceVerbose } from './log/logging';
import { checkVersion, getInterpreterDetails, onDidChangePythonInterpreter, resolveInterpreter } from './python';
import { sendHeapEventWithMetadata } from './telemetry';
import { restartServer } from './server';
import { checkIfConfigurationChanged, getInterpreterFromSetting } from './settings';
import { setupKedroProjectFileWatchers } from './kedroProjectFileWatchers';
import { loadServerDefaults } from './setup';
import { createStatusBar } from './status_bar';
import { getLSClientTraceLevel, updateKedroVizPanel } from './utilities';
import { createOutputChannel, onDidChangeConfiguration, registerCommand } from './vscodeapi';
import KedroVizPanel from '../webview/vizWebView';
import { handleKedroViz } from '../webview/createOrShowKedroVizPanel';
import { LanguageClient } from 'vscode-languageclient/node';

let isFilterPipelinesCommandRegistered = false;

/**
 * Runs the language server based on current environment and interpreter settings.
 * Returns the updated lsClient reference.
 */
export const runServer = async (
    lsClient: LanguageClient | undefined,
    selectedEnvironment?: vscode.QuickPickItem,
): Promise<LanguageClient | undefined> => {
    const serverInfo = loadServerDefaults();
    const serverName = serverInfo.name;
    const serverId = serverInfo.module;

    const outputChannel = createOutputChannel(serverName);
    const interpreter = getInterpreterFromSetting(serverId);
    let env: string | undefined = selectedEnvironment?.label;

    if (interpreter && interpreter.length > 0) {
        if (checkVersion(await resolveInterpreter(interpreter))) {
            traceVerbose(`Using interpreter from ${serverInfo.module}.interpreter: ${interpreter.join(' ')}`);
            lsClient = await restartServer(serverId, serverName, outputChannel, lsClient, env);
        }
        return lsClient;
    }

    const interpreterDetails = await getInterpreterDetails();
    console.log('===============DEBUG============');
    console.log(interpreterDetails);
    console.log('===============DEBUG============');

    if (interpreterDetails.path) {
        traceVerbose(`Using interpreter from Python extension: ${interpreterDetails.path.join(' ')}`);
        lsClient = await restartServer(serverId, serverName, outputChannel, lsClient, env);
        return lsClient;
    }

    traceError(
        'Python interpreter missing:\r\n' +
            '[Option 1] Select python interpreter using the ms-python.python.\r\n' +
            `[Option 2] Set an interpreter using "${serverId}.interpreter" setting.\r\n` +
            'Please use Python 3.8 or greater.',
    );

    return lsClient;
};

/**
 * Registers commands, events, and sets up logging and status bar.
 * Accepts get/set functions for lsClient so that whenever runServer updates it,
 * we can update the stored reference as well.
 */
export const registerCommandsAndEvents = (
    context: vscode.ExtensionContext,
    getLSClient: () => LanguageClient | undefined,
    setLSClient: (client: LanguageClient | undefined) => void,
) => {
    const serverInfo = loadServerDefaults();
    const serverName = serverInfo.name;
    const serverId = serverInfo.module;

    const outputChannel = createOutputChannel(serverName);

    // List of commands
    const CMD_RESTART_SERVER = `${serverId}.restart`;
    const CMD_SELECT_ENV = `${serverId}.selectEnvironment`;
    const CMD_RUN_KEDRO_VIZ = `${serverId}.runKedroViz`;
    const CMD_DEFINITION_REQUEST = `${serverId}.sendDefinitionRequest`;
    const CMD_SHOW_OUTPUT_CHANNEL = `${serverId}.showOutputChannel`;
    const CMD_SET_PROJECT_PATH = `${serverId}.kedroProjectPath`;
    const CMD_FILTER_PIPELINES = `${serverId}.filterPipelines`;

    (async () => {
        // Status Bar
        const statusBarItem = await createStatusBar(CMD_SELECT_ENV, serverId);
        context.subscriptions.push(statusBarItem);

        // Setup logging
        context.subscriptions.push(outputChannel, registerLogger(outputChannel));

        const changeLogLevel = async (c: vscode.LogLevel, g: vscode.LogLevel) => {
            const level = getLSClientTraceLevel(c, g);
            await getLSClient()?.setTrace(level);
        };

        context.subscriptions.push(
            outputChannel.onDidChangeLogLevel(async (e) => {
                await changeLogLevel(e, vscode.env.logLevel);
            }),
            vscode.env.onDidChangeLogLevel(async (e) => {
                await changeLogLevel(outputChannel.logLevel, e);
            }),
        );

        traceLog(`Name: ${serverInfo.name}`);
        traceLog(`Module: ${serverInfo.module}`);
        traceVerbose(`Full Server Info: ${JSON.stringify(serverInfo)}`);

        context.subscriptions.push(
            onDidChangePythonInterpreter(async () => {
                const newClient = await runServer(getLSClient());
                setLSClient(newClient);
            }),
            onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
                // Handle autoReloadViz setting change specifically
                if (e.affectsConfiguration(`${serverId}.autoReloadViz`)) {
                    setupKedroProjectFileWatchers(context);
                }

                if (checkIfConfigurationChanged(e, serverId)) {
                    const newClient = await runServer(getLSClient());
                    setLSClient(newClient);
                }
            }),
            registerCommand(CMD_RESTART_SERVER, async () => {
                const newClient = await runServer(getLSClient());
                setLSClient(newClient);
                await sendHeapEventWithMetadata(CMD_RESTART_SERVER, context);

                // If KedroVizPanel is open, update the data on server restart
                if (KedroVizPanel.currentPanel) {
                    updateKedroVizPanel(getLSClient());
                }
            }),
            registerCommand(CMD_SELECT_ENV, async () => {
                const result = await selectEnvironment();
                const newClient = await runServer(getLSClient(), result);
                setLSClient(newClient);
                if (result) {
                    statusBarItem.text = `$(kedro-logo) base + ${result.label}`;
                }
                await sendHeapEventWithMetadata(CMD_SELECT_ENV, context);
            }),
            registerCommand('pygls.server.executeCommand', async () => {
                await executeServerCommand(getLSClient());
            }),
            registerCommand(CMD_DEFINITION_REQUEST, async (word) => {
                await executeServerDefinitionCommand(getLSClient(), word);
                await sendHeapEventWithMetadata(CMD_DEFINITION_REQUEST, context);
            }),
            registerCommand(CMD_RUN_KEDRO_VIZ, async () => {
                await handleKedroViz(context, getLSClient());

                // Register filter pipelines command only once
                if (!isFilterPipelinesCommandRegistered) {
                    // Register filter pipelines command after KedroVizPanel is created
                    context.subscriptions.push(
                        registerCommand(CMD_FILTER_PIPELINES, async () => {
                            await filterPipelines(getLSClient());
                            await sendHeapEventWithMetadata(CMD_FILTER_PIPELINES, context);
                        }),
                    );
                    isFilterPipelinesCommandRegistered = true;
                }
            }),
            registerCommand(CMD_SHOW_OUTPUT_CHANNEL, () => {
                outputChannel.show();
            }),
            registerCommand(CMD_SET_PROJECT_PATH, () => {
                setKedroProjectPath();
            }),
        );
    })();
};
