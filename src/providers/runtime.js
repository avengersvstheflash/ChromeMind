import { CONFIG, getStoredSettings } from '../config.js';
import { ProviderError, isRetryableStatus } from './provider-errors.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function withTimeout(promise, timeoutMs = CONFIG.REQUEST_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new ProviderError('Request timed out.', { code: 'timeout', retryable: true })), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function messagesToPrompt(messages = []) {
  return messages.map(message => {
    const role = message.role || 'user';
    const content = String(message.content || '').slice(0, CONFIG.MAX_CONTEXT_CHARS);
    return `${role.toUpperCase()}: ${content}`;
  }).join('\n');
}

async function localProvider(prompt, params) {
  const response = await withTimeout(fetch(CONFIG.LOCAL_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CONFIG.LOCAL_MODEL, prompt, max_tokens: params.max_new_tokens || 300, temperature: params.temperature ?? 0.7 })
  }));
  if (!response.ok) throw new ProviderError(`Local provider returned HTTP ${response.status}.`, { provider: 'local', status: response.status, retryable: isRetryableStatus(response.status) });
  const data = await response.json();
  const text = data.choices?.[0]?.text || data.choices?.[0]?.message?.content;
  if (!text) throw new ProviderError('Local provider returned no text.', { provider: 'local', code: 'invalid_response' });
  return text.trim();
}

async function geminiNanoProvider(prompt) {
  const api = globalThis.LanguageModel || globalThis.ai;
  if (!api) throw new ProviderError('Chrome built-in AI API is unavailable.', { provider: 'gemini-nano', code: 'unavailable' });
  const availability = api.availability ? await api.availability() : 'available';
  if (availability === 'unavailable') throw new ProviderError('Gemini Nano is unavailable in this Chrome configuration.', { provider: 'gemini-nano', code: 'unavailable' });
  const create = api.create || api.languageModel?.create;
  if (!create) throw new ProviderError('Gemini Nano API is not supported by this Chrome version.', { provider: 'gemini-nano', code: 'unsupported' });
  const session = await create.call(api, { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] });
  try { return String(await session.prompt(prompt)).trim(); } finally { session.destroy?.(); }
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
      if (!response.ok) throw new ProviderError(data.error || `Cloud provider returned HTTP ${response.status}.`, { provider: 'cloud', status: response.status, retryable: isRetryableStatus(response.status) });
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
  let local = false;
  try { await localProvider('Reply with OK.', { max_new_tokens: 4 }); local = true; } catch {}
  const api = globalThis.LanguageModel || globalThis.ai;
  let geminiNano = api ? 'available' : 'unavailable';
  if (api?.availability) { try { geminiNano = await api.availability(); } catch { geminiNano = 'unavailable'; } }
  return { local, geminiNano, cloud: Boolean(settings.hf_api_key), privacyMode: settings.privacyMode || 'local-preferred' };
}

export async function generate(messages, params = {}) {
  const started = Date.now();
  const settings = await getStoredSettings();
  const policy = settings.privacyMode || 'local-preferred';
  const order = policy === 'cloud-only' ? ['cloud'] : policy === 'local-only' ? ['local', 'gemini-nano'] : CONFIG.PROVIDER_ORDER;
  const prompt = messagesToPrompt(messages);
  const failures = [];
  for (const provider of order) {
    try {
      const text = provider === 'local' ? await localProvider(prompt, params) : provider === 'gemini-nano' ? await geminiNanoProvider(prompt) : await cloudProvider(prompt);
      return { text, provider, privacy: provider === 'cloud' ? 'cloud' : 'on-device', latencyMs: Date.now() - started, fallbackUsed: failures.length > 0 };
    } catch (error) {
      const normalized = error instanceof ProviderError ? error : new ProviderError(error.message, { provider });
      failures.push({ provider, code: normalized.code });
    }
  }
  throw new ProviderError('No permitted AI provider is available.', { code: 'all_providers_failed', details: failures });
}

export { messagesToPrompt };
