# bin-wrapper

:warning: This package is a non-official and not a supported product.

## Install

`npm install --save @saucelabs/bin-wrapper`

## Usage

```js
import BinWrapper from '@saucelabs/bin-wrapper';

const baseUrl = 'http://dummy-host/path/to/archives';
const bw = new BinWrapper()
  .src(`${baseUrl}/dummy-darwin_arm64.tar`, 'darwin', 'arm64')
  .src(`${baseUrl}/dummy-darwin_amd64.tar`, 'darwin', 'x64')
  .src(`${baseUrl}/dummy-win64.tar`, 'win32', 'x64')
  .dst(path.join(__dirname, 'bin'))
  .use(process.platform === 'win32' ? 'dummy.exe' : 'dummy')

(async () => {
  await bw.run(['--arg1', '--arg2']);
});

```

## API

### `new BinWrapper()`

Creates a new instance of `BinWrapper`.

###  `src(path: URL, os: OS, arch: Arch): BinWrapper`

Adds a source URL for a OS / Arch.

#### Params

##### `path`

`Type: URL`

URL pointing to the archive containing the binary.


##### `os`

`Type: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32'`

OS compatibility of the archive.

##### `arch`

`Type: 'arm' | 'arm64' | 'ia32' | 'mips' | 'mipsel' | 'ppc' | 'ppc64' | 's390' | 's390x' | 'x64'`

Arch compatibility of the archive.

### `dest(path: string): BinWrapper`

Defines where to store the binary.

#### Params

##### `path`

`Type: string`

Target file location.

### `use(name: string): BinWrapper`

Defines what file of the archive to use as the binary.

#### Params

##### `path`

`Type: string`

Filename contained withing the archive.

### `install(): Promise<void>`

Installs the binary.

### `run(args: string[]): Promise<number>`

Runs the binary with the specified args.

#### Params

##### `args`

`Type: string[]`

Arguments to pass to the binary during execution.

### `path(): string`

Returns the path to the binary.