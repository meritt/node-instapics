# Getting an access token

[`get-access-token.js`](./get-access-token.js) obtains a long-lived token (~60 days) through a one-time OAuth flow on a local HTTPS server. You need a Meta app with **Instagram Login** and a **Professional** Instagram account authorized as a tester on it.

## Prerequisites

- A Meta app with the **Instagram** product and **Instagram Login** configured.
- A **Professional** Instagram account, added as a tester on the app.
- [mkcert](https://github.com/FiloSottile/mkcert), to issue a locally-trusted certificate.

## Set up the app

In the Meta app dashboard, under **Instagram Login**:

1. Copy the **Instagram app ID** and **Instagram app secret** (`IG_APP_ID`, `IG_APP_SECRET`).
2. Register the redirect URL `https://localhost:3000/callback` (`IG_REDIRECT_URI`).
3. Add your Instagram account under **Instagram testers**, then accept the invite from the Instagram app.

## Create the certificate

In the directory you run the example from:

```bash
mkcert -install
mkcert localhost
```

This writes `localhost.pem` and `localhost-key.pem`.

## Run

```bash
IG_APP_ID=... IG_APP_SECRET=... node examples/get-access-token.js
```

Open the printed URL, authorize, and the token prints to your terminal.

## Environment variables

| Variable          | Description                                | Default                           |
| ----------------- | ------------------------------------------ | --------------------------------- |
| `IG_APP_ID`       | Instagram app ID                           | required                          |
| `IG_APP_SECRET`   | Instagram app secret                       | required                          |
| `IG_REDIRECT_URI` | OAuth redirect; must match the app exactly | `https://localhost:3000/callback` |
| `IG_TLS_CERT`     | HTTPS certificate path                     | `localhost.pem`                   |
| `IG_TLS_KEY`      | HTTPS private key path                     | `localhost-key.pem`               |
