import * as vscode from 'vscode';
import KedroVizPanel from './vizWebView';
import { sendHeapEventWithMetadata } from '../common/telemetry';
import { LanguageClient } from 'vscode-languageclient/node';
import { checkKedroViz, installKedroViz } from '../common/utilities';
import { executeGetProjectDataCommand } from '../common/commands';

async function createOrShowKedroVizPanel(
    context: vscode.ExtensionContext,
    lsClient: LanguageClient | undefined,
): Promise<void> {
    KedroVizPanel.createOrShow(context.extensionUri);
    const projectData = await executeGetProjectDataCommand(lsClient);
    KedroVizPanel.currentPanel?.updateData(projectData);
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
            detail: 'Kedro-Viz is needed to visualize your project\'s data pipeline. It’s not installed in your virtual environment. Click ""Install" to set it up.',
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
        }
        vscode.window.showInformationMessage(
            'You can install Kedro-Viz later manually with "pip install kedro-viz". It is necessary to visualize your Pipeline.',
        );
        return;
    }
}
