import * as vscode from 'vscode';
import { PipelineItem, DatasetItem } from './treeItems';
import { KedroSymbolIndex } from '../symbols/kedroSymbolIndex';
import { LspSymbolSource } from '../symbols/sources/lspSymbolSource';
import { DatasetReference } from '../symbols/types';

export interface DatasetInfo {
    name: string;
    type: string;
    usageSummary?: string;
}

export interface PipelineDatasets {
    name: string;
    datasets: DatasetInfo[];
}

export class CatalogTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private readonly symbolIndex = new KedroSymbolIndex(new LspSymbolSource());
    private projectPath: string | undefined;
    private data: PipelineDatasets[] = [];
    private hasLoaded = false;
    private isLoading = false;
    private lastErrorMessage: string | undefined;

    constructor(projectPath?: string) {
        this.projectPath = projectPath;
    }

    refresh(): void {
        this.hasLoaded = false;
        this.lastErrorMessage = undefined;
        this._onDidChangeTreeData.fire();
    }

    setProjectPath(projectPath: string): void {
        this.projectPath = projectPath;
        this.refresh();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!element) {
            if (!this.projectPath) {
                return [new vscode.TreeItem('No Kedro project selected', vscode.TreeItemCollapsibleState.None)];
            }

            if (!this.hasLoaded) {
                this.ensureLoadedInBackground();
                if (this.lastErrorMessage) {
                    return [new vscode.TreeItem(`Retrying symbol load... (${this.lastErrorMessage})`, vscode.TreeItemCollapsibleState.None)];
                }
                return [new vscode.TreeItem('Loading catalog symbols...', vscode.TreeItemCollapsibleState.None)];
            }

            return this.data.map(
                (pipeline) => new PipelineItem(pipeline.name, pipeline.datasets.length),
            );
        }

        if (element instanceof PipelineItem) {
            const pipeline = this.data.find((p) => p.name === element.pipelineName);
            if (!pipeline) {
                return [];
            }
            return pipeline.datasets.map((ds) => new DatasetItem(ds.name, ds.type, ds.usageSummary));
        }

        return [];
    }

    private ensureLoadedInBackground(): void {
        if (this.isLoading || this.hasLoaded || !this.projectPath) {
            return;
        }
        this.isLoading = true;
        void this.loadData()
            .catch(() => {
                // Error is stored in loadData; keep tree responsive and retryable.
            })
            .finally(() => {
                this.isLoading = false;
                this._onDidChangeTreeData.fire();
            });
    }

    private async loadData(): Promise<void> {
        if (!this.projectPath) {
            this.data = [];
            this.hasLoaded = false;
            return;
        }

        try {
            const symbols = await this.symbolIndex.searchSymbols(this.projectPath, '');
            const datasetSymbols = symbols.filter((symbol) => symbol.kind === 'dataset');
            const pipelineSymbols = symbols.filter((symbol) => symbol.kind === 'pipeline');
            const refsByDataset = await this.symbolIndex.getAllDatasetReferences(this.projectPath);
            const datasetTypeByName = new Map(datasetSymbols.map((symbol) => [symbol.name, symbol.detail || 'Dataset']));

            const pipelineData: PipelineDatasets[] = [];
            for (const pipeline of pipelineSymbols) {
                const datasets: DatasetInfo[] = [];
                for (const [datasetName, references] of refsByDataset.entries()) {
                    const refsInPipeline = references.filter((reference) => reference.pipelineName === pipeline.name);
                    if (refsInPipeline.length === 0) {
                        continue;
                    }
                    datasets.push({
                        name: datasetName,
                        type: datasetTypeByName.get(datasetName) || 'Dataset',
                        usageSummary: this.buildUsageSummary(references),
                    });
                }
                pipelineData.push({
                    name: pipeline.name,
                    datasets: datasets.sort((a, b) => a.name.localeCompare(b.name)),
                });
            }

            this.data = pipelineData
                .filter((pipeline) => pipeline.datasets.length > 0)
                .sort((a, b) => a.name.localeCompare(b.name));
            this.hasLoaded = true;
            this.lastErrorMessage = undefined;
        } catch (error) {
            this.data = [];
            this.hasLoaded = false;
            const message = error instanceof Error ? error.message : 'LSP not ready yet';
            this.lastErrorMessage = message;
        }
    }

    private buildUsageSummary(references: DatasetReference[]): string | undefined {
        const producedIn = [...new Set(
            references.filter((reference) => reference.relation === 'produces').map((reference) => reference.pipelineName),
        )];
        const consumedIn = [...new Set(
            references.filter((reference) => reference.relation !== 'produces').map((reference) => reference.pipelineName),
        )];

        const parts: string[] = [];
        if (producedIn.length > 0) {
            parts.push(`produced: ${producedIn.slice(0, 2).join(', ')}${producedIn.length > 2 ? ` +${producedIn.length - 2}` : ''}`);
        }
        if (consumedIn.length > 0) {
            parts.push(`consumed: ${consumedIn.slice(0, 2).join(', ')}${consumedIn.length > 2 ? ` +${consumedIn.length - 2}` : ''}`);
        }

        return parts.length > 0 ? parts.join(' • ') : undefined;
    }
}
