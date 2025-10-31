// src/popup/popup.js
// FIXED: Uses background service worker for all LLM calls, proper message handling

import { CONFIG } from '../config.js';

// ====== Secure HTML Escape ======
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

// ====== State ======
let aiMode = 'unknown';
let chatHistory = []; // For persistent, multi-turn chat

// ====== Init ======
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupButtons();
  loadSettings();
  loadStats();
  loadChatHistory();
  updateAIStatus();
});

// ====== Tabs ======
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ====== Buttons ======
function setupButtons() {
  document.getElementById('summarizeBtn').addEventListener('click', handleSummarize);
  document.getElementById('translateBtn').addEventListener('click', handleTranslate);
  document.getElementById('proofreadBtn').addEventListener('click', handleProofread);
  document.getElementById('rewriteBtn').addEventListener('click', handleRewrite);
  document.getElementById('chatSendBtn').addEventListener('click', handleChat);
  document.getElementById('clrChatBtn')?.addEventListener('click', clearChatHistory);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
}

// ====== AI Detection/Status ======
async function updateAIStatus() {
  let status = document.getElementById('aiStatus');
  let txt = status.querySelector('.status-text');

  // Check if API key is configured
  chrome.storage.local.get(['hf_api_key'], (data) => {
    if (data.hf_api_key && data.hf_api_key.length > 0) {
      aiMode = 'api';
      status.classList.add('online');
      status.classList.remove('offline');
      txt.textContent = 'AI Ready (Cloud)';
    } else {
      aiMode = 'unknown';
      status.classList.remove('online');
      status.classList.add('offline');
      txt.textContent = 'AI Unavailable (No API Key)';
    }
  });
}

// ====== Hybrid AI Helpers (now use background service worker) ======
async function summarizeText(content) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'summarizeContent', content, title: document.title },
      (response) => {
        if (response?.success) {
          resolve(response.result);
        } else {
          reject(new Error(response?.error || 'Summarization failed'));
        }
      }
    );
  });
}

async function translateText(text, targetLang) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'translateWithAI', text, targetLang },
      (response) => {
        if (response?.success) {
          resolve(response.result);
        } else {
          reject(new Error(response?.error || 'Translation failed'));
        }
      }
    );
  });
}

async function proofreadText(text) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'proofreadText', text },
      (response) => {
        if (response?.success) {
          resolve(response.result);
        } else {
          reject(new Error(response?.error || 'Proofreading failed'));
        }
      }
    );
  });
}

async function rewriteText(text) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'rewriteText', text },
      (response) => {
        if (response?.success) {
          resolve(response.result);
        } else {
          reject(new Error(response?.error || 'Rewriting failed'));
        }
      }
    );
  });
}

async function chatWithAI(msg) {
  chatHistory.push({ role: 'user', content: msg });
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'chatMessage', messages: chatHistory },
      (response) => {
        if (response?.success) {
          chatHistory.push({ role: 'assistant', content: response.result });
          saveChatHistory();
          resolve(response.result);
        } else {
          reject(new Error(response?.error || 'Chat failed'));
        }
      }
    );
  });
}

// ====== Chat History Persistence & UI ======
function loadChatHistory() {
  chrome.storage.local.get(['chatHistory'], (data) => {
    chatHistory = data.chatHistory || [];
    updateChatUI();
  });
}

function saveChatHistory() {
  chrome.storage.local.set({ chatHistory });
}

function clearChatHistory() {
  if (!confirm("Clear all chat history?")) return;
  chatHistory = [];
  saveChatHistory();
  updateChatUI();
}

function updateChatUI() {
  let container = document.getElementById('chatContainer');
  container.innerHTML = '';
  chatHistory.forEach(msg => {
    let cls = msg.role === "user" ? "user" : "assistant";
    let name = msg.role === "user" ? "You" : "ChromeMind";
    container.innerHTML += `<div class="chat-message ${cls}"><strong>${escapeHTML(name)}:</strong> ${escapeHTML(msg.content)}</div>`;
  });
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

// ====== Handlers (with loading + sanitization) ======
async function handleSummarize() {
  let btn = this, box = document.getElementById('summaryResult');
  btn.disabled = true;
  btn.innerHTML = '⏳ Summarizing…';
  box.innerHTML = '<div class="loading">Analyzing page content...</div>';

  try {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });

    if (!response.success) {
      throw new Error(response.error || 'Could not extract page content');
    }

    let summary = await summarizeText(response.content);
    box.innerHTML = `<strong>📄 Summary:</strong><p>${escapeHTML(summary)}</p><small>Page: ${escapeHTML(response.title)}</small>`;
    await incrementStat('summaries');
  } catch (e) {
    box.innerHTML = `<span class="error">Error: ${escapeHTML(e.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔍 Summarize This Page';
  }
}

async function handleTranslate() {
  let btn = this, input = document.getElementById('translateInput').value.trim();
  let lang = document.getElementById('targetLang').value;
  let box = document.getElementById('translateResult');

  if (!input) {
    box.innerHTML = `<span class="error">Please enter text to translate</span>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '⏳ Translating…';
  box.innerHTML = '<div class="loading">Translating...</div>';

  try {
    let text = await translateText(input, lang);
    box.innerHTML = `<strong>🌐 Translation:</strong><p>${escapeHTML(text)}</p><small>Target: ${getLanguageName(lang)}</small>`;
    await incrementStat('translations');
  } catch (e) {
    box.innerHTML = `<span class="error">Error: ${escapeHTML(e.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🌍 Translate';
  }
}

async function handleProofread() {
  let btn = this, input = document.getElementById('improveInput').value.trim();
  let box = document.getElementById('improveResult');

  if (!input) {
    box.innerHTML = `<span class="error">Please enter text to proofread</span>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '⏳ Checking…';
  box.innerHTML = '<div class="loading">Checking grammar...</div>';

  try {
    let text = await proofreadText(input);
    box.innerHTML = `<strong>✏️ Corrected:</strong><p>${escapeHTML(text)}</p>`;
    await incrementStat('improvements');
  } catch (e) {
    box.innerHTML = `<span class="error">Error: ${escapeHTML(e.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✏️ Fix Grammar';
  }
}

async function handleRewrite() {
  let btn = this, input = document.getElementById('improveInput').value.trim();
  let box = document.getElementById('improveResult');

  if (!input) {
    box.innerHTML = `<span class="error">Please enter text to rewrite</span>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '⏳ Rewriting…';
  box.innerHTML = '<div class="loading">Rewriting...</div>';

  try {
    let text = await rewriteText(input);
    box.innerHTML = `<strong>✨ Improved:</strong><p>${escapeHTML(text)}</p>`;
    await incrementStat('improvements');
  } catch (e) {
    box.innerHTML = `<span class="error">Error: ${escapeHTML(e.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ Rewrite';
  }
}

async function handleChat() {
  let inputEl = document.getElementById('chatInput');
  let msg = inputEl.value.trim();

  if (!msg) return;

  inputEl.value = '';
  document.getElementById('chatContainer').innerHTML += `<div class="chat-message user"><strong>You:</strong> ${escapeHTML(msg)}</div>`;
  document.getElementById('chatContainer').innerHTML += `<div class="chat-message assistant"><em>Thinking…</em></div>`;

  try {
    let reply = await chatWithAI(msg);
    updateChatUI();
    await incrementStat('chats');
  } catch (e) {
    chatHistory.push({ role: 'assistant', content: `Error: ${e.message}` });
    saveChatHistory();
    updateChatUI();
  }
}

// ====== Settings & Stats ======
function loadSettings() {
  chrome.storage.local.get(['settings', 'hf_api_key'], (data) => {
    const settings = data.settings || {};
    const apiKey = data.hf_api_key || '';

    if (settings.aiName) document.getElementById('aiNameInput').value = settings.aiName;
    if (settings.aiTone) document.getElementById('aiToneInput').value = settings.aiTone;
    document.getElementById('contextMemoryToggle').checked = !!settings.contextMemory;
    document.getElementById('adaptiveResponseToggle').checked = !!settings.adaptiveResponse;

    // Mask API key for security
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
      if (apiKey && apiKey.length > 0) {
        apiKeyInput.value = '••••••••' + apiKey.substring(apiKey.length - 4);
      }
    }
  });
}

function saveSettings() {
  const settings = {
    aiName: document.getElementById('aiNameInput').value.trim(),
    aiTone: document.getElementById('aiToneInput').value.trim(),
    contextMemory: document.getElementById('contextMemoryToggle').checked,
    adaptiveResponse: document.getElementById('adaptiveResponseToggle').checked
  };

  const apiKeyInput = document.getElementById('apiKeyInput');
  if (apiKeyInput && apiKeyInput.value && !apiKeyInput.value.includes('•')) {
    // Only save if a new key was entered (not masked)
    chrome.storage.local.set({ 'hf_api_key': apiKeyInput.value });
  }

  chrome.storage.local.set({ settings }, () => {
    showTempStatus('Settings saved! ✅', 'settingsStatus');
    updateAIStatus(); // Refresh AI status
  });
}

function showTempStatus(msg, elId, duration = 1200) {
  const el = document.getElementById(elId);
  if (el) {
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => (el.style.opacity = '0'), duration);
  }
}

function loadStats() {
  chrome.storage.local.get(['stats'], (data) => {
    const stats = data.stats || {};
    document.getElementById('summaryCount').textContent = stats.summaries || 0;
    document.getElementById('translateCount').textContent = stats.translations || 0;
    document.getElementById('improvementCount').textContent = stats.improvements || 0;
    document.getElementById('chatCount').textContent = stats.chats || 0;
  });
}

function incrementStat(key) {
  chrome.storage.local.get(['stats'], (data) => {
    let stats = data.stats || {};
    stats[key] = (stats[key] || 0) + 1;
    chrome.storage.local.set({ stats }, () => loadStats());
  });
}

function clearAllData() {
  if (!confirm("Are you sure you want to clear all ChromeMind data? This cannot be undone.")) return;
  chrome.storage.local.set({ stats: {}, settings: {}, chatHistory: [], hf_api_key: '' }, () => {
    loadStats();
    loadSettings();
    clearChatHistory();
    showTempStatus('All data cleared! ✅', 'settingsStatus');
    updateAIStatus();
  });
}

// ====== Misc ======
function getLanguageName(code) {
  const map = { es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese', zh: 'Chinese' };
  return map[code] || code;
}