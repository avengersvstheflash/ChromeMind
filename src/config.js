// src/config.js - HYBRID MODE (GPT4All Local + Cloud Fallback + Gemini Nano)

export const CONFIG = {
  // ===== PROVIDER ORDER =====
  PROVIDER_ORDER: ['local', 'gemini-nano', 'cloud'],
  REQUEST_TIMEOUT_MS: 30000,
  CHAT_HISTORY_LIMIT: 20,

  // ===== LOCAL: GPT4All / Ollama / LM Studio (Priority 1) =====
  LOCAL_SERVER_URL: 'http://localhost:4891/v1/completions',
  LOCAL_MODEL: 'llama-3-8b-instruct',
  USE_LOCAL_FIRST: true,

  // ===== EXPERIMENTAL: Gemini Nano (Priority 2, future) =====
  USE_GEMINI_NANO: false,
  GEMINI_NANO_MODEL: 'text-generation',

  // ===== CLOUD: HuggingFace Fallback (Priority 3) =====
  HF_API_KEY: '',
  HF_API_URL: 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct',
  HF_MODEL_ID: 'Qwen/Qwen2.5-7B-Instruct',

  // ===== RETRY POLICY =====
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 2000,
  TIMEOUT: 30000,
};

// Read persisted API key from browser storage when available.
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['hf_api_key'], (data) => {
    if (data.hf_api_key && data.hf_api_key.length > 0) {
      CONFIG.HF_API_KEY = data.hf_api_key;
      console.log('[CONFIG] ✅ Cloud API key loaded from storage');
    }
  });
}
