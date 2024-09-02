import * as cp from 'child_process';
import { getInterpreterDetails } from './python';

/**
 * Calls a Python script with the specified arguments.
 *
 * @param pathToScript - The path to the Python script.
 * @param scriptArgv - The arguments to pass to the script.
 * @param context - The context object.
 * @returns A promise that resolves when the script execution is complete.
 */
export async function callPythonScript(pathToScript: string, scriptArgv: string, context: any): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        const script = context.asAbsolutePath(pathToScript);
        const interpreterDetails = await getInterpreterDetails();
        const pythonPath = interpreterDetails['path'] && interpreterDetails['path'][0];

        cp.exec(`${pythonPath} ${script} ${scriptArgv}`, (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                reject(error);
            } else {
                console.log(stdout);
                resolve();
            }
        });
    });
}
