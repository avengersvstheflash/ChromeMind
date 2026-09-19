export class ProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ProviderError';
    this.provider = options.provider || 'unknown';
    this.code = options.code || 'provider_error';
    this.retryable = Boolean(options.retryable);
    this.status = options.status;
    this.details = options.details || null;
  }
}

export function normalizeProviderError(error, fallbackMessage = 'Provider request failed.') {
  if (error instanceof ProviderError) return error;
  return new ProviderError(error?.message || fallbackMessage, {
    provider: error?.provider,
    code: error?.code,
    retryable: error?.retryable,
    status: error?.status,
    details: error?.details
  });
}

export function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}
