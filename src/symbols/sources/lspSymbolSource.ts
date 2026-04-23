import * as vscode from 'vscode';
import { DatasetReference, KedroSymbol, SymbolSource, SymbolSourceData } from '../types';

function getArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

async function executeWithTimeout<T>(command: string, timeoutMs: number): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    try {
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error(`${command} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });

        const result = await Promise.race([
            vscode.commands.executeCommand<T>(command),
            timeoutPromise,
        ]);
        return result as T;
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}

export class LspSymbolSource implements SymbolSource {
    async load(projectPath: string): Promise<SymbolSourceData> {
        const symbolIndex = await executeWithTimeout<any>('kedro.getSymbolIndex', 10000);
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
