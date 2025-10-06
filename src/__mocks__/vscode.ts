/**
 * Manual mock for the 'vscode' module
 */

export const workspace = {
    getConfiguration: jest.fn(),
    createFileSystemWatcher: jest.fn(),
};

export const commands = {
    executeCommand: jest.fn(),
};
