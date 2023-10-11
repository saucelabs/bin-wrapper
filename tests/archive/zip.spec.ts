import AdmZip from 'adm-zip';

import zip from '../../src/archive/zip';

let zipBuffer: Buffer;

describe('zip', () => {
  beforeAll(async (): Promise<void> => {
    const zip = new AdmZip();
    zip.addFile('dummy.txt', Buffer.from('dummy-content'));
    zipBuffer = await zip.toBufferPromise()
  });

  test('zip: empty buffer', () => {
    expect(zip.isZip(Buffer.from(''))).toBe(false);
  });

  test('zip: zip buffer', () => {
    expect(zip.isZip(zipBuffer)).toBe(true);
  });

  test('zip: raw text', () => {
    expect(zip.isZip(Buffer.from('non-zip-content'))).toBe(false);
  });
  
  test('zip: passing magic numbers', () => {
    expect(zip.isZip(Buffer.from("\x50\x4B\x03\x04"))).toBe(true)
    expect(zip.isZip(Buffer.from("\x50\x4B\x03\x06"))).toBe(true)
    expect(zip.isZip(Buffer.from("\x50\x4B\x03\x08"))).toBe(true)

    expect(zip.isZip(Buffer.from("\x50\x4B\x05\x04"))).toBe(true)
    expect(zip.isZip(Buffer.from("\x50\x4B\x05\x06"))).toBe(true)
    expect(zip.isZip(Buffer.from("\x50\x4B\x05\x08"))).toBe(true)

    expect(zip.isZip(Buffer.from("\x50\x4B\x07\x04"))).toBe(true)
    expect(zip.isZip(Buffer.from("\x50\x4B\x07\x06"))).toBe(true)
    expect(zip.isZip(Buffer.from("\x50\x4B\x07\x08"))).toBe(true)
  });

  test('unpackZip: valid payload', async () => {
    const files = await zip.unpackZip(zipBuffer);
    expect(files).toEqual([
      { path: 'dummy.txt', data: Buffer.from('dummy-content') },
    ]);
  });

  test('unpackZip: invalid payload', async () => {
    try {
      await zip.unpackZip(Buffer.from('non-zip-content'));
      fail();
    } catch (e) {
      expect(e).toStrictEqual(new Error('Invalid or unsupported zip format. No END header found'));
    }
  });
});