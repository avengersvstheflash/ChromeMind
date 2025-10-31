// src/huggingface.js - HYBRID AI (GPT4All → Gemini Nano → Cloud)

import { CONFIG } from './config.js';

export async function callHuggingFace(messages, params = {}) {
  const prompt = messagesToPrompt(messages);

  // 🟢 PRIORITY 1: Try GPT4All Local Model
  if (CONFIG.USE_LOCAL_FIRST) {
    try {
      console.log('[AI] 🟢 Trying LOCAL (GPT4All) model...');
      const localRes = await fetch(CONFIG.LOCAL_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CONFIG.LOCAL_MODEL,
          prompt: prompt,
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (localRes.ok) {
        const data = await localRes.json();
        if (data.choices && data.choices[0]?.text) {
          console.log('[AI] ✅ LOCAL (GPT4All) responded!');
          return data.choices[0].text.trim();
        }
      }
    } catch (err) {
      console.warn('[AI] ⚠️ Local model failed, trying Gemini Nano...');
    }
  }

  // 🔵 PRIORITY 2: Try Gemini Nano (if available)
  if (CONFIG.USE_GEMINI_NANO && window.ai) {
    try {
      console.log('[AI] 🔵 Trying Gemini Nano...');
      const session = await window.ai.languageModel.create();
      const result = await session.prompt(prompt);
      console.log('[AI] ✅ Gemini Nano responded!');
      return result;
    } catch (err) {
      console.warn('[AI] ⚠️ Gemini Nano failed, falling back to cloud...');
    }
  }

  // 🟡 PRIORITY 3: Fall back to Cloud (HuggingFace)
  console.log('[AI] 🟡 Using CLOUD model (HuggingFace)...');
  return await callCloudModel(prompt);
}

async function callCloudModel(prompt) {
  const token = CONFIG.HF_API_KEY;
  if (!token) return '[ERROR] No Cloud API key. Set it in Settings.';

  const url = CONFIG.HF_API_URL;
  let attempt = 0;

  while (attempt < CONFIG.MAX_RETRIES) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ inputs: prompt })
      });

      const data = await res.json();
      if (res.ok && data[0]?.generated_text) {
        console.log('[HF API] ✅ Cloud response received');
        return data[0].generated_text;
      }

      throw new Error(data.error || 'Unknown error');
    } catch (error) {
      attempt++;
      console.error(`[HF API] Attempt ${attempt} failed:`, error.message);
      if (attempt < CONFIG.MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  return '[ERROR] All AI backends failed. Try enabling local GPT4All or add cloud API key.';
}

// Helper: Convert message array to prompt string
function messagesToPrompt(messages) {
  if (!messages || !Array.isArray(messages)) return '';
  return messages.map(msg => {
    if (typeof msg === 'string') return msg;
    if (msg.content) return msg.content;
    return '';
  }).join('\n');
}
