import * as cp from "child_process";

/**
 * Asynchronous wrapper around {@link cp.execFile child_process.execFile}.
 *
 * Assumes output will be a string
 *
 * @param executable name of executable to run
 * @param args arguments to be passed to executable
 * @param options execution options
 */
export async function execFile(
    executable: string,
    args: string[],
    options: cp.ExecFileOptions = {}
): Promise<{ stdout: string; stderr: string }> {
    return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        cp.execFile(executable, args, options, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve({ stdout, stderr });
        });
    });
}

/**
 * Asynchronous wrapper around {@link cp.execFile child_process.execFile} running
 * Vapor Toolbox.
 * 
 * @param args array of arguments to pass to Vapor Toolbox
 * @param options execution options
 */
export async function execVapor(
    args: string[],
    options: cp.ExecFileOptions = {}
): Promise<{ stdout: string; stderr: string }> {
    return await execFile("vapor", ["new", ...args], options);
}