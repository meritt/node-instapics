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

test('drops urls that are not https', () => {
  const out = normalizeMedia({
    id: '1',
    media_type: 'IMAGE',
    media_url: 'javascript:alert(1)',
    permalink: 'http://p/1'
  });
  assert.equal(out.url, null);
  assert.equal(out.thumbnail, null);
  assert.equal(out.permalink, null);

  const video = normalizeMedia({
    id: '2',
    media_type: 'VIDEO',
    media_url: 'data:video/mp4;base64,AA',
    thumbnail_url: 'https://t/2.jpg'
  });
  assert.equal(video.url, null);
  assert.equal(video.thumbnail, 'https://t/2.jpg');
});

test('album tolerates malformed children', () => {
  const broken = normalizeMedia({
    id: '10',
    media_type: 'CAROUSEL_ALBUM',
    media_url: 'https://img/cover.jpg',
    children: { data: 'nope' }
  });
  assert.equal(broken.url, 'https://img/cover.jpg');
  assert.equal(broken.thumbnail, 'https://img/cover.jpg');
  assert.deepEqual(broken.items, []);

  const holes = normalizeMedia({
    id: '11',
    media_type: 'CAROUSEL_ALBUM',
    children: {
      data: [
        null,
        { media_type: 'IMAGE', media_url: 'https://img/a.jpg' },
        { media_type: 'IMAGE', media_url: 'http://img/b.jpg' }
      ]
    }
  });
  assert.equal(holes.url, 'https://img/a.jpg');
  assert.deepEqual(holes.items, [{ type: 'photo', url: null }]);

  const fallback = normalizeMedia({
    id: '12',
    media_type: 'CAROUSEL_ALBUM',
    media_url: 'https://img/cover.jpg',
    children: {
      data: [
        { media_type: 'IMAGE', media_url: 'http://img/a.jpg' },
        {
          media_type: 'VIDEO',
          media_url: 'http://vid/b.mp4',
          thumbnail_url: 'https://t/b.jpg'
        }
      ]
    }
  });
  assert.equal(fallback.url, 'https://img/cover.jpg');
  assert.deepEqual(fallback.items, [{ type: 'video', url: 'https://t/b.jpg' }]);
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
