/**
 * Jest setup file
 */

// Mock the VS Code API
jest.mock('vscode');

// Mock the logging module
jest.mock('../common/log/logging', () => ({
    traceLog: jest.fn(),
    traceError: jest.fn(),
    traceWarn: jest.fn(),
    traceInfo: jest.fn(),
    traceVerbose: jest.fn(),
}));

// Mock the KedroVizPanel
jest.mock('../webview/vizWebView', () => ({
    default: {
        currentPanel: undefined,
    },
}));
