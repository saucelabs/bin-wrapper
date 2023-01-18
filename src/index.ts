import path from 'path';
import fs from 'fs/promises';
import { Stats } from 'fs';

import { downloadAndUnpack } from './download';
import { run as runB } from './run';

type OSArchMapping = {
  os: string | undefined;
  arch: string | undefined;
  path: string;
}

export class BinWrapper {
  #sources: OSArchMapping[] = [];
  #path: string = path.join(__dirname, 'bin');
  #name = 'bin';

  src(path: string, os: string | undefined, arch: string | undefined): BinWrapper {
    this.#sources.push({ os: os, arch: arch, path: path });
    return this;
  }

  dst(path: string): BinWrapper {
    this.#path = path;
    return this;
  }

  use(name: string): BinWrapper {
    this.#name = name;
    return this;
  }

  async install() {
    if (await this.binaryPresent()) {
      return;
    }
    const downloadUrl = this.findMatchingPlatform();
    await downloadAndUnpack(new URL(downloadUrl.path), this.#name, path.join(this.#path, this.#name));
  }

  async run(args: string[]): Promise<number> {
    await this.install();
    return await runB(this.#name, args);
  }

  async binaryPresent(): Promise<boolean> {
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

  findMatchingPlatform(): OSArchMapping {
    const matches = this.#sources.filter(x => x.arch === process.arch && x.os === process.platform);
    if (matches.length == 0) {
      throw new Error(`no package found for ${process.platform}_${process.arch}`);
    }
    return matches[0];
  }

  path(): string {
    return path.join(this.#path, this.#name);
  }
}

export default BinWrapper;