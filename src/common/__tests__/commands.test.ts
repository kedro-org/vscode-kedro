import * as vscode from 'vscode';
import { executeDebugNodeWithNewNotebookCommand } from '../commands';

// Mirrors the enum-like shape exported by vscode-languageclient.
/* eslint-disable @typescript-eslint/naming-convention */
jest.mock('vscode-languageclient/node', () => ({
    State: {
        Running: 2,
    },
}));
/* eslint-enable @typescript-eslint/naming-convention */

jest.mock('../utilities', () => ({
    discoverKedroProjects: jest.fn(),
    getKedroProjectPath: jest.fn(),
    isKedroProject: jest.fn(),
    updateKedroVizPanel: jest.fn(),
}));

describe('executeDebugNodeWithNewNotebookCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (vscode.workspace.openNotebookDocument as jest.Mock).mockResolvedValue({ uri: 'untitled:notebook' });
    });

    it('creates a notebook using the canonical node name from the webview context', async () => {
        await executeDebugNodeWithNewNotebookCommand({
            canonicalName: 'reporting.make_cancel_policy_bar_chart__7c6d9304',
            type: 'task',
        });

        expect(vscode.workspace.openNotebookDocument).toHaveBeenCalledWith(
            'jupyter-notebook',
            expect.objectContaining({
                cells: [
                    expect.objectContaining({
                        value: expect.stringContaining(
                            '%load_node reporting.make_cancel_policy_bar_chart__7c6d9304',
                        ),
                        languageId: 'python',
                    }),
                ],
            }),
        );
        expect(vscode.window.showNotebookDocument).toHaveBeenCalledWith(
            { uri: 'untitled:notebook' },
            {
                preview: false,
                viewColumn: vscode.ViewColumn.Active,
            },
        );
    });

    it('rejects non-task node payloads', async () => {
        await executeDebugNodeWithNewNotebookCommand({
            canonicalName: 'companies',
            type: 'data',
        });

        expect(vscode.workspace.openNotebookDocument).not.toHaveBeenCalled();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            'Debug node notebook currently supports task nodes only.',
        );
    });

    it('shows a message when the payload has no node name', async () => {
        await executeDebugNodeWithNewNotebookCommand({ type: 'task' });

        expect(vscode.workspace.openNotebookDocument).not.toHaveBeenCalled();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Missing canonical Kedro task node name.');
    });
});
