import path from 'path';
import fs from 'fs/promises';

import { downloadAndUnpack } from './download';
import { run as runB } from './run';

export type OSArchMapping = {
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

  async download() {
    if (await this.binaryPresent()) {
      return;
    }
    const downloadUrl = this.findMatchingPlatform();
    await downloadAndUnpack(new URL(downloadUrl.path), this.#name, path.join(this.#path, this.#name));
  }

  async run(args: string[]): Promise<number> {
    if (!this.#name) {
      throw new Error('no binary name defined');
    }
    if (!await this.binaryPresent()) {
      await this.download();
    }
    return await runB(this.#name, args);
  }

  async binaryPresent(): Promise<boolean> {
    try {
    await fs.stat(this.path());
    } catch (e: unknown) {
      return false;
    }
    return true;
  }

  findMatchingPlatform(): OSArchMapping {
    const matches = this.#sources.filter(x => x.arch === process.arch && x.os === process.platform);
    if (matches.length == 0) {
      throw new Error(`No binary found for ${process.platform}_${process.arch}`);
    }
    return matches[0];
  }

  path(): string {
    return path.join(this.#path, this.#name);
  }
}

export default BinWrapper;