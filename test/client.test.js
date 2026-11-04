import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

import { Instapics } from '../lib/client.js';
import { InstagramApiError } from '../lib/errors.js';
import { stubFetch } from './helpers.js';

afterEach(() => mock.restoreAll());

function img(id) {
  return {
    id,
    media_type: 'IMAGE',
    media_url: `https://img/${id}.jpg`,
    permalink: `https://p/${id}`,
    caption: `c${id}`,
    timestamp: '2026-01-01T00:00:00+0000'
  };
}

function vid(id) {
  return {
    id,
    media_type: 'VIDEO',
    media_product_type: 'FEED',
    media_url: `https://vid/${id}.mp4`,
    thumbnail_url: `https://t/${id}.jpg`,
    permalink: `https://p/${id}`,
    caption: null,
    timestamp: '2026-01-01T00:00:00+0000'
  };
}

function reel(id) {
  return { ...vid(id), media_product_type: 'REELS' };
}

function endlessVideos(_url, i) {
  return {
    body: {
      data: [vid(String(i))],
      paging: { next: 'http://n', cursors: { after: `C${i}` } }
    }
  };
}

test('constructor requires a token', () => {
  assert.throws(() => new Instapics({ env: {} }), TypeError);
});

test('reads token from env IG_TOKEN when not passed', async () => {
  const fetch = stubFetch({ body: { username: 'me' } });
  const ig = new Instapics({ env: { IG_TOKEN: 'ENVTOK' } });
  await ig.profile();
  assert.equal(fetch.calls[0].url.searchParams.get('access_token'), 'ENVTOK');
});

test('profile() returns the normalized profile from /me', async () => {
  const fetch = stubFetch({
    body: { id: '1', username: 'me', account_type: 'BUSINESS', media_count: 42 }
  });
  const ig = new Instapics({ token: 'T' });
  const me = await ig.profile();
  assert.deepEqual(me, {
    id: '1',
    username: 'me',
    account: 'BUSINESS',
    posts: 42
  });
  assert.match(fetch.calls[0].url.pathname, /\/me$/);
});

test('media(n) returns n latest of any type, normalized', async () => {
  stubFetch({
    body: { data: [img('1'), vid('2'), img('3'), vid('4')], paging: {} }
  });
  const ig = new Instapics({ token: 'T' });
  const items = await ig.media(3);
  assert.deepEqual(
    items.map((m) => m.id),
    ['1', '2', '3']
  );
  assert.equal(items[1].type, 'video');
});

test('media() defaults to 25', async () => {
  const data = Array.from({ length: 30 }, (_, k) => img(String(k)));
  stubFetch({ body: { data, paging: {} } });
  const ig = new Instapics({ token: 'T' });
  const items = await ig.media();
  assert.equal(items.length, 25);
});

test('photos(n) collects only photos across pages (pagination hidden)', async () => {
  const pages = [
    {
      body: {
        data: [img('1'), vid('2'), img('3')],
        paging: { cursors: { after: 'A' }, next: 'http://n/1' }
      }
    },
    {
      body: { data: [vid('4'), img('5')], paging: {} } // no next → end
    }
  ];
  const fetch = stubFetch((_url, i) => pages[i]);
  const ig = new Instapics({ token: 'T' });
  const photos = await ig.photos(3);
  assert.deepEqual(
    photos.map((p) => p.id),
    ['1', '3', '5']
  );
  assert.ok(photos.every((p) => p.type === 'photo'));
  assert.equal(fetch.calls[1].url.searchParams.get('after'), 'A');
});

test('videos(n) collects feed videos and excludes reels', async () => {
  stubFetch({
    body: { data: [img('1'), vid('2'), reel('3'), vid('4')], paging: {} }
  });
  const ig = new Instapics({ token: 'T' });
  const videos = await ig.videos(5);
  assert.deepEqual(
    videos.map((v) => v.id),
    ['2', '4']
  );
  assert.ok(videos.every((v) => v.type === 'video'));
});

test('reels(n) collects only reels', async () => {
  stubFetch({
    body: { data: [img('1'), vid('2'), reel('3'), reel('5')], paging: {} }
  });
  const ig = new Instapics({ token: 'T' });
  const reels = await ig.reels(5);
  assert.deepEqual(
    reels.map((r) => r.id),
    ['3', '5']
  );
  assert.ok(reels.every((r) => r.type === 'reel'));
});

test('albums count as photos', async () => {
  const album = {
    id: '10',
    media_type: 'CAROUSEL_ALBUM',
    permalink: 'https://p/10',
    caption: null,
    timestamp: '2026-01-01T00:00:00+0000',
    children: {
      data: [{ media_type: 'IMAGE', media_url: 'https://img/a.jpg' }]
    }
  };
  stubFetch({
    body: { data: [album, vid('2')], paging: {} }
  });
  const ig = new Instapics({ token: 'T' });
  const photos = await ig.photos(5);
  assert.deepEqual(
    photos.map((p) => p.id),
    ['10']
  );
  assert.equal(photos[0].type, 'album');
});

test('filtered collectors stop at the page-scan cap (no infinite scan)', async () => {
  const fetch = stubFetch(endlessVideos);
  const ig = new Instapics({ token: 'T' });
  const photos = await ig.photos(5); // no photos exist → scan is bounded
  assert.equal(photos.length, 0);
  assert.equal(fetch.calls.length, 100); // MAX_PAGES
});

test('item(id) returns a single normalized media object', async () => {
  const fetch = stubFetch({ body: img('42') });
  const ig = new Instapics({ token: 'T' });
  const item = await ig.item('42');
  assert.equal(item.id, '42');
  assert.equal(item.type, 'photo');
  assert.match(fetch.calls[0].url.pathname, /\/42$/);
});

test('item() rejects a missing or non-numeric id', async () => {
  stubFetch({ body: {} });
  const ig = new Instapics({ token: 'T' });
  await assert.rejects(() => ig.item(), TypeError);
  await assert.rejects(() => ig.item('../me'), TypeError);
  await assert.rejects(() => ig.item('abc'), TypeError);
});

test('count must be an integer within [0, 1000]', async () => {
  stubFetch({ body: { data: [], paging: {} } });
  const ig = new Instapics({ token: 'T' });
  const empty = await ig.media(0);
  assert.equal(empty.length, 0);
  await assert.rejects(() => ig.media(Number.NaN), TypeError);
  await assert.rejects(() => ig.media(Number.POSITIVE_INFINITY), TypeError);
  await assert.rejects(() => ig.media(1.5), TypeError);
  await assert.rejects(() => ig.media(-1), RangeError);
  await assert.rejects(() => ig.media(1001), RangeError);
});

test('constructor validates timeout', () => {
  assert.throws(() => new Instapics({ token: 'T', timeout: 1.5 }), TypeError);
  assert.throws(
    () => new Instapics({ token: 'T', timeout: Number.POSITIVE_INFINITY }),
    TypeError
  );
  assert.throws(() => new Instapics({ token: 'T', timeout: -1 }), RangeError);
  assert.throws(
    () => new Instapics({ token: 'T', timeout: 2_147_483_648 }),
    RangeError
  );
  assert.ok(new Instapics({ token: 'T', timeout: 0 })); // 0 disables, valid
});

test('refresh() returns { token, expires } and updates the client token', async () => {
  const fetch = stubFetch((_url, i) =>
    i === 0
      ? { body: { access_token: 'NEW', expires_in: 5184000 } }
      : { body: { username: 'me' } }
  );
  const ig = new Instapics({ token: 'OLD' });

  const result = await ig.refresh();
  assert.equal(result.token, 'NEW');
  assert.ok(result.expires instanceof Temporal.Instant);
  const expectedMs = Temporal.Now.instant().add({
    seconds: 5184000
  }).epochMilliseconds;
  assert.ok(Math.abs(result.expires.epochMilliseconds - expectedMs) < 5000);
  assert.equal(fetch.calls[0].url.searchParams.get('access_token'), 'OLD');
  assert.equal(
    fetch.calls[0].url.searchParams.get('grant_type'),
    'ig_refresh_token'
  );

  await ig.profile();
  assert.equal(fetch.calls[1].url.searchParams.get('access_token'), 'NEW');
});

test('refresh() rejects an invalid token response and keeps the old token', async () => {
  const fetch = stubFetch({ body: { token_type: 'bearer' } });
  const ig = new Instapics({ token: 'OLD' });
  await assert.rejects(
    () => ig.refresh(),
    (e) => e instanceof InstagramApiError
  );
  await ig.profile();
  assert.equal(fetch.calls.at(-1).url.searchParams.get('access_token'), 'OLD');
});

test('item() accepts a safe integer id', async () => {
  const fetch = stubFetch({ body: img('42') });
  const ig = new Instapics({ token: 'T' });
  await ig.item(42);
  assert.match(fetch.calls[0].url.pathname, /\/42$/);
});

test('item() rejects an id that lost precision as a number', async () => {
  const fetch = stubFetch({ body: img('1') });
  const ig = new Instapics({ token: 'T' });
  // eslint-disable-next-line no-loss-of-precision
  await assert.rejects(() => ig.item(17895695668004551), TypeError);
  await assert.rejects(() => ig.item(-1), TypeError);
  await assert.rejects(() => ig.item(1.5), TypeError);
  assert.equal(fetch.calls.length, 0);
});

test('constructor requires an https baseUrl', () => {
  for (const baseUrl of [
    'http://graph.instagram.com',
    'graph.instagram.com',
    'https://proxy.example/?x=1',
    'https://proxy.example/#x',
    42
  ]) {
    assert.throws(() => new Instapics({ token: 'T', baseUrl }), TypeError);
  }
  assert.ok(new Instapics({ token: 'T', baseUrl: 'https://proxy.example' }));
});

test('constructor accepts a URL object as baseUrl', async () => {
  const fetch = stubFetch({ body: { id: '1' } });
  const ig = new Instapics({
    token: 'T',
    baseUrl: new URL('https://proxy.example/ig/')
  });
  await ig.profile();
  assert.equal(fetch.calls[0].url.pathname, '/ig/me');
});

test('constructor rejects a non-string token', () => {
  assert.throws(() => new Instapics({ token: 123 }), TypeError);
  assert.throws(() => new Instapics({ env: { IG_TOKEN: {} } }), TypeError);
});
