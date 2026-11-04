#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';

const APP_ID = process.env.IG_APP_ID;
const APP_SECRET = process.env.IG_APP_SECRET;
const REDIRECT_URI =
  process.env.IG_REDIRECT_URI ?? 'https://localhost:3000/callback';
const SCOPE = 'instagram_business_basic';

const TLS_KEY = process.env.IG_TLS_KEY ?? 'localhost-key.pem';
const TLS_CERT = process.env.IG_TLS_CERT ?? 'localhost.pem';

if (!APP_ID || !APP_SECRET) {
  console.error('Set IG_APP_ID and IG_APP_SECRET environment variables.');
  process.exit(1);
}

function loadTls() {
  try {
    return {
      key: readFileSync(TLS_KEY),
      cert: readFileSync(TLS_CERT)
    };
  } catch {
    console.error(
      `Missing TLS certificate (${TLS_KEY}, ${TLS_CERT}). Meta requires an https redirect; generate a locally-trusted certificate:
  mkcert -install && mkcert localhost
Then re-run, or point IG_TLS_KEY / IG_TLS_CERT at existing PEM files.`
    );
    process.exit(1);
  }
}

let expectedState = randomUUID();

const authorizeUrl = new URL('https://www.instagram.com/oauth/authorize');
authorizeUrl.searchParams.set('client_id', APP_ID);
authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('scope', SCOPE);
authorizeUrl.searchParams.set('state', expectedState);

async function exchangeCodeForShortLived(code) {
  const response = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code
    })
  });

  const body = await response.json();

  if (!response.ok || body.error_type || body.error) {
    throw new Error(`Short-lived exchange failed: ${JSON.stringify(body)}`);
  }

  return body.access_token;
}

async function exchangeForLongLived(shortLivedToken) {
  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', APP_SECRET);
  url.searchParams.set('access_token', shortLivedToken);

  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok || body.error) {
    throw new Error(`Long-lived exchange failed: ${JSON.stringify(body)}`);
  }

  return body;
}

const { pathname: callbackPath, port: redirectPort } = new URL(REDIRECT_URI);
const port = Number(redirectPort || 3000);

const server = createServer(loadTls(), async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);

  if (url.pathname !== callbackPath) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
    return;
  }

  try {
    const returnedState = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const oauthError = url.searchParams.get('error');

    if (!expectedState || returnedState !== expectedState) {
      throw new Error('Invalid or missing state');
    }

    if (!code) {
      throw new Error(
        oauthError ? `Authorization failed: ${oauthError}` : 'Missing ?code'
      );
    }

    expectedState = null;

    const shortLived = await exchangeCodeForShortLived(code);
    const longLived = await exchangeForLongLived(shortLived);

    console.log('\nLong-lived access token:\n', longLived.access_token);
    console.log('Expires in (seconds):', longLived.expires_in);

    res
      .writeHead(200, { 'content-type': 'text/plain' })
      .end('Token obtained. Check your terminal. You can close this tab.');
  } catch (err) {
    console.error(err);
    res
      .writeHead(400, { 'content-type': 'text/plain' })
      .end(String(err.message ?? err));
  } finally {
    server.close();
  }
});

server.listen(port, 'localhost', () => {
  console.log('Open this URL in your browser to authorize:\n');
  console.log(authorizeUrl.href, '\n');
  console.log(`Waiting for redirect on ${REDIRECT_URI} ...`);
});
