import zlib from 'zlib';

import gzip from '../../src/archive/gzip';

const refContent = 'dummy-content';
let gzipped: Buffer;

describe('gzip', () => {
  beforeAll(() => {
    gzipped = zlib.gzipSync(Buffer.from(refContent));
  });

  test('isGzip: empty buffer', () => {
    expect(gzip.isGzip(Buffer.from(''))).toBe(false);
  });

  test('isGzip: gzip buffer', () => {
    expect(gzip.isGzip(gzipped)).toBe(true);
  });

  test('isGzip: raw text', () => {
    expect(gzip.isGzip(Buffer.from(refContent))).toBe(false);
  });

  test('gunzip: valid payload', async () => {
    expect((await gzip.gunzip(gzipped)).toString()).toEqual(refContent);
  });

  test('gunzip: invalid payload', async () => {
    try {
      await gzip.gunzip(Buffer.from(refContent));
      fail();
    } catch (e) {
      expect(e).toBe('unable to gunzip payload');
    }
  });
});
