import tar from '../../src/archive/tar';
import tarStream from 'tar-stream';

let tarBuffer: Buffer = Buffer.from('');
let randomContent: Buffer = Buffer.from('');

describe('gzip', () => {
  beforeAll(() => {
    for (let i = 0; i < 20; i++) {
      const str = Math.random().toString(36);
      randomContent = Buffer.concat([randomContent, Buffer.from(str)]);
    }
  });

  beforeAll(async (): Promise<void> => {
    return new Promise((resolve) => {
      const pack = tarStream.pack();
      pack.on('data', (data: Buffer) => {
        tarBuffer = Buffer.concat([tarBuffer, data]);
      });
      pack.on('end', () => {
        resolve();
      });
      pack.entry({ name: 'dummy.txt' }, 'dummy-content');
      pack.finalize();
    });
  });

  test('isTar: empty buffer', () => {
    expect(tar.isTar(Buffer.from(''))).toBe(false);
  });

  test('isTar: tar buffer', () => {
    expect(tar.isTar(tarBuffer)).toBe(true);
  });

  test('isTar: raw text', () => {
    expect(tar.isTar(randomContent)).toBe(false);
  });

  test('unpackTar: valid payload', async () => {
    const files = await tar.unpackTar(tarBuffer);
    expect(files).toEqual([
      { path: 'dummy.txt', data: Buffer.from('dummy-content') },
    ]);
  });

  test('unpackTar: invalid payload', async () => {
    try {
      await tar.unpackTar(randomContent);
      fail();
    } catch (e) {
      expect(e).toStrictEqual(new Error('Unexpected end of data'));
    }
  });
});