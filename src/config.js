// Centralized Phase 1 runtime configuration.
export const CONFIG = {
  PROVIDER_ORDER: ['local', 'gemini-nano', 'cloud'],
  REQUEST_TIMEOUT_MS: 30000,
  CHAT_HISTORY_LIMIT: 20,
  MAX_CONTEXT_CHARS: 12000,
  LOCAL_SERVER_URL: 'http://localhost:4891/v1/completions',
  LOCAL_MODEL: 'llama-3-8b-instruct',
  USE_LOCAL_FIRST: true,
  USE_GEMINI_NANO: true,
  HF_API_URL: 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct',
  HF_MODEL_ID: 'Qwen/Qwen2.5-7B-Instruct',
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000
};

export async function getStoredSettings() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return {};
  return chrome.storage.local.get(['hf_api_key', 'privacyMode', 'settings']);
}
