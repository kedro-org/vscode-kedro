import * as vscode from 'vscode';
import { getKedroProjectPath } from '../common/utilities';
import { KedroSymbolIndex } from './kedroSymbolIndex';
import { KedroLocation, KedroSymbol, KedroSymbolKind } from './types';

interface SymbolQuickPickItem extends vscode.QuickPickItem {
    symbol?: KedroSymbol;
}

const KIND_LABEL: Record<KedroSymbolKind, string> = {
    dataset: 'Dataset',
    pipeline: 'Pipeline',
    node: 'Node',
    parameter: 'Parameter',
};

function getKindIcon(kind: KedroSymbolKind): string {
    switch (kind) {
        case 'dataset':
            return '$(database)';
        case 'pipeline':
            return '$(type-hierarchy)';
        case 'node':
            return '$(symbol-method)';
        case 'parameter':
            return '$(symbol-parameter)';
        default:
            return '$(symbol-property)';
    }
}

function toVscodeRange(location: KedroLocation): vscode.Range {
    return new vscode.Range(
        new vscode.Position(location.range.startLine, location.range.startChar),
        new vscode.Position(location.range.endLine, location.range.endChar),
    );
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class SymbolSearchController {
    constructor(private readonly symbolIndex: KedroSymbolIndex) {}

    async run(): Promise<void> {
        try {
            const projectPath = await getKedroProjectPath();
            if (!projectPath) {
                await vscode.window.showWarningMessage(
                    'No Kedro project path configured. Run "Kedro: Set Project Path" first.',
                );
                return;
            }

            await this.symbolIndex.refresh(projectPath);
            const symbol = await this.pickSymbol(projectPath);

            if (!symbol) {
                return;
            }

            if (symbol.kind === 'dataset') {
                await this.handleDatasetSelection(projectPath, symbol);
                return;
            }

            if (symbol.location) {
                await this.openLocation(symbol.location);
                return;
            }

            if (await this.goToDefinitionByWord(symbol.name)) {
                return;
            }
            if (await this.findAndGoToDefinition(symbol.name, '**/pipelines/**/*.py')) {
                return;
            }
            await vscode.window.showInformationMessage(`No location is available for symbol "${symbol.name}".`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await vscode.window.showErrorMessage(`Kedro symbol search failed: ${message}`);
        }
    }

    private async pickSymbol(projectPath: string): Promise<KedroSymbol | undefined> {
        return new Promise((resolve) => {
            const qp = vscode.window.createQuickPick<SymbolQuickPickItem>();
            qp.title = 'Kedro: Search Symbols';
            qp.matchOnDescription = true;
            qp.matchOnDetail = true;
            qp.placeholder = 'Search Kedro symbols (datasets, pipelines, nodes, params)';
            qp.busy = true;

            const updateItems = async (value: string) => {
                const symbols = await this.symbolIndex.searchSymbols(projectPath, value);
                qp.items = await this.toSymbolQuickPickItems(projectPath, symbols);
                qp.busy = false;
            };

            updateItems('');

            qp.onDidChangeValue((value) => {
                qp.busy = true;
                updateItems(value);
            });

            qp.onDidAccept(() => {
                const selected = qp.selectedItems[0];
                resolve(selected?.symbol);
                qp.hide();
            });

            qp.onDidHide(() => {
                resolve(undefined);
                qp.dispose();
            });

            qp.show();
        });
    }

    private async toSymbolQuickPickItems(projectPath: string, symbols: KedroSymbol[]): Promise<SymbolQuickPickItem[]> {
        const grouped = new Map<KedroSymbolKind, KedroSymbol[]>();
        for (const symbol of symbols) {
            const existing = grouped.get(symbol.kind) || [];
            existing.push(symbol);
            grouped.set(symbol.kind, existing);
        }

        const orderedKinds: KedroSymbolKind[] = ['dataset', 'pipeline', 'node', 'parameter'];
        const items: SymbolQuickPickItem[] = [];

        for (const kind of orderedKinds) {
            const group = grouped.get(kind);
            if (!group || group.length === 0) {
                continue;
            }

            items.push({
                kind: vscode.QuickPickItemKind.Separator,
                label: KIND_LABEL[kind],
            });

            for (const symbol of group) {
                let detail = symbol.detail;
                if (symbol.kind === 'dataset' || symbol.kind === 'parameter') {
                    const references = await this.symbolIndex.getDatasetReferences(projectPath, symbol.name);
                    const producedPipelines = [
                        ...new Set(
                            references
                                .filter((reference) => reference.relation === 'produces')
                                .map((reference) => reference.pipelineName),
                        ),
                    ];
                    const consumedPipelines = [
                        ...new Set(
                            references
                                .filter((reference) => reference.relation !== 'produces')
                                .map((reference) => reference.pipelineName),
                        ),
                    ];

                    const hints: string[] = [];
                    if (producedPipelines.length > 0) {
                        const producedHint = producedPipelines.slice(0, 2).join(', ');
                        const producedSuffix = producedPipelines.length > 2 ? ` +${producedPipelines.length - 2}` : '';
                        hints.push(`produced in: ${producedHint}${producedSuffix}`);
                    }
                    if (consumedPipelines.length > 0) {
                        const consumedHint = consumedPipelines.slice(0, 2).join(', ');
                        const consumedSuffix = consumedPipelines.length > 2 ? ` +${consumedPipelines.length - 2}` : '';
                        hints.push(`consumed in: ${consumedHint}${consumedSuffix}`);
                    }

                    if (hints.length > 0) {
                        const usageHint = hints.join(' • ');
                        detail = detail ? `${detail} • ${usageHint}` : usageHint;
                    }
                }
                items.push({
                    label: `${getKindIcon(symbol.kind)} ${symbol.name}`,
                    description: KIND_LABEL[symbol.kind],
                    detail,
                    symbol,
                });
            }
        }

        return items;
    }

    private async handleDatasetSelection(projectPath: string, dataset: KedroSymbol): Promise<void> {
        // Keep dataset selection direct and predictable: use existing definition flow first.
        const result = await vscode.commands.executeCommand<any[] | undefined>(
            'kedro.goToDefinitionFromFlowchart',
            dataset.name,
        );
        if (result && result.length > 0) {
            const definition = result[0];
            const uri = vscode.Uri.parse(definition.uri);
            await vscode.window.showTextDocument(uri, {
                selection: toVscodeRange({
                    uri: definition.uri,
                    range: {
                        startLine: definition.range.start.line,
                        startChar: definition.range.start.character,
                        endLine: definition.range.end.line,
                        endChar: definition.range.end.character,
                    },
                }),
                preview: false,
                viewColumn: vscode.ViewColumn.One,
            });
            return;
        }

        const references = await this.symbolIndex.getDatasetReferences(projectPath, dataset.name);
        if (references.length > 0) {
            const firstReference = references[0];
            const targetWord = firstReference.nodeName || dataset.name;
            if (await this.findAndGoToDefinition(targetWord, '**/pipelines/**/*.py')) {
                return;
            }
        }

        await vscode.window.showInformationMessage(
            `No definition or reference location is available for dataset "${dataset.name}".`,
        );
    }

    private async openLocation(location: KedroLocation): Promise<void> {
        try {
            const uri = vscode.Uri.file(location.uri);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, {
                selection: toVscodeRange(location),
                preview: false,
                viewColumn: vscode.ViewColumn.One,
            });
        } catch {
            await vscode.window.showWarningMessage(`Unable to open symbol location: ${location.uri}`);
        }
    }

    private async goToDefinitionByWord(word: string): Promise<boolean> {
        const result = await vscode.commands.executeCommand<any[] | undefined>('kedro.goToDefinitionFromFlowchart', word);
        if (!result || result.length === 0) {
            return false;
        }
        const definition = result[0];
        const uri = vscode.Uri.parse(definition.uri);
        await vscode.window.showTextDocument(uri, {
            selection: toVscodeRange({
                uri: definition.uri,
                range: {
                    startLine: definition.range.start.line,
                    startChar: definition.range.start.character,
                    endLine: definition.range.end.line,
                    endChar: definition.range.end.character,
                },
            }),
            preview: false,
            viewColumn: vscode.ViewColumn.One,
        });
        return true;
    }

    private async findAndGoToDefinition(word: string, filePattern: string): Promise<boolean> {
        const files = await vscode.workspace.findFiles(filePattern);
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'g');

        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            const text = document.getText();
            let match;

            while ((match = regex.exec(text)) !== null) {
                const position = document.positionAt(match.index);
                const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
                    'vscode.executeDefinitionProvider',
                    document.uri,
                    position,
                );

                if (definitions && definitions.length > 0) {
                    await vscode.window.showTextDocument(definitions[0].uri, {
                        selection: definitions[0].range,
                        viewColumn: vscode.ViewColumn.One,
                        preview: false,
                    });
                    return true;
                }
            }
        }
        return false;
    }
}
