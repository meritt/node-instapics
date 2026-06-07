export const TOKEN_ENV_VAR = 'IG_TOKEN';

export function resolveToken(token, env = process.env) {
  const resolved = token ?? env?.[TOKEN_ENV_VAR];

  if (!resolved) {
    throw new TypeError(
      `No access token: pass "token" or set the ${TOKEN_ENV_VAR} environment variable`
    );
  }

  return resolved;
}
