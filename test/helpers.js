import { mock } from 'node:test';

export function stubFetch(handler) {
  const calls = [];
  const m = mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(input);
    calls.push({ url, init });

    const { status = 200, body = {} } =
      typeof handler === 'function' ? handler(url, calls.length - 1) : handler;

    return new Response(JSON.stringify(body), { status });
  });

  m.calls = calls;
  return m;
}
