import fsPromises from 'fs/promises';
import axios from 'axios';
import path from 'path';
import zlib from 'zlib';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import tarStream from 'tar-stream';

type FileEntry = {
  data: Buffer;
  path: string;
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
  if (isGzip(buf)) {
    buf = await gunzip(buf);
  }

  const unarchiveMapping: {
    detector: ((b: Buffer) => boolean);
    unarchive: ((b: Buffer) => Promise<FileEntry[]>);
  }[] = [
    { detector: isTar, unarchive: unpackTar},
    { detector: isZip, unarchive: unpackZip},
  ];

  for (const it of unarchiveMapping) {
    if (it.detector(buf)) {
      return await it.unarchive(buf);
    }
  }
  throw new Error(`unregcognized archive`);
}

async function unpackTar(buf: Buffer): Promise<FileEntry[]> {
  return new Promise<FileEntry[]>((cb) => {

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
      .on('finish', () => cb(files))
      .on('error', () => cb([]));
  });
}

async function unpackZip(buf: Buffer): Promise<FileEntry[]> {
  const zip = new AdmZip(buf);
  return zip.getEntries().map(x => ({
    data: x.getData(),
    path: x.entryName,
  }));
}

function isGzip(b: Buffer): boolean {
  if (!b || b.byteLength < 3) {
    return false;
  }
  return b[0] === 0x1F && b[1] === 0x8B && b[2] === 0x08;
}

function isTar(b: Buffer): boolean {
  if (!b || b.byteLength < 262) {
    return false;
  }
  return b[257] === 0x75 && b[258] === 0x73 && b[259] === 0x74 && b[260] === 0x61 && b[261] === 0x72;
}

function isZip(b: Buffer): boolean {
  if (!b || b.byteLength < 3) {
    return false;
  }
  return b[0] === 0x50 && b[1] === 0x4B && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) && (b[3] === 0x04 || b[3] === 0x06 || b[3] === 0x08);
}

async function gunzip(b: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve) => {
    zlib.gunzip(b, (error, uncompressed) => {
      if (error) {
        throw new Error('unable to gunzip payload');
      }
      resolve(uncompressed);
    })
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