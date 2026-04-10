import * as vscode from 'vscode';
import { PipelineItem, DatasetItem } from './treeItems';

export interface DatasetInfo {
    name: string;
    type: string;
}

export interface PipelineDatasets {
    name: string;
    datasets: DatasetInfo[];
}

const MOCK_CATALOG_DATA: PipelineDatasets[] = [
    {
        name: '__default__',
        datasets: [
            { name: 'companies', type: 'CSVDataset' },
            { name: 'shuttles', type: 'ExcelDataset' },
            { name: 'reviews', type: 'CSVDataset' },
        ],
    },
    {
        name: 'data_processing',
        datasets: [
            { name: 'preprocessed_companies', type: 'ParquetDataset' },
            { name: 'preprocessed_shuttles', type: 'ParquetDataset' },
        ],
    },
    {
        name: 'data_science',
        datasets: [
            { name: 'model_input_table', type: 'ParquetDataset' },
            { name: 'regressor', type: 'PickleDataset' },
        ],
    },
];

export class CatalogTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private data: PipelineDatasets[] = MOCK_CATALOG_DATA;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setData(data: PipelineDatasets[]): void {
        this.data = data;
        this.refresh();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!element) {
            return this.data.map(
                (pipeline) => new PipelineItem(pipeline.name, pipeline.datasets.length),
            );
        }

        if (element instanceof PipelineItem) {
            const pipeline = this.data.find((p) => p.name === element.pipelineName);
            if (!pipeline) {
                return [];
            }
            return pipeline.datasets.map((ds) => new DatasetItem(ds.name, ds.type));
        }

        return [];
    }
}
