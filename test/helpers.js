import { mock } from 'node:test';

export function makeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    }
  };
}

export function stubFetch(handler) {
  const calls = [];
  const m = mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(input);
    calls.push({ url, init });

    const { status = 200, body = {} } =
      typeof handler === 'function' ? handler(url, calls.length - 1) : handler;

    return makeResponse(status, body);
  });

  m.calls = calls;
  return m;
}
