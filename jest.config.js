/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testMatch: ['**/src/**/__tests__/**/*.test.ts', '**/src/**/*.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/out/', '/dist/', '/webview/', '/bundled/'],
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    clearMocks: true,
};
