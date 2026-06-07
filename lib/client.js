import { InstagramApiError } from './errors.js';
import { normalizeMedia, normalizeProfile } from './normalize.js';
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

const isPhoto = (raw) =>
  raw.media_type === 'IMAGE' || raw.media_type === 'CAROUSEL_ALBUM';
const isReel = (raw) =>
  raw.media_type === 'VIDEO' && raw.media_product_type === 'REELS';
const isVideo = (raw) =>
  raw.media_type === 'VIDEO' && raw.media_product_type !== 'REELS';

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

    this.#token = resolveToken(token, env);
    this.#baseUrl = baseUrl;
    this.#timeout = timeout;
  }

  async profile() {
    const raw = await this.#request('me', { fields: PROFILE_FIELDS });
    return normalizeProfile(raw);
  }

  media(count = DEFAULT_COUNT) {
    return this.#collect(count, () => true);
  }

  photos(count = DEFAULT_COUNT) {
    return this.#collect(count, isPhoto);
  }

  videos(count = DEFAULT_COUNT) {
    return this.#collect(count, isVideo);
  }

  reels(count = DEFAULT_COUNT) {
    return this.#collect(count, isReel);
  }

  async item(id) {
    if (!/^\d+$/.test(String(id))) {
      throw new TypeError('item(id) requires a numeric media id');
    }

    const raw = await this.#request(String(id), { fields: MEDIA_FIELDS });

    return normalizeMedia(raw);
  }

  async refresh() {
    const body = await this.#request('refresh_access_token', {
      grant_type: 'ig_refresh_token'
    });

    if (
      typeof body.access_token !== 'string' ||
      !body.access_token ||
      typeof body.expires_in !== 'number'
    ) {
      throw new InstagramApiError(
        'Invalid refresh response: missing access_token or expires_in'
      );
    }

    this.#token = body.access_token;

    return {
      token: body.access_token,
      expires: Temporal.Now.instant().add({ seconds: body.expires_in })
    };
  }

  #request(path, params) {
    return request(
      this.#baseUrl,
      path,
      { access_token: this.#token, ...params },
      { timeout: this.#timeout }
    );
  }

  async #collect(count, accept) {
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
    for await (const raw of this.#iterator()) {
      if (!accept(raw)) {
        continue;
      }

      out.push(normalizeMedia(raw));

      if (out.length >= count) {
        break;
      }
    }

    return out;
  }

  async *#iterator() {
    const seen = new Set();

    let after;
    let pages = 0;

    for (;;) {
      const body = await this.#request('me/media', {
        fields: MEDIA_FIELDS,
        limit: PAGE_SIZE,
        after
      });

      for (const raw of body.data ?? []) {
        yield raw;
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
