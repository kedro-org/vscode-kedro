/**
 * Unit tests for kedroProjectFileWatchers.ts
 */

import * as vscode from 'vscode';
import { setupKedroProjectFileWatchers, disposeKedroProjectFileWatchers } from '../kedroProjectFileWatchers';
import { traceLog } from '../log/logging';
import KedroVizPanel from '../../webview/vizWebView';

describe('kedroProjectFileWatchers', () => {
    let mockContext: vscode.ExtensionContext;
    let mockWatcher: any;
    let mockConfiguration: any;

    beforeEach(() => {
        // Mock file system watcher
        mockWatcher = {
            onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
            dispose: jest.fn(),
        };

        // Mock configuration
        mockConfiguration = {
            get: jest.fn(() => true), // autoReloadKedroViz enabled by default
        };

        // Mock context with minimal required properties
        mockContext = {
            subscriptions: [],
        } as any;

        // Setup vscode mocks
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfiguration);
        (vscode.workspace.createFileSystemWatcher as jest.Mock).mockReturnValue(mockWatcher);
        (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

        // Reset KedroVizPanel
        (KedroVizPanel as any).currentPanel = undefined;
    });

    describe('setupKedroProjectFileWatchers', () => {
        it('should create file watchers when auto reload is enabled', () => {
            setupKedroProjectFileWatchers(mockContext);

            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledTimes(3);
            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/conf/**/*.{yml,yaml}');
            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/pipelines/**/*.py');
            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/catalog*.py');
            expect(mockContext.subscriptions.length).toBe(3);
        });

        it('should not create file watchers when auto reload is disabled', () => {
            mockConfiguration.get.mockReturnValue(false);

            setupKedroProjectFileWatchers(mockContext);

            expect(vscode.workspace.createFileSystemWatcher).not.toHaveBeenCalled();
            expect(mockContext.subscriptions.length).toBe(0);
        });

        it('should register change handlers for all watcher types', () => {
            setupKedroProjectFileWatchers(mockContext);

            expect(mockWatcher.onDidChange).toHaveBeenCalledTimes(3);
        });
    });

    describe('disposeKedroProjectFileWatchers', () => {
        it('should dispose all watchers', () => {
            setupKedroProjectFileWatchers(mockContext);

            disposeKedroProjectFileWatchers();

            expect(mockWatcher.dispose).toHaveBeenCalledTimes(3);
        });

        it('should be safe to call multiple times', () => {
            setupKedroProjectFileWatchers(mockContext);

            disposeKedroProjectFileWatchers();
            disposeKedroProjectFileWatchers();

            expect(traceLog).toHaveBeenCalledWith('Kedro file watchers disposed');
        });
    });

    describe('File Change Handlers', () => {
        beforeEach(() => {
            (KedroVizPanel as any).currentPanel = { updateData: jest.fn() };
        });

        it('should handle config file changes', async () => {
            setupKedroProjectFileWatchers(mockContext);

            const configCallback = mockWatcher.onDidChange.mock.calls[0][0];
            const mockUri = { fsPath: '/mock/conf/base/catalog.yml' };

            await configCallback(mockUri);
            await new Promise((resolve) => setImmediate(resolve));

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('kedro.restart');
        });

        it('should handle pipeline file changes', async () => {
            setupKedroProjectFileWatchers(mockContext);

            const pipelineCallback = mockWatcher.onDidChange.mock.calls[1][0];
            const mockUri = { fsPath: '/mock/pipelines/data_science/pipeline.py' };

            await pipelineCallback(mockUri);
            await new Promise((resolve) => setImmediate(resolve));

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('kedro.restart');
        });

        it('should not trigger update when KedroViz panel is not open', async () => {
            (KedroVizPanel as any).currentPanel = undefined;

            setupKedroProjectFileWatchers(mockContext);

            const configCallback = mockWatcher.onDidChange.mock.calls[0][0];
            const mockUri = { fsPath: '/mock/conf/base/catalog.yml' };

            await configCallback(mockUri);
            await new Promise((resolve) => setImmediate(resolve));

            expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith('kedro.restart');
        });
    });
});
