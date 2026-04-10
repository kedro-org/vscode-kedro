import * as vscode from 'vscode';
import { DatasetReference, KedroSymbol, SymbolSource, SymbolSourceData } from '../types';

function getArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export class LspSymbolSource implements SymbolSource {
    async load(projectPath: string): Promise<SymbolSourceData> {
        const symbolIndex = await vscode.commands.executeCommand<any>('kedro.getSymbolIndex');
        if (!symbolIndex || typeof symbolIndex !== 'object') {
            throw new Error('No Kedro symbol index returned from language server.');
        }

        const symbols = getArray<KedroSymbol>(symbolIndex.symbols).map((symbol) => ({
            ...symbol,
            projectPath: symbol.projectPath || projectPath,
        }));
        const references = getArray<DatasetReference>(symbolIndex.references).map((reference) => ({
            ...reference,
            projectPath: reference.projectPath || projectPath,
        }));

        return { symbols, references };
    }
}
