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
    try {
        const stdout = await callPythonScript(pathToScript, EXTENSION_ROOT_DIR, context);
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

export async function isKedroProject(): Promise<boolean> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) {
      return false;
    }
  
    for (const folder of folders) {
      const pyprojectPath = path.join(folder.uri.fsPath, 'pyproject.toml');
      if (fs.existsSync(pyprojectPath)) {
        const content = fs.readFileSync(pyprojectPath, 'utf8');
        if (content.includes('[tool.kedro]')) {
          return true;
        }
      }
    }
    return false;
  }