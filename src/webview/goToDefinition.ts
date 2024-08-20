import * as vscode from 'vscode';
import { TextDocumentPositionParams } from 'vscode-languageclient';

type Message = {
    text: string;
    type: string;
};

export async function goToDefinition(message: Message) {
    const word = message.text;
    let filePattern = '**/*.yml';

    if (message.type === 'task') {
        // Looking only in pipelines folders
        filePattern = '**/pipelines/**/*.py';
    }

    const files = await vscode.workspace.findFiles(filePattern);

    for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        let match;

        while ((match = regex.exec(text)) !== null) {
            const position = document.positionAt(match.index);
            const params: TextDocumentPositionParams = {
                textDocument: { uri: document.uri.toString() },
                position,
            };

            const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeDefinitionProvider',
                document.uri,
                position,
            );

            if (definitions && definitions.length > 0) {
                await vscode.window.showTextDocument(definitions[0].uri, {
                    selection: definitions[0].range,
                    viewColumn: vscode.ViewColumn.One,
                });
                return;
            }
        }
    }

    vscode.window.showInformationMessage(`No definition found for: ${word}`);
}
