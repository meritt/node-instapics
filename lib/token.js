export const TOKEN_ENV_VAR = 'IG_TOKEN';

export function resolveToken(token, env = process.env) {
  const resolved = token ?? env?.[TOKEN_ENV_VAR];

  if (resolved == null || resolved === '') {
    throw new TypeError(
      `No access token: pass "token" or set the ${TOKEN_ENV_VAR} environment variable`
    );
  }

  if (typeof resolved !== 'string') {
    throw new TypeError('Access token must be a string');
  }

  return resolved;
}
