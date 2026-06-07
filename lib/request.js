import { InstagramApiError } from './errors.js';

export const DEFAULT_BASE_URL = 'https://graph.instagram.com';

function removeToken(text) {
  return text.replace(/(access_token=)[^&\s]+/gi, '$1REDACTED');
}

function sanitizeCause(cause) {
  if (!(cause instanceof Error)) {
    return undefined;
  }

  const safe = new Error(removeToken(String(cause.message ?? '')));
  safe.name = cause.name;

  const code = cause.code ?? cause.cause?.code;
  if (code !== undefined) {
    safe.code = code;
  }

  return safe;
}

export function buildUrl(baseUrl, path, params = {}) {
  const base = baseUrl.replace(/\/+$/, '');
  const cleanPath = String(path).replace(/^\/+/, '');
  const url = new URL(`${base}/${cleanPath}`);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

export async function request(baseUrl, path, params = {}, { timeout } = {}) {
  const url = buildUrl(baseUrl, path, params);
  const init = timeout ? { signal: AbortSignal.timeout(timeout) } : {};

  let response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    const message =
      cause?.name === 'TimeoutError'
        ? `Request timed out after ${timeout}ms`
        : `Network request failed: ${removeToken(String(cause?.message ?? cause))}`;
    throw new InstagramApiError(message, { cause: sanitizeCause(cause) });
  }

  let body;
  let parseFailed = false;
  try {
    body = await response.json();
  } catch {
    body = {};
    parseFailed = true;
  }

  if (!response.ok || body?.error) {
    const error = body?.error ?? {};

    throw new InstagramApiError(error.message || `HTTP ${response.status}`, {
      status: response.status,
      code: error.code,
      type: error.type,
      fbtraceId: error.fbtrace_id
    });
  }

  if (parseFailed) {
    throw new InstagramApiError('Invalid JSON in response', {
      status: response.status
    });
  }

  return body;
}
