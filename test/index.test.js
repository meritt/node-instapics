import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as api from '../lib/index.js';

test('public surface is exactly the client and its error', () => {
  assert.deepEqual(Object.keys(api).toSorted(), [
    'InstagramApiError',
    'Instapics'
  ]);
  assert.equal(typeof api.Instapics, 'function');
  assert.equal(typeof api.InstagramApiError, 'function');
});
