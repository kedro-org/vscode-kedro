import * as vscode from 'vscode';
import KedroVizPanel from './vizWebView';
import { sendHeapEventWithMetadata } from '../common/telemetry';
import { LanguageClient } from 'vscode-languageclient/node';
import { checkKedroViz, installKedroViz, updateKedroVizPanel } from '../common/utilities';

async function createOrShowKedroVizPanel(
    context: vscode.ExtensionContext,
    lsClient: LanguageClient | undefined,
): Promise<void> {
    KedroVizPanel.createOrShow(context.extensionUri);
    updateKedroVizPanel(lsClient);
    await sendHeapEventWithMetadata('kedro.runKedroViz', context);
}

export async function handleKedroViz(
    context: vscode.ExtensionContext,
    lsClient: LanguageClient | undefined,
): Promise<void> {
    const isKedroVizInstalled = await checkKedroViz(context);
    if (isKedroVizInstalled) {
        createOrShowKedroVizPanel(context, lsClient);
    } else {
        const header = 'Kedro-Viz Dependency Required';
        const options: vscode.MessageOptions = {
            detail: 'Kedro-Viz version 10.1.0 or later is required to visualize your project\'s data pipeline. It’s not installed in your virtual environment. Click "Install" to set it up with pip.',
            modal: true,
        };

        const text = await vscode.window.showInformationMessage(header, options, ...['Install']);

        if (text === 'Install') {
            let installed = false;
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    cancellable: false,
                },
                async (progress) => {
                    progress.report({ message: 'Installing Kedro Viz and its Dependencies...' });
                    installed = await installKedroViz(context);
                    vscode.window.showInformationMessage('Kedro-Viz and its Dependencies installed successfully!');
                },
            );
            if (installed) {
                createOrShowKedroVizPanel(context, lsClient);
            }
            return;
        }
        vscode.window.showInformationMessage(
            'You can install Kedro-Viz later manually with "pip install kedro-viz". It is necessary to visualize your Pipeline.',
        );
        return;
    }
}
