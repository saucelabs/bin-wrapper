import axios from 'axios';
import fsPromises from 'fs/promises';
import { Stats } from 'fs';
import tarStream from 'tar-stream';
import spawk from 'spawk';

import BinWrapper from '../src/index';
import * as download from '../src/download';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
jest.mock('fs/promises');
const mockedFsPromises = fsPromises as jest.Mocked<typeof fsPromises>;
jest.mock('../src/download')
const mockedDownload = download as jest.Mocked<typeof download>;

const originalOs = process.platform;
const originalArch = process.arch;
let tarBuffer: Buffer = Buffer.from('');
let bw: BinWrapper = new BinWrapper();

jest.setTimeout(15000);


const fsStatFailure = (): Promise<Stats> => {
  return new Promise((resolve, reject) => {
    reject('file not found');
  });
};

const fsStatSuccess = (): Promise<Stats> => {
  return new Promise((resolve) => {
    const st = new Stats();
    st.isFile = () => true;
    resolve(st);
  });
}

const fsStatSuccessNotAFile = (): Promise<Stats> => {
  return new Promise((resolve) => {
    const st = new Stats();
    st.isFile = () => false;
    resolve(st);
  });
}

describe('BinWrapper', () => {
  beforeAll(async (): Promise<void> => {
    return new Promise<void>((resolve) => {
      const pack = tarStream.pack();
      pack.on('data', (data: Buffer) => {
        tarBuffer = Buffer.concat([tarBuffer, data]);
      });
      pack.on('end', () => {
        resolve();
      });
      pack.entry({ name: 'dummy' }, 'dummy-content');
      pack.finalize();
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    spawk.load();
    spawk.preventUnmatched();

    mockedAxios.get.mockImplementation((): Promise<unknown> => {
      return new Promise((resolve) => {
        resolve({ data: tarBuffer });
      });
    });

    mockedFsPromises.writeFile.mockImplementation(() => {
      return new Promise((resolve) => {
        resolve();
      });
    });

    Object.defineProperty(process, 'platform', { value: 'darwin' });
    Object.defineProperty(process, 'arch', { value: 'arm64' });

    bw = new BinWrapper()
      .src(new URL('http://dummy-host/dummy.tar'), 'darwin', 'arm64')
      .dest('/tmp/binary')
      .use('dummy');
  });

  afterEach(() => {
    jest.clearAllMocks();
    spawk.unload();

    Object.defineProperty(process, 'platform', { value: originalOs });
    Object.defineProperty(process, 'arch', { value: originalArch });
  });

  test('bin-wrapper: download if not installed', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatFailure);
    mockedDownload.downloadAndUnpack.mockResolvedValue();

    await bw.install()
    expect(mockedDownload.downloadAndUnpack).toHaveBeenCalledTimes(1);
  });

  test('bin-wrapper: download if not installed + use headers', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatFailure);
    mockedDownload.downloadAndUnpack.mockResolvedValue();

    bw.httpOptions({ headers: { auth: 'Bearer XXX' } });
    await bw.install()
    expect(mockedDownload.downloadAndUnpack).toHaveBeenCalledTimes(1);
    expect(mockedDownload.downloadAndUnpack).toHaveBeenCalledWith(new URL('http://dummy-host/dummy.tar'), 'dummy', '/tmp/binary/dummy', { headers: { 'auth': "Bearer XXX" } });
  });

  test('bin-wrapper: do not download if installed', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatSuccess);

    await bw.install()
    expect(mockedDownload.downloadAndUnpack).toHaveBeenCalledTimes(0);
  });

  test('bin-wrapper: exists but not a file', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatSuccessNotAFile);

    try {
      await bw.install()
      fail();
    } catch (e: unknown) {
      expect(e).toEqual(new Error(`/tmp/binary/dummy exists but is not a file`));
    }
    expect(mockedFsPromises.stat).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    expect(mockedFsPromises.writeFile).toHaveBeenCalledTimes(0);
  });

  test('bin-wrapper: platform not found', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatFailure);

    Object.defineProperty(process, 'platform', { value: 'win32' });

    try {
      await bw.install();
      fail();
    } catch (e: unknown) {
      expect(e).toEqual(new Error('no package found for win32_arm64'));
    }
    expect(mockedFsPromises.stat).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    expect(mockedFsPromises.writeFile).toHaveBeenCalledTimes(0);
  });

  test('bin-wrapper: execute pass', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatSuccess);
    const interceptor = spawk.spawn('/tmp/binary/dummy').exit(0).stdout('success');

    const statusCode = await bw.run(['--arg1', '--arg2']);

    expect(mockedFsPromises.stat).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    expect(mockedFsPromises.writeFile).toHaveBeenCalledTimes(0);
    expect(statusCode).toBe(0);
    expect(interceptor.called).toBe(true);
    expect(interceptor.calledWith.command).toBe('/tmp/binary/dummy');
    expect(interceptor.calledWith.args).toEqual(['--arg1', '--arg2']);
  });

  test('bin-wrapper: execute fail', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatSuccess);
    const interceptor = spawk.spawn('/tmp/binary/dummy').exit(42).stdout('success');

    const statusCode = await bw.run(['--arg1', '--arg2']);

    expect(mockedFsPromises.stat).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    expect(mockedFsPromises.writeFile).toHaveBeenCalledTimes(0);
    expect(statusCode).toBe(42);
    expect(interceptor.called).toBe(true);
    expect(interceptor.calledWith.command).toBe('/tmp/binary/dummy');
    expect(interceptor.calledWith.args).toEqual(['--arg1', '--arg2']);
  });

  test('bin-wrapper: path is expected', () => {
    expect(bw.path()).toBe('/tmp/binary/dummy');
  });
});
