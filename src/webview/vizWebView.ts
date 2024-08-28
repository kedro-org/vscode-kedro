import * as vscode from 'vscode';
import { goToDefinition } from './goToDefinition';
import { LanguageClient } from 'vscode-languageclient/node';
import { executeServerDefinitionCommand } from '../common/commands';

/**
 * Manages Kedro viz webview panels
 */
export default class KedroVizPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: KedroVizPanel | undefined;

    public static readonly viewType = 'vizvscode';
    private _contentSet: boolean = false;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        if (KedroVizPanel.currentPanel) {
            KedroVizPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(KedroVizPanel.viewType, 'Kedro Viz', vscode.ViewColumn.Two, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });

        KedroVizPanel.currentPanel = new KedroVizPanel(panel, extensionUri);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        KedroVizPanel.currentPanel = new KedroVizPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            () => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables,
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'fromWebview':
                        if (message.node.type === 'data') {
                            // await executeServerDefinitionCommand(getlsClient(), message.node.text);
                            await vscode.commands.executeCommand('kedro.sendDefinitionRequest', message.node.text)
                        } else {
                            await goToDefinition(message.node);
                        }
                        return;
                }
            },
            null,
            this._disposables,
        );
    }

    public updateData(data: any) {
        // Send a message to the webview.
        this._panel.webview.postMessage({ command: 'updateData', data });
    }

    public dispose() {
        KedroVizPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        if (!this._contentSet) {
            const webview = this._panel.webview;
            this._panel.title = 'Kedro Viz';
            this._panel.webview.html = this._getHtmlForWebview(webview);
            this._contentSet = true; // Set the flag to true after setting the content
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'assets', 'index.js');

        // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Local path to css styles
        const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'assets', 'index.css');

        // Uri to load styles into webview
        const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src vscode-webview:; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: vscode-resource: data:; script-src 'nonce-${nonce}'; worker-src blob:;">

                <meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link nonce="${nonce}" href="${stylesMainUri}" rel="stylesheet">

				<title>Kedro Viz</title>
			</head>
			<body>
				 <div id="root"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
