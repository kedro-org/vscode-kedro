import * as fs from 'fs';
import * as path from 'path';
import { DatasetReference, KedroSymbol, SymbolSource, SymbolSourceData } from '../types';

function createLocation(filePath: string | undefined, line: number, char: number) {
    if (!filePath) {
        return undefined;
    }
    return {
        uri: filePath,
        range: {
            startLine: line,
            startChar: char,
            endLine: line,
            endChar: char + 1,
        },
    };
}

function resolveExistingPath(candidates: string[]): string | undefined {
    return candidates.find((candidate) => fs.existsSync(candidate));
}

export class MockSymbolSource implements SymbolSource {
    async load(projectPath: string): Promise<SymbolSourceData> {
        const catalogPath = resolveExistingPath([
            path.join(projectPath, 'conf', 'base', 'catalog.yml'),
            path.join(projectPath, 'conf', 'base', 'catalog.yaml'),
        ]);
        const paramsPath = resolveExistingPath([
            path.join(projectPath, 'conf', 'base', 'parameters.yml'),
            path.join(projectPath, 'conf', 'base', 'parameters.yaml'),
        ]);
        const pipelinePath = resolveExistingPath([
            path.join(projectPath, 'src', 'pipelines', 'data_processing', 'pipeline.py'),
            path.join(projectPath, 'src', 'spaceflights', 'pipelines', 'data_processing', 'pipeline.py'),
            path.join(projectPath, 'src', 'spaceflights_kedro', 'pipelines', 'data_processing', 'pipeline.py'),
        ]);
        const dataSciencePipelinePath = resolveExistingPath([
            path.join(projectPath, 'src', 'pipelines', 'data_science', 'pipeline.py'),
            path.join(projectPath, 'src', 'spaceflights', 'pipelines', 'data_science', 'pipeline.py'),
            path.join(projectPath, 'src', 'spaceflights_kedro', 'pipelines', 'data_science', 'pipeline.py'),
        ]);

        const symbols: KedroSymbol[] = [
            {
                id: 'dataset:companies',
                kind: 'dataset',
                name: 'companies',
                detail: 'CSVDataset',
                projectPath,
                location: createLocation(catalogPath, 1, 0),
            },
            {
                id: 'dataset:shuttles',
                kind: 'dataset',
                name: 'shuttles',
                detail: 'ExcelDataset',
                projectPath,
                location: createLocation(catalogPath, 8, 0),
            },
            {
                id: 'dataset:model_input_table',
                kind: 'dataset',
                name: 'model_input_table',
                detail: 'ParquetDataset',
                projectPath,
                location: createLocation(catalogPath, 21, 0),
            },
            {
                id: 'pipeline:data_processing',
                kind: 'pipeline',
                name: 'data_processing',
                detail: 'Pipeline',
                projectPath,
                location: createLocation(pipelinePath, 1, 0),
            },
            {
                id: 'pipeline:data_science',
                kind: 'pipeline',
                name: 'data_science',
                detail: 'Pipeline',
                projectPath,
                location: createLocation(dataSciencePipelinePath, 1, 0),
            },
            {
                id: 'node:preprocess_companies',
                kind: 'node',
                name: 'preprocess_companies',
                detail: 'data_processing',
                projectPath,
                location: createLocation(pipelinePath, 10, 12),
            },
            {
                id: 'node:train_model',
                kind: 'node',
                name: 'train_model',
                detail: 'data_science',
                projectPath,
                location: createLocation(dataSciencePipelinePath, 18, 12),
            },
            {
                id: 'parameter:params:model_options.test_size',
                kind: 'parameter',
                name: 'params:model_options.test_size',
                detail: '0.2',
                projectPath,
                location: createLocation(paramsPath, 3, 2),
            },
        ];

        const references: DatasetReference[] = [];
        const companiesProcessingRefLocation = createLocation(pipelinePath, 12, 20);
        if (companiesProcessingRefLocation) {
            references.push({
                datasetName: 'companies',
                pipelineName: 'data_processing',
                nodeName: 'preprocess_companies',
                location: companiesProcessingRefLocation,
                projectPath,
            });
        }
        const companiesScienceRefLocation = createLocation(dataSciencePipelinePath, 20, 20);
        if (companiesScienceRefLocation) {
            references.push({
                datasetName: 'companies',
                pipelineName: 'data_science',
                nodeName: 'train_model',
                location: companiesScienceRefLocation,
                projectPath,
            });
        }
        const modelInputScienceRefLocation = createLocation(dataSciencePipelinePath, 21, 20);
        if (modelInputScienceRefLocation) {
            references.push({
                datasetName: 'model_input_table',
                pipelineName: 'data_science',
                nodeName: 'train_model',
                location: modelInputScienceRefLocation,
                projectPath,
            });
        }

        return { symbols, references };
    }
}
