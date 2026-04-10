import * as vscode from 'vscode';
import { DatasetReference, KedroSymbol, SymbolSource, SymbolSourceData } from '../types';

type VizNode = {
    id?: string;
    name?: string;
    fullName?: string;
    type?: string;
};

type VizEdge = {
    source?: string;
    target?: string;
};

function getNodeLabel(node: VizNode): string | undefined {
    return node.fullName || node.name || node.id;
}

function getArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function toPipelineId(pipeline: any): string | undefined {
    if (!pipeline || typeof pipeline !== 'object') {
        return undefined;
    }
    return pipeline.id || pipeline.name;
}

export class LspSymbolSource implements SymbolSource {
    async load(projectPath: string): Promise<SymbolSourceData> {
        const allProjectData = await vscode.commands.executeCommand<any>('kedro.getProjectData');

        if (!allProjectData || typeof allProjectData !== 'object') {
            throw new Error('No Kedro project data returned from language server.');
        }

        const symbols: KedroSymbol[] = [];
        const references: DatasetReference[] = [];
        const seenSymbolIds = new Set<string>();

        const pipelines = getArray<any>(allProjectData.pipelines);
        const pipelineIds = pipelines
            .map((pipeline) => toPipelineId(pipeline))
            .filter((value): value is string => Boolean(value));

        for (const pipelineId of pipelineIds) {
            const symbolId = `pipeline:${pipelineId}`;
            if (!seenSymbolIds.has(symbolId)) {
                symbols.push({
                    id: symbolId,
                    kind: 'pipeline',
                    name: pipelineId,
                    detail: 'Pipeline',
                    projectPath,
                });
                seenSymbolIds.add(symbolId);
            }

            const pipelineData = await vscode.commands.executeCommand<any>('kedro.getProjectData', pipelineId);
            if (!pipelineData || typeof pipelineData !== 'object') {
                continue;
            }

            const nodes = getArray<VizNode>(pipelineData.nodes);
            const edges = getArray<VizEdge>(pipelineData.edges);
            const nodesById = new Map<string, VizNode>();
            for (const node of nodes) {
                const nodeId = node.id;
                if (nodeId) {
                    nodesById.set(nodeId, node);
                }
            }

            for (const node of nodes) {
                const nodeName = getNodeLabel(node);
                if (!nodeName) {
                    continue;
                }

                if (node.type === 'data') {
                    const kind = nodeName.startsWith('params:') ? 'parameter' : 'dataset';
                    const symbolIdForData = `${kind}:${nodeName}`;
                    if (!seenSymbolIds.has(symbolIdForData)) {
                        symbols.push({
                            id: symbolIdForData,
                            kind,
                            name: nodeName,
                            detail: kind === 'dataset' ? 'Dataset' : 'Parameter',
                            projectPath,
                        });
                        seenSymbolIds.add(symbolIdForData);
                    }
                } else if (node.type === 'task') {
                    const symbolIdForTask = `node:${nodeName}`;
                    if (!seenSymbolIds.has(symbolIdForTask)) {
                        symbols.push({
                            id: symbolIdForTask,
                            kind: 'node',
                            name: nodeName,
                            detail: pipelineId,
                            projectPath,
                        });
                        seenSymbolIds.add(symbolIdForTask);
                    }
                }
            }

            for (const edge of edges) {
                if (!edge.source || !edge.target) {
                    continue;
                }

                const sourceNode = nodesById.get(edge.source);
                const targetNode = nodesById.get(edge.target);
                if (!sourceNode || !targetNode) {
                    continue;
                }

                const sourceName = getNodeLabel(sourceNode);
                const targetName = getNodeLabel(targetNode);
                if (!sourceName || !targetName) {
                    continue;
                }

                if (sourceNode.type === 'data' && targetNode.type === 'task' && !sourceName.startsWith('params:')) {
                    references.push({
                        datasetName: sourceName,
                        pipelineName: pipelineId,
                        nodeName: targetName,
                        projectPath,
                    });
                } else if (
                    sourceNode.type === 'task' &&
                    targetNode.type === 'data' &&
                    !targetName.startsWith('params:')
                ) {
                    references.push({
                        datasetName: targetName,
                        pipelineName: pipelineId,
                        nodeName: sourceName,
                        projectPath,
                    });
                }
            }
        }

        return { symbols, references };
    }
}
