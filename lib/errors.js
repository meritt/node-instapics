export class InstagramApiError extends Error {
  constructor(message, { status, code, type, fbtraceId, cause } = {}) {
    super(message, cause ? { cause } : undefined);

    this.name = 'InstagramApiError';
    this.status = status;
    this.code = code;
    this.type = type;
    this.fbtraceId = fbtraceId;
  }
}
