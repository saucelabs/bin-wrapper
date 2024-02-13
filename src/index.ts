import path from 'path';
import fs from 'fs/promises';
import { Stats } from 'fs';

import { OutputStreams } from './run';
import { downloadAndUnpack } from './download';
import { run as runBinary } from './run';

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
  private options: HttpOptions = {};
  private sources: OSArchMapping[] = [];
  private binPath: string = path.join(__dirname, 'bin');
  private binName = 'bin';

  src(path: URL, os: OS, arch: Arch): BinWrapper {
    this.sources.push({ os: os, arch: arch, path: path });
    return this;
  }

  dest(path: string): BinWrapper {
    this.binPath = path;
    return this;
  }

  use(name: string): BinWrapper {
    this.binName = name;
    return this;
  }

  httpOptions(options: HttpOptions): BinWrapper {
    this.options = options;
    return this;
  }

  async install() {
    if (await this.isBinPresent()) {
      return;
    }
    const downloadUrl = this.findMatchingPlatform();
    await downloadAndUnpack(
      downloadUrl.path,
      this.binName,
      path.join(this.binPath, this.binName),
      this.options,
    );
  }

  async run(args: string[], stdio?: OutputStreams): Promise<number> {
    await this.install();
    return await runBinary(path.join(this.binPath, this.binName), args, stdio);
  }

  private async isBinPresent(): Promise<boolean> {
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

  private findMatchingPlatform(): OSArchMapping {
    const matches = this.sources.filter(
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
    return path.join(this.binPath, this.binName);
  }
}
