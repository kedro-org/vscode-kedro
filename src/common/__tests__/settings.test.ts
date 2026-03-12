/**
 * Unit tests for resolveWorkspacePath in settings.ts
 */

import * as path from 'path';
import { Uri } from 'vscode';
import { resolveWorkspacePath } from '../settings';

jest.mock('../vscodeapi', () => ({
    getWorkspaceFolders: jest.fn(() => []),
    getConfiguration: jest.fn(),
}));

jest.mock('../python', () => ({
    getInterpreterDetails: jest.fn(),
}));

const mockWorkspace = {
    uri: { fsPath: '/workspace/root' } as Uri,
    name: 'root',
    index: 0,
};

describe('resolveWorkspacePath', () => {
    describe('empty / falsy values', () => {
        it('returns empty string unchanged', () => {
            expect(resolveWorkspacePath('', mockWorkspace)).toBe('');
        });
    });

    describe('absolute paths', () => {
        it('leaves absolute paths unchanged', () => {
            expect(resolveWorkspacePath('/some/absolute/path', mockWorkspace)).toBe('/some/absolute/path');
        });

        it('leaves absolute paths unchanged when no workspace provided', () => {
            expect(resolveWorkspacePath('/absolute/path')).toBe('/absolute/path');
        });
    });

    describe('${workspaceFolder} substitution', () => {
        it('resolves ${workspaceFolder}/sub/path', () => {
            expect(resolveWorkspacePath('${workspaceFolder}/pipelines/medical-review', mockWorkspace)).toBe(
                '/workspace/root/pipelines/medical-review',
            );
        });

        it('resolves bare ${workspaceFolder}', () => {
            expect(resolveWorkspacePath('${workspaceFolder}', mockWorkspace)).toBe('/workspace/root');
        });
    });

    describe('relative paths', () => {
        it('resolves relative path against workspace folder', () => {
            expect(resolveWorkspacePath('pipelines/medical-review', mockWorkspace)).toBe(
                path.join('/workspace/root', 'pipelines/medical-review'),
            );
        });

        it('resolves single-segment relative path', () => {
            expect(resolveWorkspacePath('my-kedro-project', mockWorkspace)).toBe(
                path.join('/workspace/root', 'my-kedro-project'),
            );
        });

        it('leaves relative path as-is when no workspace provided', () => {
            expect(resolveWorkspacePath('pipelines/medical-review')).toBe('pipelines/medical-review');
        });
    });

    describe('${userHome} substitution', () => {
        it('resolves ${userHome}', () => {
            const home = process.env.HOME || process.env.USERPROFILE || '';
            expect(resolveWorkspacePath('${userHome}/projects/kedro')).toBe(`${home}/projects/kedro`);
        });
    });
});
