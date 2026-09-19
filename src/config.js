// Centralized Phase 1 runtime configuration.
export const CONFIG = {
  // Chrome-managed on-device AI is the preferred backend. External providers are opt-in fallbacks.
  PROVIDER_ORDER: ['gemini-nano', 'cloud'],
  DEFAULT_PRIVACY_MODE: 'chrome-local-first',
  REQUEST_TIMEOUT_MS: 30000,
  CHAT_HISTORY_LIMIT: 20,
  MAX_CONTEXT_CHARS: 12000,

  // Optional external fallback. It is never used in chrome-local-only mode.
  HF_API_URL: 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct',
  HF_MODEL_ID: 'Qwen/Qwen2.5-7B-Instruct',
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000
};

export async function getStoredSettings() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return {};
  return chrome.storage.local.get(['hf_api_key', 'privacyMode', 'settings']);
}
