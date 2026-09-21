import { ProviderError, isRetryableStatus } from './provider-errors.js';

const DEFAULT_MODEL = 'gemini-3.6-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT_MS = 30000;

export function isAvailable(apiKey) {
  return Boolean(apiKey && String(apiKey).trim().length > 0);
}

export function getCapabilities() {
  return {
    provider: 'gemini-api',
    tier: 'cloud',
    defaultModel: DEFAULT_MODEL
  };
}

export function messagesToGemini(messages = []) {
  return {
    contents: messages.map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(message.content || '') }]
    }))
  };
}

export async function generate(messages, options = {}) {
  const apiKey = options.apiKey;
  if (!isAvailable(apiKey)) {
    throw new ProviderError('No Gemini API key is configured.', {
      provider: 'gemini-api',
      code: 'not_configured',
      retryable: false
    });
  }

  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url = options.endpoint || `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
  const payload = messagesToGemini(messages);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || `Gemini API returned HTTP ${response.status}.`;
      throw new ProviderError(message, {
        provider: 'gemini-api',
        status: response.status,
        retryable: isRetryableStatus(response.status)
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') {
      throw new ProviderError('Gemini API returned an empty or invalid response.', {
        provider: 'gemini-api',
        code: 'invalid_response',
        retryable: false
      });
    }

    return text.trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ProviderError('Gemini API request timed out.', {
        provider: 'gemini-api',
        code: 'timeout',
        retryable: true
      });
    }
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(error?.message || 'Gemini API request failed.', {
      provider: 'gemini-api',
      code: 'request_failed',
      retryable: false
    });
  } finally {
    clearTimeout(timer);
  }
}
