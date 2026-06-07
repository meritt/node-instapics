import assert from 'node:assert/strict';
import { test } from 'node:test';

import { InstagramApiError } from '../lib/errors.js';

test('InstagramApiError carries Instagram error fields', () => {
  const err = new InstagramApiError('bad token', {
    status: 400,
    code: 190,
    type: 'OAuthException',
    fbtraceId: 'abc'
  });
  assert.ok(err instanceof Error);
  assert.equal(err.name, 'InstagramApiError');
  assert.equal(err.message, 'bad token');
  assert.equal(err.status, 400);
  assert.equal(err.code, 190);
  assert.equal(err.type, 'OAuthException');
  assert.equal(err.fbtraceId, 'abc');
});

test('InstagramApiError preserves cause', () => {
  const cause = new Error('socket reset');
  const err = new InstagramApiError('network failure', { cause });
  assert.equal(err.cause, cause);
});
