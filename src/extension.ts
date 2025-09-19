// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { traceError, traceLog, traceVerbose } from './common/log/logging';
import { initializePython } from './common/python';
import { setupKedroProjectFileWatchers } from './common/kedroProjectFileWatchers';

import { getInterpreterFromSetting } from './common/settings';
import { loadServerDefaults } from './common/setup';

import {
    checkKedroProjectConsent,
    installTelemetryDependenciesIfNeeded,
    isKedroProject,
    getKedroProjectPath,
} from './common/utilities';

import { runServer, registerCommandsAndEvents } from './common/activationHelper';

let lsClient: LanguageClient | undefined;
let isCommandsAndEventsRegistered = false;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // This is required to get server name and module. This should be
    // the first thing that we do in this extension.
    const serverInfo = loadServerDefaults();
    const serverId = serverInfo.module;

    let kedroProjectPath = await getKedroProjectPath();

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

            if (!isCommandsAndEventsRegistered) {
                // Register all commands and events
                registerCommandsAndEvents(
                    context,
                    () => lsClient,
                    (newClient) => {
                        lsClient = newClient;
                    },
                );
                isCommandsAndEventsRegistered = true;
            }
            return;
        }
    }

    setupKedroProjectFileWatchers(context);

    await installTelemetryDependenciesIfNeeded(context);

    // Check for consent in the Kedro Project
    const consent = await checkKedroProjectConsent(context);

    // Log Server information
    traceLog(`Name: ${serverInfo.name}`);
    traceLog(`Module: ${serverInfo.module}`);
    traceVerbose(`Full Server Info: ${JSON.stringify(serverInfo)}`);

    if (!isCommandsAndEventsRegistered) {
        // Register all commands and events
        registerCommandsAndEvents(
            context,
            () => lsClient,
            (newClient) => {
                lsClient = newClient;
            },
        );
        isCommandsAndEventsRegistered = true;
    }

    setImmediate(async () => {
        const interpreter = getInterpreterFromSetting(serverId);
        if (interpreter === undefined || interpreter.length === 0) {
            traceLog(`Python extension loading`);
            traceLog(`Python Interpreter: ${interpreter}`);
            await initializePython(context.subscriptions);
            traceLog(`Python extension loaded`);
        } else {
            lsClient = await runServer(lsClient);
        }
    });
}

export async function deactivate(): Promise<void> {
    if (lsClient) {
        await lsClient.stop();
    }
}
