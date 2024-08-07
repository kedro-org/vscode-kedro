import * as vscode from 'vscode';
const { exec } = require('child_process');
import * as fs from 'fs';
import * as path from 'path';
import KedroVizPanel from './vizWebView';

async function getActivePythonInterpreter(): Promise<string | undefined> {
    const pythonExtension = vscode.extensions.getExtension('ms-python.python');
    if (pythonExtension) {
        const api = await pythonExtension.activate();
        const interpreterPath = api.environment?.getActiveEnvironmentPath
            ? await api.environment.getActiveEnvironmentPath(vscode.workspace.workspaceFolders![0].uri)
            : undefined;
        return interpreterPath?.path;
    }
    vscode.window.showErrorMessage('Python extension is not installed or not active.');
    return undefined;
}

function getWorkspaceFolder(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        return workspaceFolders[0].uri.fsPath;
    }
    vscode.window.showErrorMessage('No workspace folder is open.');
    return undefined;
}

export async function runKedroViz() {
    const pythonPath = await getActivePythonInterpreter();
    if (!pythonPath) return;

    const workspacePath = getWorkspaceFolder();
    if (!workspacePath) return;

    const command = `${pythonPath} -m kedro viz build`;

    // Execute the command with cwd set to the current workspace path
    exec(command, { cwd: workspacePath }, (error: any, stdout: any, stderr: any) => {
        if (error) {
            vscode.window.showErrorMessage(`Error: ${stderr}`);
            return;
        }
        vscode.window.showInformationMessage(`Output: ${stdout}`);

        // After command execution, check if the build folder and main file exist
        const test123Path = path.join(workspacePath, 'build');
        const apiFilePath = path.join(test123Path, 'api');
        const mainFilePath = path.join(apiFilePath, 'main');

        if (fs.existsSync(test123Path) && fs.existsSync(apiFilePath) && fs.existsSync(mainFilePath)) {
            // Read the main file
            fs.readFile(mainFilePath, 'utf-8', (err, data) => {
                if (err) {
                    vscode.window.showErrorMessage(`Error reading file: ${err.message}`);
                    return;
                }
                KedroVizPanel.currentPanel?.updateData(data);
            });
        } else {
            vscode.window.showErrorMessage('build folder or main file does not exist.');
        }
    });
}
