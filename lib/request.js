import { InstagramApiError } from './errors.js';

export const DEFAULT_BASE_URL = 'https://graph.instagram.com';
export const MAX_BODY_BYTES = 5 * 1024 * 1024;

function removeToken(text) {
  return text.replace(/(access_token=)[^&\s]+/gi, '$1REDACTED');
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

function failure(cause, { timeout }) {
  if (cause instanceof InstagramApiError) {
    return cause;
  }

  const message =
    cause?.name === 'TimeoutError'
      ? `Request timed out after ${timeout}ms`
      : `Network request failed: ${removeToken(String(cause?.message ?? cause))}`;

  return new InstagramApiError(message, { cause: sanitizeCause(cause) });
}

async function readText(response) {
  if (!response.body) {
    return '';
  }

  const decoder = new TextDecoder();
  let text = '';
  let size = 0;

  for await (const chunk of response.body) {
    size += chunk.byteLength;

    if (size > MAX_BODY_BYTES) {
      throw new InstagramApiError(`Response exceeds ${MAX_BODY_BYTES} bytes`, {
        status: response.status
      });
    }

    text += decoder.decode(chunk, { stream: true });
  }

  return text + decoder.decode();
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function buildUrl(baseUrl, path, params = {}) {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${path}`);

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
  let text;
  try {
    response = await fetch(url, init);
    text = await readText(response);
  } catch (cause) {
    throw failure(cause, { timeout });
  }

  const body = parseJson(text);

  if (!response.ok || body?.error) {
    const error = isObject(body?.error) ? body.error : {};
    const message =
      typeof error.message === 'string' && error.message
        ? removeToken(error.message)
        : `HTTP ${response.status}`;

    throw new InstagramApiError(message, {
      status: response.status,
      code: error.code,
      type: error.type,
      fbtraceId: error.fbtrace_id
    });
  }

  if (!isObject(body)) {
    throw new InstagramApiError(
      body === undefined
        ? 'Invalid JSON in response'
        : 'Invalid response shape',
      { status: response.status }
    );
  }

  return body;
}
