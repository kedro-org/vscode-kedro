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
import { DEPENDENCIES_INSTALLED, EXTENSION_ROOT_DIR, PROJECT_METADATA, TELEMETRY_CONSENT } from './constants';
import { traceError, traceLog } from './log/logging';
import KedroVizPanel from '../webview/vizWebView';
import { executeGetProjectDataCommand } from './commands';
import { getWorkspaceSettings } from './settings';

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
    const config = vscode.workspace.getConfiguration('kedro');
    let kedroProjectPath = config.get<string>('kedroProjectPath');

    if (kedroProjectPath && kedroProjectPath.trim()) {
        return {
            uri: Uri.file(kedroProjectPath),
            name: path.basename(kedroProjectPath),
            index: 0,
        };
    }

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

export async function installTelemetryDependenciesIfNeeded(context: vscode.ExtensionContext): Promise<void> {
    // Install necessary dependencies for the telemetry
    const alreadyInstalled = context.globalState.get(DEPENDENCIES_INSTALLED, false);

    if (!alreadyInstalled) {
        const telemetryPathToScript = 'bundled/tool/install_telemetry_dependencies.py';
        try {
            const stdoutTelemetry = await callPythonScript(telemetryPathToScript, EXTENSION_ROOT_DIR, context);
            // Check if the script output contains the success message
            if (stdoutTelemetry.includes('Successfully installed')) {
                traceLog(`kedro-telemetry and its dependencies installed!`);
                console.log('kedro-telemetry  and its dependencies installed!');
            }
            context.globalState.update(DEPENDENCIES_INSTALLED, true);
        } catch (error) {
            traceError(`Failed to install kedro-telemetry and its dependencies:: ${error}`);
            console.error(`Failed to install kedro-telemetry and its dependencies:: ${error}`);
        }
    }
}

export async function installKedroViz(context: vscode.ExtensionContext): Promise<boolean> {
    const vizPathToScript = 'bundled/tool/install_viz_dependencies.py';
    try {
        const stdoutTelemetry = await callPythonScript(vizPathToScript, EXTENSION_ROOT_DIR, context);

        // Check if the script output contains the success message
        if (stdoutTelemetry.includes('Successfully installed')) {
            traceLog('Kedro-Viz and its dependencies installed!');
            console.log('Kedro-Viz and its dependencies installed!');
            return true;
        }
    } catch (error) {
        traceError(`Failed to install 'Kedro-Viz and its dependencies:: ${error}`);
        console.error(`Failed to install 'Kedro-Viz and its dependencies:: ${error}`);
        return false;
    }
    return false;
}

export async function checkKedroViz(context: vscode.ExtensionContext): Promise<boolean> {
    const vizPathToScript = 'bundled/tool/check_viz_dependencies.py';
    try {
        const stdoutViz = await callPythonScript(vizPathToScript, EXTENSION_ROOT_DIR, context);

        // Check if Kedro-viz dependencies are installed
        if (stdoutViz.includes('Missing dependencies')) {
            return false;
        }
    } catch (error) {
        traceError(`Failed to check if Kedro-Viz is installed:: ${error}`);
        console.error(`Failed to check  if Kedro-Viz is installed:: ${error}`);
        return false;
    }
    return true;
}

export async function checkKedroProjectConsent(context: vscode.ExtensionContext): Promise<Boolean> {
    const pathToScript = 'bundled/tool/check_consent.py';
    const config = vscode.workspace.getConfiguration('kedro');
    let rootDir = config.get<string>('kedroProjectPath') || EXTENSION_ROOT_DIR;

    try {
        const stdout = await callPythonScript(pathToScript, rootDir, context);
        const telemetryResult = parseTelemetryConsent(stdout);

        // Check if the script output contains the success message
        if (telemetryResult) {
            const consent = telemetryResult['consent'];
            context.globalState.update(PROJECT_METADATA, telemetryResult);
            delete telemetryResult['consent'];

            context.globalState.update(TELEMETRY_CONSENT, consent);
            console.log(`Consent from Kedro Project: ${consent}`);
            return consent;
        }
        return false;
    } catch (error) {
        traceError(`Failed to check for telemetry consent:: ${error}`);
    }
    return false;
}

function parseTelemetryConsent(logMessage: string): Record<string, any> | null {
    // Step 1: Define a regular expression to match the telemetry consent data
    const telemetryRegex = /telemetry consent: ({.*})/;
    const match = logMessage.match(telemetryRegex);

    if (match && match[1]) {
        try {
            const telemetryData = JSON.parse(match[1]);
            return telemetryData;
        } catch (error) {
            console.error('Failed to parse telemetry consent data:', error);
            return null;
        }
    } else {
        console.log('Telemetry consent data not found in log message.');
        return null;
    }
}

export async function updateKedroVizPanel(lsClient: LanguageClient | undefined): Promise<void> {
    const projectData = await executeGetProjectDataCommand(lsClient);
    KedroVizPanel.currentPanel?.updateData(projectData);
}

export async function isKedroProject(kedroProjectPath?: string): Promise<boolean> {
    if (kedroProjectPath && kedroProjectPath.trim()) {
        return await checkPyprojectToml(kedroProjectPath);
    }

    // No specific path: check all workspace folders
    const folders = getWorkspaceFolders();
    if (!folders || folders.length === 0) {
        return false;
    }

    for (const folder of folders) {
        if (await checkPyprojectToml(folder.uri.fsPath)) {
            return true;
        }
    }

    return false;
}

async function checkPyprojectToml(projectPath: string): Promise<boolean> {
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    try {
        const content = await fs.readFile(pyprojectPath, 'utf8');
        if (content.includes('[tool.kedro]')) {
            traceLog(`Kedro project detected at ${projectPath}`);
            return true;
        }
    } catch (error) {
        // Only log the error if needed, otherwise we silently fail
        traceError(`Error reading ${pyprojectPath}: ${error}`);
    }
    return false;
}

export async function getKedroProjectPath(): Promise<string> {
    const projectRoot = await getProjectRoot();
    const workspaceSetting = await getWorkspaceSettings('kedro', projectRoot);
    return workspaceSetting.kedroProjectPath;
}
