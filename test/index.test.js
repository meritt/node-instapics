import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as api from '../lib/index.js';

test('public surface is exported', () => {
  assert.equal(typeof api.Instapics, 'function');
  assert.equal(typeof api.InstagramApiError, 'function');
});

test('legacy/foreign names are no longer exported', () => {
  assert.equal(api.refreshLongLivedToken, undefined);
  assert.equal(api.DEFAULT_MEDIA_FIELDS, undefined);
  assert.equal(api.DEFAULT_PROFILE_FIELDS, undefined);
});
