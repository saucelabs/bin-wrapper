import path from 'path';

export type OSArchMapping = {
  os: string | undefined;
  arch: string | undefined;
  path: string;
}

export class BinWrapper {
  #sources: OSArchMapping[] = [];
  #path?: string = path.join(__dirname, 'bin');
  #name?: string = 'bin';

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
    const downloadUrl = this.findMatchingPlatform();
    // fetch with got
  }

  run() {
    if (!this.binaryPresent()) {
      this.download();
    }
    // FIXME launch binary
  }

  binaryPresent(): boolean {
    return true;
  }

  findMatchingPlatform(): OSArchMapping | undefined {
    const matches = this.#sources.filter(x => x.arch === process.arch && x.os === process.platform);
    if (matches.length == 0) {
      throw new Error(`No binary found for ${process.platform}_${process.arch}`);
    }
    return matches[0];
  }
}

export default BinWrapper;