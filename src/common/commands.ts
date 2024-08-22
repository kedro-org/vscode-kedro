import { QuickPickItem, window } from 'vscode';
import * as fs from 'fs';
import { getWorkspaceFolders } from './vscodeapi';

export async function selectEnvironment() {
    let workspaces = getWorkspaceFolders();
    const root_dir = workspaces[0].uri.fsPath; // Only pick the first workspace
    const confDir = `${root_dir}/conf`;
    // Iterate the `conf` directory to get folder names
    const directories = fs
        .readdirSync(confDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    const envs: QuickPickItem[] = directories.map((label) => ({ label }));

    const result = await window.showQuickPick(envs, {
        placeHolder: 'Select Kedro runtime environment',
    });

    return result;
}
