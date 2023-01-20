import spawk from 'spawk';

import { run } from '../src/run';

describe('Run', () => {
  beforeEach(() => {
    spawk.load();
  });

  afterEach(() => {
    spawk.unload();
  });

  test('run: returns failure', async () => {
    spawk.spawn('xx').exit(42).stdout('failed');
    const statusCode = await run('xx', ['yy', 'zz'])
    expect(statusCode).toBe(42);
  });

  test('run: returns success', async () => {
    spawk.spawn('xx').exit(0).stdout('failed');
    const statusCode = await run('xx', ['yy', 'zz'])
    expect(statusCode).toBe(0);
  });
});