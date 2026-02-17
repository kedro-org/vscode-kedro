# Unit Testing Guide

Unit testing setup for the VS Code Kedro extension.

## Running Tests

```bash
# Run all tests
npm run test:unit

# Run tests in watch mode
npm run test:unit:watch
```

## Directory Structure

```
src/
├── __tests__/
│   ├── setup.ts              # Global test setup
│   └── README.md             # This file
├── __mocks__/
│   └── vscode.ts             # VS Code API mock
└── common/
    ├── __tests__/
    │   └── <filename>.test.ts
    └── <filename>.ts
```

## Writing Tests

### Test File Naming
- Place tests in `__tests__/` directory next to source
- Name files as `<filename>.test.ts`

### Basic Test Structure

```typescript
import * as vscode from 'vscode';
import { myFunction } from '../myModule';

describe('MyModule', () => {
    beforeEach(() => {
        // Setup mocks
    });

    it('should do something', () => {
        // Arrange
        const input = 'test';
        
        // Act
        const result = myFunction(input);
        
        // Assert
        expect(result).toBe('expected');
    });
});
```

### Mocking VS Code API

The VS Code API is automatically mocked. Just import and use:

```typescript
import * as vscode from 'vscode';

(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
    get: jest.fn(() => true),
});
```

## Adding New Tests

1. Create `__tests__/` directory next to your source file
2. Create `<filename>.test.ts`
3. Import the module and write tests
4. Run `npm run test:unit` to verify

---