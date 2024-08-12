import * as vscode from 'vscode';
import { fetchAndUpdateProjectData } from '../common/utilities';
const { exec } = require('child_process');

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

export async function runKedroVizServer() {
    const pythonPath = await getActivePythonInterpreter();
    if (!pythonPath) return;

    const workspacePath = getWorkspaceFolder();
    if (!workspacePath) return;

    const command = `${pythonPath} -m kedro viz --no-browser -a`;
    const kedroVizProcess = exec(command, { cwd: workspacePath });

    kedroVizProcess.stdout.on('data', (data: any) => {
        console.log('Kedro Viz: ', data);
        fetchAndUpdateProjectData();
    });

    return kedroVizProcess;
}
