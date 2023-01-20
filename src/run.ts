import childProcess from 'child_process';

export async function run(binary: string, args: string[]): Promise<number> {
  return new Promise<number>((resolve) => {
    const child = childProcess.spawn(binary, args);

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  
    child.on('close', (statusCode: number) => resolve(statusCode));
  });
}

export default { run };