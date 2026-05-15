/**
 * Manual mock for the 'vscode' module
 */
/* eslint-disable @typescript-eslint/naming-convention */

export const workspace = {
    getConfiguration: jest.fn(),
    createFileSystemWatcher: jest.fn(),
    openNotebookDocument: jest.fn(),
};

export const commands = {
    executeCommand: jest.fn(),
};

export const window = {
    createOutputChannel: jest.fn(() => ({
        info: jest.fn(),
        show: jest.fn(),
    })),
    showInformationMessage: jest.fn(),
    showNotebookDocument: jest.fn(),
    showErrorMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
};

export const NotebookCellKind = {
    Code: 2,
};

export class NotebookCellData {
    constructor(
        public kind: number,
        public value: string,
        public languageId: string,
    ) {}
}

export class NotebookData {
    constructor(public cells: NotebookCellData[]) {}
}

export const ViewColumn = {
    Active: -1,
    One: 1,
};
