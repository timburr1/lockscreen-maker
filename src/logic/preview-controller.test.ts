import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ErrorRender } from '../errors';
import { type PreviewState, previewControllerCreate } from './preview-controller';

type Spec = { readonly size: { readonly width: number; readonly height: number }; readonly id: string };
type Outcome = { readonly kind: 'ok'; readonly blob: Blob } | { readonly kind: 'overflow' };

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(render: (spec: Spec, image: string) => Promise<Outcome>) {
  const states: PreviewState[] = [];
  const created: string[] = [];
  const revoked: string[] = [];
  const errors: unknown[] = [];
  const controller = previewControllerCreate<Spec, string>({
    render,
    urlCreate: () => {
      const url = `blob:${created.length}`;
      created.push(url);
      return url;
    },
    urlRevoke: (url) => revoked.push(url),
    onState: (state) => states.push(state),
    onError: (_message, cause) => errors.push(cause),
    debounceMs: 200,
  });
  /** States other than the pending marker published at each request. */
  const settled = () => states.filter((state) => state.kind !== 'pending');
  return { controller, states, settled, created, revoked, errors };
}

const specA: Spec = { size: { width: 100, height: 200 }, id: 'a' };
const specB: Spec = { size: { width: 300, height: 400 }, id: 'b' };
const ok = async (): Promise<Outcome> => ({ kind: 'ok', blob: new Blob(['x']) });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('previewControllerCreate', () => {
  test('a request is pending at once, then ready after the debounce with the size it was rendered at', async () => {
    const { controller, states } = setup(ok);
    controller.request(specA, 'img');
    expect(states).toEqual([{ kind: 'pending', previous: undefined }]);
    await vi.advanceTimersByTimeAsync(200);
    expect(states).toHaveLength(2);
    expect(states[1]).toMatchObject({ kind: 'ready', size: { width: 100, height: 200 } });
  });

  test('a request without an image is pending and never renders', async () => {
    let calls = 0;
    const { controller, states } = setup(async () => {
      calls += 1;
      return ok();
    });
    controller.request(specA, undefined);
    await vi.advanceTimersByTimeAsync(1000);
    expect(states).toEqual([{ kind: 'pending', previous: undefined }]);
    expect(calls).toBe(0);
  });

  test('a request without an image cancels a render that was waiting for its debounce', async () => {
    let calls = 0;
    const { controller } = setup(async () => {
      calls += 1;
      return ok();
    });
    controller.request(specA, 'img');
    controller.request(specB, undefined);
    await vi.advanceTimersByTimeAsync(1000);
    expect(calls).toBe(0);
  });

  test('rapid requests collapse into one render of the latest spec', async () => {
    const seen: string[] = [];
    const { controller } = setup(async (spec) => {
      seen.push(spec.id);
      return ok();
    });
    controller.request(specA, 'img');
    await vi.advanceTimersByTimeAsync(100);
    controller.request(specB, 'img');
    await vi.advanceTimersByTimeAsync(200);
    expect(seen).toEqual(['b']);
  });

  test('replacing a result revokes the previous object URL, and pending keeps the previous result', async () => {
    const { controller, states, created, revoked } = setup(ok);
    controller.request(specA, 'img');
    await vi.advanceTimersByTimeAsync(200);
    controller.request(specB, 'img');
    expect(states.at(-1)).toMatchObject({ kind: 'pending', previous: { kind: 'ready', url: 'blob:0' } });
    await vi.advanceTimersByTimeAsync(200);
    expect(created).toEqual(['blob:0', 'blob:1']);
    expect(revoked).toEqual(['blob:0']);
  });

  test('a stale render that finishes late does not overwrite the newer result', async () => {
    const slow = deferred<Outcome>();
    let calls = 0;
    const { controller, settled } = setup(async () => {
      calls += 1;
      return calls === 1 ? slow.promise : ok();
    });
    controller.request(specA, 'img');
    await vi.advanceTimersByTimeAsync(200);
    controller.request(specB, 'img');
    await vi.advanceTimersByTimeAsync(200);
    slow.resolve({ kind: 'ok', blob: new Blob(['old']) });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled()).toHaveLength(1);
    expect(settled()[0]).toMatchObject({ kind: 'ready', size: { width: 300, height: 400 } });
  });

  test('a stale render that fails does not replace a newer good result with an error', async () => {
    const slow = deferred<Outcome>();
    let calls = 0;
    const { controller, settled, errors } = setup(async () => {
      calls += 1;
      return calls === 1 ? slow.promise : ok();
    });
    controller.request(specA, 'img');
    await vi.advanceTimersByTimeAsync(200);
    controller.request(specB, 'img');
    await vi.advanceTimersByTimeAsync(200);
    slow.reject(new ErrorRender('late'));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled().map((s) => s.kind)).toEqual(['ready']);
    expect(errors).toEqual([]);
  });

  test('overflow is published with the previous good render, without creating a URL', async () => {
    let calls = 0;
    const { controller, settled, created } = setup(async () => {
      calls += 1;
      return calls === 1 ? ok() : { kind: 'overflow' };
    });
    controller.request(specA, 'img');
    await vi.advanceTimersByTimeAsync(200);
    controller.request(specB, 'img');
    await vi.advanceTimersByTimeAsync(200);
    expect(settled()[1]).toMatchObject({ kind: 'overflow', previous: { kind: 'ready', url: 'blob:0' } });
    expect(created).toEqual(['blob:0']);
  });

  test('a render failure is logged and published as a render error, and any other error as an internal one', async () => {
    let calls = 0;
    const { controller, settled, errors } = setup(async () => {
      calls += 1;
      throw calls === 1 ? new ErrorRender('no canvas') : new Error('bug');
    });
    controller.request(specA, 'img');
    await vi.advanceTimersByTimeAsync(200);
    controller.request(specB, 'img');
    await vi.advanceTimersByTimeAsync(200);
    expect(settled().map((s) => (s.kind === 'error' ? s.reason : s.kind))).toEqual(['render', 'internal']);
    expect(errors).toHaveLength(2);
  });

  test('dispose cancels a pending render, revokes the current URL, and silences late results', async () => {
    const slow = deferred<Outcome>();
    let calls = 0;
    const { controller, states, settled, revoked } = setup(async () => {
      calls += 1;
      return calls === 1 ? ok() : slow.promise;
    });
    controller.request(specA, 'img');
    await vi.advanceTimersByTimeAsync(200);
    controller.request(specB, 'img');
    await vi.advanceTimersByTimeAsync(200);
    controller.dispose();
    slow.resolve({ kind: 'ok', blob: new Blob(['late']) });
    await vi.advanceTimersByTimeAsync(0);
    expect(revoked).toEqual(['blob:0']);
    expect(settled()).toHaveLength(1);

    const before = states.length;
    controller.request(specA, 'img');
    await vi.advanceTimersByTimeAsync(200);
    expect(calls).toBe(2);
    expect(states).toHaveLength(before);
  });
});
