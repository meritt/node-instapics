# instapics

[![NPM version][npm-image]][npm-url]
[![Build status][github-actions-image]][github-actions-url]
[![Coverage status][coveralls-image]][coveralls-url]
[![Dependency status][libraries-image]][libraries-url]

Fetch your own Instagram photos, videos, and Reels normalized to a flat shape. `instapics` is a small, zero-dependency client for the [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login).

## Requirements

- Node.js ≥ 26.13
- A **professional** Instagram account and a Meta app with **Instagram Login**

## Installation

```bash
pnpm add instapics
# or: npm install instapics
```

## Usage

```js
import { Instapics } from 'instapics';

const ig = new Instapics({ token: process.env.IG_TOKEN });

const me = await ig.profile();
// { id, username, account, posts }

const media = await ig.media(25);
// 25 latest, any type
const photos = await ig.photos(25);
// images and albums
const videos = await ig.videos(25);
// feed videos, excluding Reels
const reels = await ig.reels(25);
// Reels only

const one = await ig.item('17895695668004550');
// a single item by id

for (const photo of photos) {
  console.log(photo.type, photo.url, photo.caption, photo.timestamp);
}
```

`media`, `photos`, `videos`, and `reels` return flat arrays — pagination and media-type filtering run inside the client, so you ask for `n` and get up to `n` back. The `url` and `thumbnail` fields point at Instagram's CDN.

## Media shape

Every item carries a `thumbnail` image url: the full-size image for photos and albums, the poster frame for videos and Reels.

```js
// photo
{ id, type: 'photo', url, thumbnail, caption, permalink, timestamp }

// video — type is 'reel' for Reels
{ id, type: 'video', url, thumbnail, caption, permalink, timestamp }

// album (carousel, counted as a photo)
{ id, type: 'album', url, thumbnail, items, caption, permalink, timestamp }
//   url, thumbnail  — the first child of the carousel
//   items           — the rest, as [{ type, url }, ...]
```

Missing fields are `null`.

## Tokens

The token comes from the `token` option, falling back to `process.env.IG_TOKEN`:

```js
new Instapics({ token }); // explicit
new Instapics(); // from process.env.IG_TOKEN
new Instapics({ env: mySecrets }); // from a custom { IG_TOKEN } source
```

Long-lived tokens last ~60 days. Refresh before expiry and the client switches to the new token automatically:

```js
const { token, expires } = await ig.refresh(); // expires is a Temporal.Instant
```

## API

### `new Instapics(options)`

| Option    | Default                       | Meaning                                 |
| --------- | ----------------------------- | --------------------------------------- |
| `token`   | `env.IG_TOKEN`                | Long-lived access token                 |
| `env`     | `process.env`                 | Object to read `IG_TOKEN` from          |
| `baseUrl` | `https://graph.instagram.com` | API host                                |
| `timeout` | `30000`                       | Per-request timeout in ms; `0` disables |

Throws if no token resolves from `token` or `env`.

### Methods

| Method               | Returns                                      |
| -------------------- | -------------------------------------------- |
| `profile()`          | `{ id, username, account, posts }`           |
| `media(count = 25)`  | latest media of any type                     |
| `photos(count = 25)` | latest photos (images and albums)            |
| `videos(count = 25)` | latest feed videos (excludes Reels)          |
| `reels(count = 25)`  | latest Reels                                 |
| `item(id)`           | a single media object by numeric id          |
| `refresh()`          | `{ token, expires }`, and updates the client |

`count` is an integer from `0` to `1000`. `photos`, `videos`, and `reels` scan up to the 2500 most recent posts to fill it, so a rare type may return fewer.

### Errors

A failed request throws `InstagramApiError`, whether from an HTTP error, a network failure, or a timeout:

```js
{
  (message, status, code, type, fbtraceId);
}
```

## Rate limits

The Instagram Login API allows roughly 200 requests per hour per user token. `instapics` does not retry or back off; handle `InstagramApiError` (HTTP 429) and cache results in your application.

## Author

- [Alexey Simonenko](https://github.com/meritt)

## License

MIT. See `LICENSE`.

[npm-image]: https://img.shields.io/npm/v/instapics.svg?style=flat
[npm-url]: https://www.npmjs.com/package/instapics
[github-actions-image]: https://github.com/meritt/node-instapics/actions/workflows/ci.yml/badge.svg
[github-actions-url]: https://github.com/meritt/node-instapics/actions/workflows/ci.yml
[coveralls-image]: https://coveralls.io/repos/github/meritt/node-instapics/badge.svg?branch=main
[coveralls-url]: https://coveralls.io/github/meritt/node-instapics?branch=main
[libraries-image]: https://img.shields.io/librariesio/release/npm/instapics.svg?style=flat
[libraries-url]: https://libraries.io/npm/instapics
