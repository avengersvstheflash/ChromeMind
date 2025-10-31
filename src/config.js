// src/config.js - HYBRID MODE (GPT4All Local + Cloud Fallback + Gemini Nano)

export const CONFIG = {
  // ===== LOCAL: GPT4All (Priority 1) =====
  LOCAL_SERVER_URL: 'http://localhost:4891/v1/completions',
  LOCAL_MODEL: 'llama-3-8b-instruct', // // GPT4All model name
  USE_LOCAL_FIRST: true,

  // ===== CLOUD: HuggingFace Fallback (Priority 3) =====
  HF_API_KEY: '', // Will be loaded from chrome.storage.local
  HF_API_URL: 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct',
  HF_MODEL_ID: 'Qwen/Qwen2.5-7B-Instruct',

  // ===== EXPERIMENTAL: Gemini Nano (Priority 2, future) =====
  USE_GEMINI_NANO: false,

  TIMEOUT: 30000,
  MAX_RETRIES: 2
};

chrome.storage.local.get(['hf_api_key'], (data) => {
  if (data.hf_api_key && data.hf_api_key.length > 0) {
    CONFIG.HF_API_KEY = data.hf_api_key;
    console.log('[CONFIG] ✅ Cloud API key loaded from storage');
  }
});
