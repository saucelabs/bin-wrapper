import fsPromises from 'fs/promises';
import axios, { AxiosRequestConfig } from 'axios';
import path from 'path';

import gzip from './archive/gzip';
import zip from './archive/zip';
import tar from './archive/tar';

import { HttpOptions } from './index';
import { HttpsProxyAgent } from 'https-proxy-agent';

type FileEntry = {
  data: Buffer;
  path: string;
};

async function downloadAndUnpack(url: URL, filepath: string, binary: string, options: HttpOptions = {}) {
  const payload = await download(url, options);
  const files = await extract(payload);

  const found = files.filter(x => x.path == filepath);
  if (found.length < 1) {
    throw new Error(`unable to find ${filepath} in ${url.toString()}`);
  }
  return await save(found[0], binary);
}

function getHttpsProxyValue(): string | undefined {
  for (const k of Object.keys(process.env)) {
    if (k.toUpperCase() === "HTTPS_PROXY") {
      return process.env[k];
    }
  }
  return undefined;
}

async function download(url: URL, options: HttpOptions) {
  const opts: AxiosRequestConfig = {
    headers: options.headers,
    responseType: 'arraybuffer',
  };

  const httpsProxy = getHttpsProxyValue();
  if (httpsProxy) {
    opts.httpsAgent = new HttpsProxyAgent(httpsProxy);
    // Note: proxy needs to be sure that the agent is used.
    opts.proxy = false;
  }
  return await axios.get(url.toString(), opts).then((res) => {
    return res.data;
  }).catch((err) => {
    throw new Error(`failed to download: ${err}`);
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
      { detector: tar.isTar, unarchive: tar.unpackTar },
      { detector: zip.isZip, unarchive: zip.unpackZip },
    ];

  for (const it of unarchiveMapping) {
    if (it.detector(buf)) {
      return await it.unarchive(buf);
    }
  }
  throw new Error(`unrecognized archive kind`);
}

async function save(file: FileEntry, install: string) {
  const baseDir = path.dirname(install);

  // FIXME: Add try-catch
  await fsPromises.mkdir(baseDir, { recursive: true });
  await fsPromises.writeFile(install, file.data);
  await fsPromises.chmod(install, 0o755);
}

export { downloadAndUnpack, download, FileEntry };