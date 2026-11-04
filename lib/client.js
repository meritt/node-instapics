import { InstagramApiError } from './errors.js';
import { normalizeMedia, normalizeProfile, typeOf } from './normalize.js';
import { request, DEFAULT_BASE_URL } from './request.js';
import { resolveToken } from './token.js';

const MEDIA_FIELDS =
  'id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,children{media_type,media_url,thumbnail_url}';
const PROFILE_FIELDS = 'id,username,account_type,media_count';

const DEFAULT_COUNT = 25;
const MAX_COUNT = 1000;
const PAGE_SIZE = 25;
const MAX_PAGES = 100;
const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 2_147_483_647;

const PHOTOS = new Set(['photo', 'album']);
const VIDEOS = new Set(['video']);
const REELS = new Set(['reel']);

function isMediaId(id) {
  return typeof id === 'string'
    ? /^\d+$/.test(id)
    : Number.isSafeInteger(id) && id >= 0;
}

function checkMedia(raw) {
  if (raw === null || typeof raw !== 'object' || typeof raw.id !== 'string') {
    throw new InstagramApiError('Invalid response shape: media without an id');
  }

  return raw;
}

function expiryOf(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    return undefined;
  }

  try {
    return Temporal.Now.instant().add({ seconds });
  } catch {
    return undefined;
  }
}

function checkPage(body) {
  const data = body.data ?? [];

  if (!Array.isArray(data)) {
    throw new InstagramApiError('Invalid response shape: data is not a list');
  }

  return data;
}

export class Instapics {
  #token;
  #baseUrl;
  #timeout;

  constructor({
    token,
    env,
    baseUrl = DEFAULT_BASE_URL,
    timeout = DEFAULT_TIMEOUT
  } = {}) {
    if (!Number.isSafeInteger(timeout)) {
      throw new TypeError('timeout must be an integer number of milliseconds');
    }

    if (timeout < 0 || timeout > MAX_TIMEOUT) {
      throw new RangeError(`timeout must be between 0 and ${MAX_TIMEOUT} ms`);
    }

    const base = URL.parse(baseUrl);

    if (base?.protocol !== 'https:' || base.search || base.hash) {
      throw new TypeError(
        'baseUrl must be an https URL without a query or hash'
      );
    }

    this.#token = resolveToken(token, env);
    this.#baseUrl = `${base.origin}${base.pathname}`;
    this.#timeout = timeout;
  }

  async profile({ signal } = {}) {
    const raw = await this.#request('me', { fields: PROFILE_FIELDS }, signal);
    return normalizeProfile(raw);
  }

  media(count = DEFAULT_COUNT, { signal } = {}) {
    return this.#collect(count, signal);
  }

  photos(count = DEFAULT_COUNT, { signal } = {}) {
    return this.#collect(count, signal, PHOTOS);
  }

  videos(count = DEFAULT_COUNT, { signal } = {}) {
    return this.#collect(count, signal, VIDEOS);
  }

  reels(count = DEFAULT_COUNT, { signal } = {}) {
    return this.#collect(count, signal, REELS);
  }

  async item(id, { signal } = {}) {
    if (!isMediaId(id)) {
      throw new TypeError(
        'item(id) requires a media id: a string of digits or a safe integer'
      );
    }

    const raw = await this.#request(
      String(id),
      { fields: MEDIA_FIELDS },
      signal
    );

    return normalizeMedia(checkMedia(raw));
  }

  async refresh({ signal } = {}) {
    const body = await this.#request(
      'refresh_access_token',
      { grant_type: 'ig_refresh_token' },
      signal
    );

    const expires = expiryOf(body.expires_in);

    if (
      typeof body.access_token !== 'string' ||
      !body.access_token ||
      !expires
    ) {
      throw new InstagramApiError(
        'Invalid refresh response: missing access_token or expires_in'
      );
    }

    this.#token = body.access_token;

    return { token: body.access_token, expires };
  }

  #request(path, params, signal) {
    return request(
      this.#baseUrl,
      path,
      { access_token: this.#token, ...params },
      { timeout: this.#timeout, signal }
    );
  }

  async #collect(count, signal, types) {
    if (!Number.isSafeInteger(count)) {
      throw new TypeError('count must be an integer');
    }

    if (count < 0 || count > MAX_COUNT) {
      throw new RangeError(`count must be between 0 and ${MAX_COUNT}`);
    }

    if (count === 0) {
      return [];
    }

    const out = [];
    const pageSize = types
      ? () => PAGE_SIZE
      : () => Math.min(count - out.length, PAGE_SIZE);

    for await (const raw of this.#iterator(pageSize, signal)) {
      if (types && !types.has(typeOf(raw))) {
        continue;
      }

      out.push(normalizeMedia(raw));

      if (out.length >= count) {
        break;
      }
    }

    return out;
  }

  async *#iterator(pageSize, signal) {
    const seen = new Set();

    let after;
    let pages = 0;

    for (;;) {
      const body = await this.#request(
        'me/media',
        { fields: MEDIA_FIELDS, limit: pageSize(), after },
        signal
      );

      for (const raw of checkPage(body)) {
        yield checkMedia(raw);
      }

      pages += 1;

      const next = body.paging?.cursors?.after;

      if (pages >= MAX_PAGES || !body.paging?.next || !next || seen.has(next)) {
        return;
      }

      seen.add(next);
      after = next;
    }
  }
}
