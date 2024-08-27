import * as cp from 'child_process';
import { getInterpreterDetails } from './python';

export async function installPythonDependencies(context: any): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        const script = context.asAbsolutePath('bundled/tool/install_dependencies.py');
        const interpreterDetails = await getInterpreterDetails();
        const pythonPath = interpreterDetails['path'] && interpreterDetails['path'][0];
        const libsPath = context.asAbsolutePath('bundled/libs');

        cp.exec(`${pythonPath} ${script} ${libsPath}`, (error, stdout, stderr) => {
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
