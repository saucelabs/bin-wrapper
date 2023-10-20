import tarStream from 'tar-stream';
import { Readable } from 'stream';

import { FileEntry } from '../download';

export async function unpackTar(buf: Buffer): Promise<FileEntry[]> {
  return new Promise<FileEntry[]>((resolve, reject) => {
    const xtract = tarStream.extract();
    const files: FileEntry[] = [];

    xtract.on('entry', async (header, stream, next) => {
      files.push({
        data: await readAll(stream),
        path: header.name,
      });
      next();
    });

    Readable.from(buf)
      .pipe(xtract)
      .on('finish', () => resolve(files))
      .on('error', (error) => reject(error));
  });
}

export function isTar(b: Buffer): boolean {
  if (!b || b.byteLength < 262) {
    return false;
  }
  return (
    b[257] === 0x75 &&
    b[258] === 0x73 &&
    b[259] === 0x74 &&
    b[260] === 0x61 &&
    b[261] === 0x72
  );
}

async function readAll(stream: Readable): Promise<Buffer> {
  return new Promise((callback) => {
    const data: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => {
      data.push(chunk);
    });
    stream.on('end', () => {
      callback(Buffer.concat(data));
    });
  });
}

export default { isTar, unpackTar };
