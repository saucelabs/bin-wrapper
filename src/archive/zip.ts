import AdmZip from 'adm-zip';

import { FileEntry } from '../download';

export function isZip(b: Buffer): boolean {
  if (!b || b.byteLength < 3) {
    return false;
  }
  return (
    b[0] === 0x50 &&
    b[1] === 0x4b &&
    (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) &&
    (b[3] === 0x04 || b[3] === 0x06 || b[3] === 0x08)
  );
}

export async function unpackZip(buf: Buffer): Promise<FileEntry[]> {
  const zip = new AdmZip(buf);
  return zip.getEntries().map((x) => ({
    data: x.getData(),
    path: x.entryName,
  }));
}

export default { isZip, unpackZip };
