import * as vscode from 'vscode';
import { UndefinedDatasetItem } from './treeItems';

export interface UndefinedDataset {
    name: string;
    pipelines: string[];
}

const MOCK_UNDEFINED_DATASETS: UndefinedDataset[] = [
    { name: 'raw_data', pipelines: ['data_processing'] },
    { name: 'intermediate_results', pipelines: ['data_processing', 'data_science'] },
    { name: 'model_metrics', pipelines: ['data_science'] },
];

export class UndefinedDatasetProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private data: UndefinedDataset[] = MOCK_UNDEFINED_DATASETS;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setData(data: UndefinedDataset[]): void {
        this.data = data;
        this.refresh();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(_element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        return this.data.map((ds) => new UndefinedDatasetItem(ds.name, ds.pipelines));
    }
}
