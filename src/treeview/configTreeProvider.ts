import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentItem, ConfigFileItem } from './treeItems';

export class ConfigTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private projectPath: string | undefined;

    constructor(projectPath?: string) {
        this.projectPath = projectPath;
    }

    setProjectPath(projectPath: string): void {
        this.projectPath = projectPath;
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!this.projectPath) {
            return [];
        }

        const confDir = path.join(this.projectPath, 'conf');
        if (!fs.existsSync(confDir)) {
            return [];
        }

        if (!element) {
            return this.getEnvironments(confDir);
        }

        if (element instanceof EnvironmentItem) {
            return this.getFilesInEnvironment(element.envPath);
        }

        return [];
    }

    private getEnvironments(confDir: string): EnvironmentItem[] {
        try {
            const entries = fs.readdirSync(confDir, { withFileTypes: true });
            const dirs = entries.filter((e) => e.isDirectory());

            return dirs.map((dir, index) => {
                const envPath = path.join(confDir, dir.name);
                const state = index === 0
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.Collapsed;
                return new EnvironmentItem(dir.name, envPath, state);
            });
        } catch {
            return [];
        }
    }

    private getFilesInEnvironment(envPath: string): ConfigFileItem[] {
        try {
            const entries = fs.readdirSync(envPath, { withFileTypes: true });
            return entries
                .filter((e) => e.isFile())
                .map((file) => new ConfigFileItem(path.join(envPath, file.name)));
        } catch {
            return [];
        }
    }
}
