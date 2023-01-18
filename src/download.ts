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

async function downloadAndUnpack(url: URL, filepath: string, binary: string) {
  const payload = await download(url);
  const files = await extract(payload);

  const found = files.filter(x => x.path == filepath);
  if (found.length < 1) {
    throw new Error(`unable to find ${filepath} in ${url.toString()}`);
  }

  return await save(found[0], binary);
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

async function save(file: FileEntry, install: string) {
  const completePath = path.join(__dirname, install);
  const baseDir = path.dirname(completePath);

  // FIXME: Add try-catch
  await fsPromises.mkdir(baseDir, { recursive: true });
  await fsPromises.writeFile(completePath, file.data);
  await fsPromises.chmod(completePath, 0o755);
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