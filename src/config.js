// Centralized runtime configuration.
export const CONFIG = {
  // Chrome-managed on-device AI is the preferred backend. External providers are opt-in fallbacks.
  PROVIDER_ORDER: ['gemini-nano', 'cloud'],
  DEFAULT_PRIVACY_MODE: 'chrome-local-first',
  REQUEST_TIMEOUT_MS: 30000,
  CHAT_HISTORY_LIMIT: 20,
  MAX_CONTEXT_CHARS: 12000,

  // Cloud fallback providers
  DEFAULT_CLOUD_PROVIDER: 'huggingface',
  DEFAULT_OPENROUTER_MODEL: 'deepseek/deepseek-v4-flash',
  DEFAULT_GEMINI_MODEL: 'gemini-3.6-flash',

  // Hugging Face settings
  HF_API_URL: 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct',
  HF_MODEL_ID: 'Qwen/Qwen2.5-7B-Instruct',
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000
};

export async function getStoredSettings() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return {};
  return chrome.storage.local.get([
    'hf_api_key',
    'openrouterApiKey',
    'geminiApiKey',
    'cloudProvider',
    'cloudModel',
    'privacyMode',
    'settings'
  ]);
}
