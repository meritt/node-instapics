import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeMedia, normalizeProfile } from '../lib/normalize.js';

test('normalizes a photo; thumbnail is the full image url', () => {
  const out = normalizeMedia({
    id: '1',
    media_type: 'IMAGE',
    media_url: 'https://img/1.jpg',
    permalink: 'https://p/1',
    caption: 'hi',
    timestamp: '2026-01-01T00:00:00+0000'
  });
  assert.deepEqual(out, {
    id: '1',
    type: 'photo',
    url: 'https://img/1.jpg',
    thumbnail: 'https://img/1.jpg',
    caption: 'hi',
    permalink: 'https://p/1',
    timestamp: '2026-01-01T00:00:00+0000'
  });
});

test('normalizes a feed video; thumbnail is the API poster', () => {
  const out = normalizeMedia({
    id: '2',
    media_type: 'VIDEO',
    media_product_type: 'FEED',
    media_url: 'https://vid/2.mp4',
    thumbnail_url: 'https://t/2.jpg'
  });
  assert.equal(out.type, 'video');
  assert.equal(out.url, 'https://vid/2.mp4');
  assert.equal(out.thumbnail, 'https://t/2.jpg');
});

test('normalizes a reel (VIDEO + media_product_type REELS) to type reel', () => {
  const out = normalizeMedia({
    id: '3',
    media_type: 'VIDEO',
    media_product_type: 'REELS',
    media_url: 'https://vid/3.mp4',
    thumbnail_url: 'https://t/3.jpg'
  });
  assert.equal(out.type, 'reel');
  assert.equal(out.url, 'https://vid/3.mp4');
  assert.equal(out.thumbnail, 'https://t/3.jpg');
});

test('normalizes an album: first child for url/thumbnail, rest as items', () => {
  const out = normalizeMedia({
    id: '10',
    media_type: 'CAROUSEL_ALBUM',
    permalink: 'https://p/10',
    caption: 'album',
    timestamp: '2026-01-01T00:00:00+0000',
    children: {
      data: [
        { media_type: 'IMAGE', media_url: 'https://img/a.jpg' },
        { media_type: 'IMAGE', media_url: 'https://img/b.jpg' },
        {
          media_type: 'VIDEO',
          media_url: 'https://vid/c.mp4',
          thumbnail_url: 'https://t/c.jpg'
        }
      ]
    }
  });
  assert.equal(out.type, 'album');
  assert.equal(out.url, 'https://img/a.jpg');
  assert.equal(out.thumbnail, 'https://img/a.jpg');
  assert.deepEqual(out.items, [
    { type: 'photo', url: 'https://img/b.jpg' },
    { type: 'video', url: 'https://vid/c.mp4' }
  ]);
});

test('normalizes the profile', () => {
  const out = normalizeProfile({
    id: '1',
    username: 'me',
    account_type: 'BUSINESS',
    media_count: 42
  });
  assert.deepEqual(out, {
    id: '1',
    username: 'me',
    account: 'BUSINESS',
    posts: 42
  });
});
