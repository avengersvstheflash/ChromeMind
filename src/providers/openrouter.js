import { ProviderError, isRetryableStatus } from './provider-errors.js';

const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 30000;

export function isAvailable(apiKey) {
  return Boolean(apiKey && String(apiKey).trim().length > 0);
}

export function getCapabilities() {
  return {
    provider: 'openrouter',
    tier: 'cloud',
    defaultModel: DEFAULT_MODEL
  };
}

export async function generate(messages, options = {}) {
  const apiKey = options.apiKey;
  if (!isAvailable(apiKey)) {
    throw new ProviderError('No OpenRouter API key is configured.', {
      provider: 'openrouter',
      code: 'not_configured',
      retryable: false
    });
  }

  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const formattedMessages = messages.map(m => ({
    role: m.role || 'user',
    content: String(m.content || '')
  }));

  try {
    const response = await fetch(options.endpoint || OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/avengersvstheflash/ChromeMind',
        'X-Title': 'ChromeMind'
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || data?.error || `OpenRouter returned HTTP ${response.status}.`;
      throw new ProviderError(message, {
        provider: 'openrouter',
        status: response.status,
        retryable: isRetryableStatus(response.status)
      });
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
      throw new ProviderError('OpenRouter returned an empty or invalid response.', {
        provider: 'openrouter',
        code: 'invalid_response',
        retryable: false
      });
    }

    return text.trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ProviderError('OpenRouter request timed out.', {
        provider: 'openrouter',
        code: 'timeout',
        retryable: true
      });
    }
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(error?.message || 'OpenRouter request failed.', {
      provider: 'openrouter',
      code: 'request_failed',
      retryable: false
    });
  } finally {
    clearTimeout(timer);
  }
}
