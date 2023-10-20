import path from 'path';
import fs from 'fs/promises';
import { Stats } from 'fs';

import { OutputStreams } from './run';
import { downloadAndUnpack } from './download';
import { run as runB } from './run';

type OS =
  | 'aix'
  | 'darwin'
  | 'freebsd'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32';
type Arch =
  | 'arm'
  | 'arm64'
  | 'ia32'
  | 'mips'
  | 'mipsel'
  | 'ppc'
  | 'ppc64'
  | 's390'
  | 's390x'
  | 'x64';

export type Headers = {
  [key: string]: string;
};

export type HttpOptions = {
  headers?: Headers;
};

type OSArchMapping = {
  path: URL;
  os: OS;
  arch: Arch;
};

export class BinWrapper {
  #httpOptions: HttpOptions = {};
  #sources: OSArchMapping[] = [];
  #path: string = path.join(__dirname, 'bin');
  #name = 'bin';

  src(path: URL, os: OS, arch: Arch): BinWrapper {
    this.#sources.push({ os: os, arch: arch, path: path });
    return this;
  }

  dest(path: string): BinWrapper {
    this.#path = path;
    return this;
  }

  use(name: string): BinWrapper {
    this.#name = name;
    return this;
  }

  httpOptions(options: HttpOptions): BinWrapper {
    this.#httpOptions = options;
    return this;
  }

  async install() {
    if (await this.#binaryPresent()) {
      return;
    }
    const downloadUrl = this.#findMatchingPlatform();
    await downloadAndUnpack(
      downloadUrl.path,
      this.#name,
      path.join(this.#path, this.#name),
      this.#httpOptions,
    );
  }

  async run(args: string[], stdio?: OutputStreams): Promise<number> {
    await this.install();
    return await runB(path.join(this.#path, this.#name), args, stdio);
  }

  async #binaryPresent(): Promise<boolean> {
    let st: Stats;
    try {
      st = await fs.stat(this.path());
    } catch (e: unknown) {
      return false;
    }
    if (!st.isFile()) {
      throw new Error(`${this.path()} exists but is not a file`);
    }
    return true;
  }

  #findMatchingPlatform(): OSArchMapping {
    const matches = this.#sources.filter(
      (x) => x.arch === process.arch && x.os === process.platform,
    );
    if (matches.length == 0) {
      throw new Error(
        `no package found for ${process.platform}_${process.arch}`,
      );
    }
    return matches[0];
  }

  path(): string {
    return path.join(this.#path, this.#name);
  }
}

export default BinWrapper;
