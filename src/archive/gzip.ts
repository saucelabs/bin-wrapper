import zlib from 'zlib';

export function isGzip(b: Buffer): boolean {
  if (!b || b.byteLength < 3) {
    return false;
  }
  return b[0] === 0x1F && b[1] === 0x8B && b[2] === 0x08;
}

export async function gunzip(b: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve) => {
    zlib.gunzip(b, (error, uncompressed) => {
      if (error) {
        throw new Error('unable to gunzip payload');
      }
      resolve(uncompressed);
    })
  });
}

export default { isGzip, gunzip };