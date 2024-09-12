import axios from 'axios';
import * as vscode from 'vscode';
import { PROJECT_METADATA } from './constants';

// from kedro_telemetry.plugin
interface HeapData {
    app_id: string;
    event: string;
    timestamp: string;
    properties: any;
    identity?: string;
}

const HEAP_APPID_PROD = '4039408868'; // todo: Dev server, change it back to prod
const HEAP_ENDPOINT = 'https://heapanalytics.com/api/track';
const HEAP_HEADERS = { 'Content-Type': 'application/json' };

async function sendHeapEvent(eventName: string, properties?: any, identity?: string): Promise<void> {
    const data: HeapData = {
        app_id: HEAP_APPID_PROD,
        event: eventName,
        timestamp: new Date().toISOString(),
        properties: properties || {},
    };

    if (identity) {
        data.identity = identity;
    }

    try {
        const response = await axios.post(HEAP_ENDPOINT, data, {
            headers: HEAP_HEADERS,
            timeout: 10000, // 10 seconds
        });

        // Handle the response if needed
        console.log('Heap event sent successfully:', response.status);
    } catch (error) {
        console.error('Error sending Heap event:', error);
    }
}

export const sendHeapEventWithMetadata = async (eventName: string, context: vscode.ExtensionContext): Promise<void> => {
    let projectMetadata: undefined;
    let heapUserId: string = '';
    projectMetadata = context.globalState.get(PROJECT_METADATA);
    if (projectMetadata) {
        heapUserId = projectMetadata['username'];
    }
    sendHeapEvent(eventName, projectMetadata, heapUserId);
};
