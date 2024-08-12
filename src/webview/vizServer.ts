import * as vscode from 'vscode';
import { getWorkspaceFolders } from '../common/vscodeapi';
import { fetchAndUpdateProjectData } from '../common/utilities';
import { getInterpreterDetails } from '../common/python';
const { exec } = require('child_process');

async function getActivePythonInterpreter(): Promise<string | undefined> {
    const interpreterDetails = await getInterpreterDetails();
    if (interpreterDetails?.path) {
        return interpreterDetails.path[0];
    }
    vscode.window.showErrorMessage('Python interpreter could not be resolved.');
    return undefined;
}

export async function runKedroVizServer() {
    const pythonPath = await getActivePythonInterpreter();
    if (!pythonPath) return;

    const workspaceFolders = getWorkspaceFolders();
    if (!workspaceFolders.length) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;

    const command = `${pythonPath} -m kedro viz --no-browser -a`;
    const kedroVizProcess = exec(command, { cwd: workspacePath });

    kedroVizProcess.stdout.on('data', (data: any) => {
        console.log('Kedro Viz: ', data);
        fetchAndUpdateProjectData();
    });

    return kedroVizProcess;
}
