// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { LogLevel, Uri, WorkspaceFolder } from 'vscode';
import { Trace } from 'vscode-jsonrpc/node';
import { getWorkspaceFolders } from './vscodeapi';
import { callPythonScript } from './callPythonScript';
import { EXTENSION_ROOT_DIR } from './constants';
import { traceError, traceLog } from './log/logging';
import { executeGetProjectDataCommand } from './commands';
import KedroVizPanel from '../webview/vizWebView';

function logLevelToTrace(logLevel: LogLevel): Trace {
    switch (logLevel) {
        case LogLevel.Error:
        case LogLevel.Warning:
        case LogLevel.Info:
            return Trace.Messages;

        case LogLevel.Debug:
        case LogLevel.Trace:
            return Trace.Verbose;

        case LogLevel.Off:
        default:
            return Trace.Off;
    }
}

export function getLSClientTraceLevel(channelLogLevel: LogLevel, globalLogLevel: LogLevel): Trace {
    if (channelLogLevel === LogLevel.Off) {
        return logLevelToTrace(globalLogLevel);
    }
    if (globalLogLevel === LogLevel.Off) {
        return logLevelToTrace(channelLogLevel);
    }
    const level = logLevelToTrace(channelLogLevel <= globalLogLevel ? channelLogLevel : globalLogLevel);
    return level;
}

export async function getProjectRoot(): Promise<WorkspaceFolder> {
    const workspaces: readonly WorkspaceFolder[] = getWorkspaceFolders();
    if (workspaces.length === 0) {
        return {
            uri: Uri.file(process.cwd()),
            name: path.basename(process.cwd()),
            index: 0,
        };
    } else if (workspaces.length === 1) {
        return workspaces[0];
    } else {
        let rootWorkspace = workspaces[0];
        let root = undefined;
        for (const w of workspaces) {
            if (await fs.pathExists(w.uri.fsPath)) {
                root = w.uri.fsPath;
                rootWorkspace = w;
                break;
            }
        }

        for (const w of workspaces) {
            if (root && root.length > w.uri.fsPath.length && (await fs.pathExists(w.uri.fsPath))) {
                root = w.uri.fsPath;
                rootWorkspace = w;
            }
        }
        return rootWorkspace;
    }
}

export async function installDependenciesIfNeeded(context: vscode.ExtensionContext): Promise<void> {
    const alreadyInstalled = context.globalState.get('dependenciesInstalled', false);

    if (!alreadyInstalled) {
        const pathToScript = 'bundled/tool/install_dependencies.py';
        try {
            const stdout = await callPythonScript(pathToScript, EXTENSION_ROOT_DIR, context);

            // Check if the script output contains the success message
            if (stdout.includes('Successfully installed')) {
                context.globalState.update('dependenciesInstalled', true);
                traceLog(`Python dependencies installed!`);
                console.log('Python dependencies installed!');
            }
        } catch (error) {
            traceError(`Failed to install Python dependencies:: ${error}`);
            console.error(`Failed to install Python dependencies:: ${error}`);
        }
    }
}

export async function updateKedroVizPanel(lsClient: LanguageClient | undefined): Promise<void> {
    const projectData = await executeGetProjectDataCommand(lsClient);
    KedroVizPanel.currentPanel?.updateData(projectData);
}
