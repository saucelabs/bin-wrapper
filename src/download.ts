import fsPromises from 'fs/promises';
import axios from 'axios';
import path from 'path';

import gzip from './archive/gzip';
import zip from './archive/zip';
import tar from './archive/tar';

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
  if (gzip.isGzip(buf)) {
    buf = await gzip.gunzip(buf);
  }

  const unarchiveMapping: {
    detector: ((b: Buffer) => boolean);
    unarchive: ((b: Buffer) => Promise<FileEntry[]>);
  }[] = [
    { detector: tar.isTar, unarchive: tar.unpackTar},
    { detector: zip.isZip, unarchive: zip.unpackZip},
  ];

  for (const it of unarchiveMapping) {
    if (it.detector(buf)) {
      return await it.unarchive(buf);
    }
  }
  throw new Error(`unregcognized archive`);
}

async function save(file: FileEntry, install: string) {
  const completePath = path.join(__dirname, install);
  const baseDir = path.dirname(completePath);

  // FIXME: Add try-catch
  await fsPromises.mkdir(baseDir, { recursive: true });
  await fsPromises.writeFile(completePath, file.data);
  await fsPromises.chmod(completePath, 0o755);
}

export { downloadAndUnpack, download, FileEntry };