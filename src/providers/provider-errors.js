export class ProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ProviderError';
    this.provider = options.provider || 'unknown';
    this.code = options.code || 'provider_error';
    this.retryable = Boolean(options.retryable);
    this.details = options.details || null;
  }
}

export function normalizeProviderError(error, fallbackMessage = 'Provider request failed.') {
  if (error instanceof ProviderError) {
    return error;
  }

  const message = error && error.message ? error.message : fallbackMessage;
  const provider = error && error.provider ? error.provider : 'unknown';

  return new ProviderError(message, {
    provider,
    code: error && error.code ? error.code : 'provider_error',
    retryable: Boolean(error && error.retryable),
    details: error && error.details ? error.details : null,
  });
}
