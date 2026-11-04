import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { inspect } from 'node:util';

import { InstagramApiError } from '../lib/errors.js';
import {
  buildUrl,
  request,
  DEFAULT_BASE_URL,
  MAX_BODY_BYTES
} from '../lib/request.js';
import { stubFetch } from './helpers.js';

afterEach(() => mock.restoreAll());

async function rejectingFetch() {
  throw new Error('ECONNREFUSED');
}

async function timingOutFetch() {
  const error = new Error('timed out');
  error.name = 'TimeoutError';
  throw error;
}

async function nonJsonFetch() {
  return new Response('<html>oops</html>');
}

async function leakyFetch(url) {
  throw new Error(`connect to ${url} failed`);
}

test('buildUrl joins base + path and appends params, skipping nullish', () => {
  const url = buildUrl('https://graph.instagram.com/', 'me/media', {
    fields: 'id,caption',
    limit: 25,
    after: undefined
  });
  assert.equal(
    url.origin + url.pathname,
    'https://graph.instagram.com/me/media'
  );
  assert.equal(url.searchParams.get('fields'), 'id,caption');
  assert.equal(url.searchParams.get('limit'), '25');
  assert.equal(url.searchParams.has('after'), false);
});

test('request returns parsed JSON on success and forwards params', async () => {
  const fetch = stubFetch({ body: { data: [{ id: '1' }] } });
  const body = await request(DEFAULT_BASE_URL, 'me/media', {
    access_token: 't'
  });
  assert.deepEqual(body, { data: [{ id: '1' }] });
  assert.equal(fetch.calls[0].url.searchParams.get('access_token'), 't');
});

test('request throws InstagramApiError on body.error', async () => {
  stubFetch({
    status: 400,
    body: {
      error: {
        message: 'Invalid token',
        type: 'OAuthException',
        code: 190,
        fbtrace_id: 'xyz'
      }
    }
  });
  await assert.rejects(
    () => request(DEFAULT_BASE_URL, 'me', { access_token: 'bad' }),
    (err) => {
      assert.ok(err instanceof InstagramApiError);
      assert.equal(err.message, 'Invalid token');
      assert.equal(err.code, 190);
      assert.equal(err.type, 'OAuthException');
      assert.equal(err.fbtraceId, 'xyz');
      assert.equal(err.status, 400);
      return true;
    }
  );
});

test('request wraps network failures in InstagramApiError', async () => {
  mock.method(globalThis, 'fetch', rejectingFetch);
  await assert.rejects(
    () => request(DEFAULT_BASE_URL, 'me', {}),
    (err) => err instanceof InstagramApiError
  );
});

test('request maps a TimeoutError to a clear message', async () => {
  mock.method(globalThis, 'fetch', timingOutFetch);
  await assert.rejects(
    () => request(DEFAULT_BASE_URL, 'me', {}, { timeout: 50 }),
    (err) => {
      assert.ok(err instanceof InstagramApiError);
      assert.match(err.message, /timed out after 50ms/);
      return true;
    }
  );
});

test('request rejects a 2xx response with non-JSON body', async () => {
  mock.method(globalThis, 'fetch', nonJsonFetch);
  await assert.rejects(
    () => request(DEFAULT_BASE_URL, 'me', {}),
    (err) => {
      assert.ok(err instanceof InstagramApiError);
      assert.match(err.message, /Invalid JSON/);
      assert.equal(err.status, 200);
      return true;
    }
  );
});

test('request redacts the access_token from network error messages', async () => {
  mock.method(globalThis, 'fetch', leakyFetch);
  await assert.rejects(
    () => request(DEFAULT_BASE_URL, 'me', { access_token: 'SECRET' }),
    (err) => {
      assert.ok(err instanceof InstagramApiError);
      assert.doesNotMatch(err.message, /SECRET/);
      assert.match(err.message, /access_token=REDACTED/);
      return true;
    }
  );
});

test('request never leaks the access_token through err.cause or inspect', async () => {
  mock.method(globalThis, 'fetch', leakyFetch);
  await assert.rejects(
    () => request(DEFAULT_BASE_URL, 'me', { access_token: 'SECRET' }),
    (err) => {
      assert.ok(err.cause instanceof Error);
      assert.doesNotMatch(String(err.cause.message), /SECRET/);
      assert.doesNotMatch(inspect(err, { depth: null }), /SECRET/);
      return true;
    }
  );
});

test('request redacts the access_token echoed in an API error message', async () => {
  stubFetch({
    status: 400,
    body: { error: { message: 'Bad url ?access_token=SECRET&x=1' } }
  });
  await assert.rejects(
    () => request(DEFAULT_BASE_URL, 'me', { access_token: 'SECRET' }),
    (err) => {
      assert.ok(err instanceof InstagramApiError);
      assert.doesNotMatch(err.message, /SECRET/);
      return true;
    }
  );
});

test('request falls back to the HTTP status for a malformed error', async () => {
  stubFetch({ status: 502, body: { error: 'down' } });
  await assert.rejects(
    () => request(DEFAULT_BASE_URL, 'me', {}),
    (err) => {
      assert.ok(err instanceof InstagramApiError);
      assert.equal(err.message, 'HTTP 502');
      return true;
    }
  );
});

test('request rejects a body over the size ceiling', async () => {
  mock.method(
    globalThis,
    'fetch',
    async () => new Response('x'.repeat(MAX_BODY_BYTES + 1))
  );
  await assert.rejects(
    () => request(DEFAULT_BASE_URL, 'me', {}),
    (err) => {
      assert.ok(err instanceof InstagramApiError);
      assert.match(err.message, /exceeds/);
      assert.equal(err.status, 200);
      return true;
    }
  );
});

test('request parses JSON that starts with a UTF-8 BOM', async () => {
  mock.method(
    globalThis,
    'fetch',
    async () => new Response(`﻿${JSON.stringify({ id: '1' })}`)
  );
  assert.deepEqual(await request(DEFAULT_BASE_URL, 'me', {}), { id: '1' });
});

test('request rejects JSON that is not an object', async () => {
  for (const body of [[1, 2], 'text', null]) {
    stubFetch({ body });
    await assert.rejects(
      () => request(DEFAULT_BASE_URL, 'me', {}),
      (err) => {
        assert.ok(err instanceof InstagramApiError);
        assert.match(err.message, /Invalid response shape/);
        return true;
      }
    );
    mock.restoreAll();
  }
});
