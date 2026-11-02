import { describe, expect, test } from 'vitest';
import { latestCreate } from './latest';

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('latestCreate', () => {
  test('a lone task is current', async () => {
    const latest = latestCreate();
    expect(await latest.run(async () => 'a')).toEqual({ kind: 'current', value: 'a' });
  });

  test('an older task that finishes after a newer one is stale', async () => {
    const latest = latestCreate();
    const slow = deferred<string>();
    const first = latest.run(() => slow.promise);
    const second = await latest.run(async () => 'b');
    slow.resolve('a');
    expect(second).toEqual({ kind: 'current', value: 'b' });
    expect(await first).toEqual({ kind: 'stale' });
  });

  test('an older task that finishes before a newer one starts is still stale once the newer one has been requested', async () => {
    const latest = latestCreate();
    const slow = deferred<string>();
    const first = latest.run(() => slow.promise);
    const second = latest.run(async () => 'b');
    slow.resolve('a');
    expect(await first).toEqual({ kind: 'stale' });
    expect(await second).toEqual({ kind: 'current', value: 'b' });
  });

  test('a superseded task that fails is stale, not an error', async () => {
    const latest = latestCreate();
    const slow = deferred<string>();
    const first = latest.run(() => slow.promise);
    await latest.run(async () => 'b');
    slow.reject(new Error('late failure'));
    expect(await first).toEqual({ kind: 'stale' });
  });

  test('the latest failing task rejects', async () => {
    const latest = latestCreate();
    await expect(
      latest.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
