import { CONFIG, getStoredSettings } from '../config.js';
import { ProviderError, isRetryableStatus } from './provider-errors.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function withTimeout(operation, timeoutMs = CONFIG.REQUEST_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new ProviderError('Request timed out.', { code: 'timeout', retryable: true })), timeoutMs);
  });
  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
}

function messagesToPrompt(messages = []) {
  return messages.map(message => {
    const role = message.role || 'user';
    const content = String(message.content || '').slice(0, CONFIG.MAX_CONTEXT_CHARS);
    return `${role.toUpperCase()}: ${content}`;
  }).join('\n');
}

function getChromeAiApi() {
  return globalThis.LanguageModel || globalThis.ai || null;
}

async function geminiNanoProvider(prompt) {
  const api = getChromeAiApi();
  if (!api) throw new ProviderError('Chrome built-in AI is unavailable.', { provider: 'gemini-nano', code: 'unavailable' });

  const availability = api.availability ? await api.availability() : 'available';
  if (availability === 'unavailable') {
    throw new ProviderError('Chrome built-in AI is unavailable in this configuration.', { provider: 'gemini-nano', code: 'unavailable' });
  }
  if (availability === 'downloading' || availability === 'downloadable' || availability === 'after-download') {
    throw new ProviderError(`Chrome built-in AI is ${availability}.`, { provider: 'gemini-nano', code: availability });
  }

  const create = api.create || api.languageModel?.create;
  if (!create) throw new ProviderError('Chrome built-in AI API is unsupported.', { provider: 'gemini-nano', code: 'unsupported' });

  const session = await withTimeout(create.call(api, {
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }]
  }));
  try {
    return String(await withTimeout(session.prompt(prompt))).trim();
  } finally {
    session.destroy?.();
  }
}

async function cloudProvider(prompt) {
  const { hf_api_key: token } = await getStoredSettings();
  if (!token) throw new ProviderError('No cloud API key is configured.', { provider: 'cloud', code: 'not_configured' });

  let lastError;
  for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt += 1) {
    try {
      const response = await withTimeout(fetch(CONFIG.HF_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt })
      }));
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new ProviderError(data.error || `Cloud provider returned HTTP ${response.status}.`, {
          provider: 'cloud',
          status: response.status,
          retryable: isRetryableStatus(response.status)
        });
      }
      const text = data[0]?.generated_text || data.generated_text;
      if (!text) throw new ProviderError('Cloud provider returned no text.', { provider: 'cloud', code: 'invalid_response' });
      return text.trim();
    } catch (error) {
      lastError = error;
      if (!error.retryable || attempt === CONFIG.MAX_RETRIES - 1) break;
      await sleep(CONFIG.RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError;
}

export async function getBackendStatus() {
  const settings = await getStoredSettings();
  const api = getChromeAiApi();
  let geminiNano = api ? 'available' : 'unavailable';
  if (api?.availability) {
    try { geminiNano = await api.availability(); } catch { geminiNano = 'unavailable'; }
  }
  return {
    geminiNano,
    chromeManaged: geminiNano === 'available' || geminiNano === 'ready',
    cloud: Boolean(settings.hf_api_key),
    privacyMode: settings.privacyMode || CONFIG.DEFAULT_PRIVACY_MODE
  };
}

function providerOrder(policy) {
  if (policy === 'cloud-only') return ['cloud'];
  if (policy === 'local-only' || policy === 'chrome-local-only') return ['gemini-nano'];
  return ['gemini-nano', 'cloud'];
}

export async function generate(messages, params = {}) {
  const started = Date.now();
  const settings = await getStoredSettings();
  const policy = settings.privacyMode || CONFIG.DEFAULT_PRIVACY_MODE;
  const failures = [];
  const prompt = messagesToPrompt(messages);

  for (const provider of providerOrder(policy)) {
    try {
      const text = provider === 'gemini-nano'
        ? await geminiNanoProvider(prompt)
        : await cloudProvider(prompt);
      return {
        text,
        provider,
        privacy: provider === 'cloud' ? 'cloud' : 'on-device',
        latencyMs: Date.now() - started,
        fallbackUsed: failures.length > 0
      };
    } catch (error) {
      const normalized = error instanceof ProviderError
        ? error
        : new ProviderError(error?.message || 'Provider request failed.', { provider });
      failures.push({ provider, code: normalized.code });
    }
  }

  throw new ProviderError('No permitted AI provider is available.', {
    code: 'all_providers_failed',
    details: failures
  });
}

export { messagesToPrompt };
