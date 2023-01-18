import { downloadAndUnpack } from '../src/download';

describe('Download', () => {
  test('Download from github', async () => {
    jest.setTimeout(15000);
    await downloadAndUnpack(new URL('http://127.0.0.1:8080/saucectl.tar.gz'), 'saucectl', 'bin/saucectl');
  });
});