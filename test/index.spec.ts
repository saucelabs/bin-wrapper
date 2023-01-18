import path from 'path';
import axios from 'axios';
import fsPromises from 'fs/promises';
import { Stats } from 'fs';
import tarStream from 'tar-stream';
import spawk from 'spawk';

import BinWrapper from '../src/index';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
jest.mock('fs/promises');
const mockedFsPromises = fsPromises as jest.Mocked<typeof fsPromises>;

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

    bw = new BinWrapper()
      .src('http://dummy-host/dummy.tar', 'darwin', 'arm64')
      .dst(path.join(__dirname, 'bin'))
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

    await bw.install()
    expect(mockedFsPromises.stat).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedFsPromises.writeFile).toHaveBeenCalledTimes(1);
  });

  test('bin-wrapper: do not download if installed', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatSuccess);

    await bw.install()
    expect(mockedFsPromises.stat).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    expect(mockedFsPromises.writeFile).toHaveBeenCalledTimes(0);
  });

  test('bin-wrapper: exists but not a file', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatSuccessNotAFile);

    try {
      await bw.install()
      fail();
    } catch (e: unknown) {
      expect(e).toEqual(new Error(`${path.join(__dirname, 'bin', 'dummy')} exists but is not a file`));
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
    const interceptor = spawk.spawn('dummy').exit(0).stdout('success');

    const statusCode = await bw.run(['--arg1', '--arg2']);

    expect(mockedFsPromises.stat).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    expect(mockedFsPromises.writeFile).toHaveBeenCalledTimes(0);
    expect(statusCode).toBe(0);
    expect(interceptor.called).toBe(true);
    expect(interceptor.calledWith.command).toBe('dummy');
    expect(interceptor.calledWith.args).toEqual(['--arg1', '--arg2']);
  });

  test('bin-wrapper: execute fail', async () => {
    mockedFsPromises.stat.mockImplementation(fsStatSuccess);
    const interceptor = spawk.spawn('dummy').exit(42).stdout('success');

    const statusCode = await bw.run(['--arg1', '--arg2']);

    expect(mockedFsPromises.stat).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    expect(mockedFsPromises.writeFile).toHaveBeenCalledTimes(0);
    expect(statusCode).toBe(42);
    expect(interceptor.called).toBe(true);
    expect(interceptor.calledWith.command).toBe('dummy');
    expect(interceptor.calledWith.args).toEqual(['--arg1', '--arg2']);
  });
});
