import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveToken, TOKEN_ENV_VAR } from '../lib/token.js';

test('explicit token wins over env', () => {
  assert.equal(
    resolveToken('EXPLICIT', { [TOKEN_ENV_VAR]: 'ENVTOK' }),
    'EXPLICIT'
  );
});

test('falls back to env[IG_TOKEN] when token omitted', () => {
  assert.equal(
    resolveToken(undefined, { [TOKEN_ENV_VAR]: 'ENVTOK' }),
    'ENVTOK'
  );
});

test('throws TypeError when neither token nor env var present', () => {
  assert.throws(() => resolveToken(undefined, {}), TypeError);
});

test('empty-string token does not silently fall back', () => {
  assert.throws(
    () => resolveToken('', { [TOKEN_ENV_VAR]: 'ENVTOK' }),
    TypeError
  );
});
