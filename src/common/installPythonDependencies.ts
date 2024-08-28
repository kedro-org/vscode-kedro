import * as cp from 'child_process';
import { getInterpreterDetails } from './python';
import { EXTENSION_ROOT_DIR } from './constants';

export async function installPythonDependencies(context: any): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        const script = context.asAbsolutePath('bundled/tool/install_dependencies.py');
        const interpreterDetails = await getInterpreterDetails();
        const pythonPath = interpreterDetails['path'] && interpreterDetails['path'][0];

        cp.exec(`${pythonPath} ${script} ${EXTENSION_ROOT_DIR}`, (error, stdout, stderr) => {
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
