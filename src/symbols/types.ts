export type KedroSymbolKind = 'dataset' | 'pipeline' | 'node' | 'parameter';

export interface KedroLocation {
    uri: string;
    range: {
        startLine: number;
        startChar: number;
        endLine: number;
        endChar: number;
    };
}

export interface KedroSymbol {
    id: string;
    kind: KedroSymbolKind;
    name: string;
    detail?: string;
    projectPath: string;
    location?: KedroLocation;
}

export interface DatasetReference {
    datasetName: string;
    pipelineName: string;
    nodeName: string;
    relation?: 'produces' | 'consumes';
    location?: KedroLocation;
    projectPath: string;
}

export interface SymbolSourceData {
    symbols: KedroSymbol[];
    references: DatasetReference[];
}

export interface SymbolSource {
    load(projectPath: string): Promise<SymbolSourceData>;
}
