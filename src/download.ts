import fs from 'fs';
import fsPromises from 'fs/promises';
import axios from 'axios';
import path from 'path';
import zlib from 'zlib';
import { Readable } from 'stream';
import tarStream from 'tar-stream';

type FileEntry = {
  data: Buffer;
  mode: number | undefined;
  mtime: Date | undefined;
  path: string;
  type: 'file' | 'link' | 'symlink' | 'character-device' | 'block-device' | 'directory' | 'fifo' | 'contiguous-file' | 'pax-header' | 'pax-global-header' | 'gnu-long-link-path' | 'gnu-long-path' | null | undefined;
  linkname: string | null | undefined;
};

async function downloadAndUnpack(url: URL, binary: string) {
  const tempFolder = await fsPromises.mkdtemp('/tmp/binWrapper-');
  const target = path.join(tempFolder, 'archive')
  if (tempFolder === '') {
    return;
    // FIXME: Raise error
  }

  const payload = await download(url);
  const files = await extract(payload);

  const found = files.filter(x => x.path == binary);
  if (found.length < 1) {
    throw new Error(`unable to find ${binary} in ${url.toString()}`);
  }

  // fsPromises.writeFile(path.join(__dirname, 'file.tar.gz'));
  // fsPromises.rm(tempFolder, { recursive: true, force: true });
}

async function download(url: URL) {
  return await axios.get(url.toString(), { responseType: 'arraybuffer' })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log(`Failed to download: ${err}`);
    });
}

async function extract(buf: Buffer): Promise<FileEntry[]> {
  return new Promise<FileEntry[]>((cb) => {

    const xtract = tarStream.extract();
    const files: FileEntry[] = [];

    xtract.on('entry', async (header, stream, next) => {
      const file: FileEntry = {
        data: await readAll(stream),
        mode: header.mode,
        mtime: header.mtime,
        path: header.name,
        type: header.type,
        linkname: undefined,
      };

      files.push(file);
      next();
    });

    Readable.from(buf)
      .pipe(zlib.createGunzip())
      .pipe(xtract)
      .on('finish', () => cb(files));
  });
}

async function readAll(stream: Readable): Promise<Buffer> {
  return new Promise((callback) => {
    const data: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => {
      data.push(chunk);
    });
    stream.on('end', () => {
      callback(Buffer.concat(data));
    })
  });
}


export { downloadAndUnpack, download };