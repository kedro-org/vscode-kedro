import { DatasetReference, KedroSymbol, KedroSymbolKind, SymbolSource } from './types';

interface SymbolCacheEntry {
    symbols: KedroSymbol[];
    referencesByDataset: Map<string, DatasetReference[]>;
}

const KIND_RANK: Record<KedroSymbolKind, number> = {
    dataset: 0,
    pipeline: 1,
    node: 2,
    parameter: 3,
};

function symbolSortScore(symbol: KedroSymbol, normalizedQuery: string): number {
    const name = symbol.name.toLowerCase();
    const detail = (symbol.detail || '').toLowerCase();
    const kind = symbol.kind.toLowerCase();
    const combined = `${name} ${detail} ${kind}`;

    let base = 100;
    if (normalizedQuery.length === 0) {
        base = 0;
    } else if (name.startsWith(normalizedQuery)) {
        base = 0;
    } else if (name.includes(normalizedQuery)) {
        base = 20;
    } else if (combined.includes(normalizedQuery)) {
        base = 40;
    }

    return base + KIND_RANK[symbol.kind];
}

function symbolMatchesQuery(symbol: KedroSymbol, normalizedQuery: string): boolean {
    if (!normalizedQuery) {
        return true;
    }

    const name = symbol.name.toLowerCase();
    const detail = (symbol.detail || '').toLowerCase();
    const kind = symbol.kind.toLowerCase();
    const aliases = kind === 'parameter' ? 'parameter params' : kind;
    return (
        name.includes(normalizedQuery) ||
        detail.includes(normalizedQuery) ||
        kind.includes(normalizedQuery) ||
        aliases.includes(normalizedQuery)
    );
}

export class KedroSymbolIndex {
    private readonly cacheByProject = new Map<string, SymbolCacheEntry>();

    constructor(private readonly source: SymbolSource) {}

    async refresh(projectPath: string): Promise<void> {
        const loaded = await this.source.load(projectPath);
        const referencesByDataset = new Map<string, DatasetReference[]>();

        for (const reference of loaded.references) {
            const existing = referencesByDataset.get(reference.datasetName) || [];
            existing.push(reference);
            referencesByDataset.set(reference.datasetName, existing);
        }

        this.cacheByProject.set(projectPath, {
            symbols: loaded.symbols,
            referencesByDataset,
        });
    }

    async ensureLoaded(projectPath: string): Promise<void> {
        if (!this.cacheByProject.has(projectPath)) {
            await this.refresh(projectPath);
        }
    }

    async searchSymbols(projectPath: string, query: string): Promise<KedroSymbol[]> {
        await this.ensureLoaded(projectPath);
        const cache = this.cacheByProject.get(projectPath);
        if (!cache) {
            return [];
        }

        const normalizedQuery = query.trim().toLowerCase();
        return cache.symbols
            .filter((symbol) => symbolMatchesQuery(symbol, normalizedQuery))
            .sort((a, b) => {
                const aScore = symbolSortScore(a, normalizedQuery);
                const bScore = symbolSortScore(b, normalizedQuery);
                if (aScore !== bScore) {
                    return aScore - bScore;
                }
                return a.name.localeCompare(b.name);
            });
    }

    async getDatasetReferences(projectPath: string, datasetName: string): Promise<DatasetReference[]> {
        await this.ensureLoaded(projectPath);
        const cache = this.cacheByProject.get(projectPath);
        if (!cache) {
            return [];
        }
        return cache.referencesByDataset.get(datasetName) || [];
    }

    async getAllDatasetReferences(projectPath: string): Promise<Map<string, DatasetReference[]>> {
        await this.ensureLoaded(projectPath);
        const cache = this.cacheByProject.get(projectPath);
        if (!cache) {
            return new Map<string, DatasetReference[]>();
        }
        return new Map(cache.referencesByDataset);
    }
}
