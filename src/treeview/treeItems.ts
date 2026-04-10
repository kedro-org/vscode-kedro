import * as vscode from 'vscode';
import * as path from 'path';

export class EnvironmentItem extends vscode.TreeItem {
    constructor(
        public readonly envName: string,
        public readonly envPath: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(envName, collapsibleState);
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'environment';
    }
}

export class ConfigFileItem extends vscode.TreeItem {
    constructor(
        public readonly filePath: string,
    ) {
        super(path.basename(filePath), vscode.TreeItemCollapsibleState.None);
        const fileUri = vscode.Uri.file(filePath);
        this.resourceUri = fileUri;
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [fileUri],
        };
        this.contextValue = 'configFile';
    }
}

export class PipelineItem extends vscode.TreeItem {
    constructor(
        public readonly pipelineName: string,
        public readonly datasetCount: number,
    ) {
        super(pipelineName, vscode.TreeItemCollapsibleState.Collapsed);
        this.description = `${datasetCount}`;
        this.iconPath = new vscode.ThemeIcon('type-hierarchy');
        this.contextValue = 'pipeline';
    }
}

export class DatasetItem extends vscode.TreeItem {
    constructor(
        public readonly datasetName: string,
        public readonly datasetType: string,
        public readonly usageSummary?: string,
    ) {
        super(datasetName, vscode.TreeItemCollapsibleState.None);
        this.description = usageSummary ? `${datasetType} • ${usageSummary}` : datasetType;
        this.iconPath = new vscode.ThemeIcon('database');
        this.command = {
            command: 'kedro.sendDefinitionRequest',
            title: 'Go to Definition',
            arguments: [datasetName],
        };
        if (usageSummary) {
            this.tooltip = `${datasetName}\n${datasetType}\n${usageSummary}`;
        }
        this.contextValue = 'dataset';
    }
}

export class UndefinedDatasetItem extends vscode.TreeItem {
    constructor(
        public readonly datasetName: string,
        public readonly pipelines: string[],
    ) {
        super(datasetName, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('warning');
        this.tooltip = `Dataset "${datasetName}" is used in pipeline but not defined in catalog`;
        this.description = pipelines.length > 0 ? pipelines.join(', ') : undefined;
        this.command = {
            command: 'kedro.sendDefinitionRequest',
            title: 'Go to Definition',
            arguments: [datasetName],
        };
        this.contextValue = 'undefinedDataset';
    }
}
