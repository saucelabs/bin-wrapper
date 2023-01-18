import zlib from 'zlib';
import axios from 'axios';
import fsPromises from 'fs/promises';
import tarStream from 'tar-stream';

import { downloadAndUnpack } from '../src/download';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
jest.mock('fs/promises');
const mockedFsPromises = fsPromises as jest.Mocked<typeof fsPromises>;

let tarBuffer: Buffer = Buffer.from('');
let gzTarBuffer: Buffer = Buffer.from('');

describe('downloads', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async (): Promise<void> => {
    return new Promise<void>((resolve) => {
      const pack = tarStream.pack();
      pack.on('data', (data: Buffer) => {
        tarBuffer = Buffer.concat([tarBuffer, data]);
      });
      pack.on('end', () => {
        resolve();
      });
      pack.entry({ name: 'dummy.txt' }, 'dummy-content');
      pack.finalize();
    }).then(() => {
      gzTarBuffer = zlib.gzipSync(tarBuffer);
    });
  });

  test('Complete setup - tar', async () => {
    mockedAxios.get.mockImplementation((): Promise<unknown> => {
      return new Promise((resolve) => {
        resolve({ data: tarBuffer });
      });
    });
    let usedFilename = '';
    let usedBody = Buffer.from('');

    mockedFsPromises.writeFile.mockImplementation((file: string | any, content: ArrayBuffer | any) => {
      return new Promise((resolve) => {
        usedFilename = file;
        usedBody = content;
        resolve();
      });
    });
    await downloadAndUnpack(new URL('http:/dummy-host/archive.tar'), 'dummy.txt', 'dummy.txt');
    expect(usedFilename).toBe('dummy.txt');
    expect(usedBody).toEqual(Buffer.from('dummy-content'));
  });

  test('Complete setup - tar - gz', async () => {
    mockedAxios.get.mockImplementation((): Promise<unknown> => {
      return new Promise((resolve) => {
        resolve({ data: gzTarBuffer });
      });
    });
    let usedFilename = '';
    let usedBody = Buffer.from('');

    mockedFsPromises.writeFile.mockImplementation((file: string | any, content: ArrayBuffer | any) => {
      return new Promise((resolve) => {
        usedFilename = file;
        usedBody = content;
        resolve();
      });
    });
    await downloadAndUnpack(new URL('http:/dummy-host/archive.tar'), 'dummy.txt', 'dummy.txt');
    expect(usedFilename).toBe('dummy.txt');
    expect(usedBody).toEqual(Buffer.from('dummy-content'));
  });

  test('file not supported', async () => {
    mockedAxios.get.mockImplementation((): Promise<unknown> => {
      return new Promise((resolve) => {
        resolve({ data: Buffer.from('non-expected-content') });
      });
    });

    try {
      await downloadAndUnpack(new URL('http:/dummy-host/archive.tar'), 'dummy.txt', 'dummy.txt');
      fail();
    } catch (e) {
      expect(e).toEqual(new Error('unrecognized archive kind'))
    }
  });

  test('File not available', async () => {
    mockedAxios.get.mockImplementation((): Promise<unknown> => {
      return new Promise((resolve) => {
        resolve({ data: tarBuffer });
      });
    });

    try {
      await downloadAndUnpack(new URL('http://dummy-host/archive.tar'), 'invalid-file', 'invalid-file');
      fail();
    } catch (e) {
      expect(e).toEqual(new Error('unable to find invalid-file in http://dummy-host/archive.tar'))
    }
  });

  test('Buggy download', async () => {
    mockedAxios.get.mockImplementation((): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        reject('network-connection-broken');
      });
    });

    try {
      await downloadAndUnpack(new URL('http://dummy-host/archive.tar'), 'invalid-file', 'invalid-file');
      fail();
    } catch (e) {
      expect(e).toEqual(new Error('failed to download: network-connection-broken'))
    }
  });
});