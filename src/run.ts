import childProcess from 'child_process';

export interface OutputStreams {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
}

export async function run(binary: string, args: string[], output?: OutputStreams): Promise<number> {
  return new Promise<number>((resolve) => {
    const child = childProcess.spawn(binary, args);

    if (output) {
      child.stdout.pipe(output.stdout);
      child.stderr.pipe(output.stderr);
    } else {
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
    }
    child.on('close', (statusCode: number) => resolve(statusCode));
  });
}

export default { run };