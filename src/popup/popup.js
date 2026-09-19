import { CONFIG } from '../config.js';

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const send = request => new Promise((resolve, reject) => chrome.runtime.sendMessage(request, response => {
  if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
  if (!response?.success) return reject(new Error(response?.error || 'ChromeMind request failed'));
  resolve(response.result);
}));

let chatHistory = [];
function resultText(result) { return typeof result === 'string' ? result : result?.text || ''; }

function setStatus(text, online) {
  const element = $('aiStatus');
  element.classList.toggle('online', online);
  element.classList.toggle('offline', !online);
  element.querySelector('.status-text').textContent = text;
}

async function updateAIStatus() {
  try {
    const state = await send({ action: 'getBackendStatus' });
    if (state.local) setStatus('Local AI ready', true);
    else if (['available', 'ready'].includes(state.geminiNano)) setStatus('Gemini Nano ready', true);
    else if (state.cloud) setStatus('Cloud fallback configured', true);
    else setStatus('No AI backend available', false);
  } catch {
    setStatus('Backend status unavailable', false);
  }
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      $(button.dataset.tab).classList.add('active');
    });
  });
}

function renderChat() {
  $('chatContainer').innerHTML = chatHistory
    .map(message => `<div class="chat-message ${message.role}"><strong>${message.role === 'user' ? 'You' : 'ChromeMind'}:</strong> ${escapeHTML(message.content)}</div>`)
    .join('');
}

async function summarize() {
  const box = $('summaryResult');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const page = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
    if (!page?.success) throw new Error(page?.error || 'Could not extract page content');
    const result = await send({ action: 'summarizeContent', content: page.content, title: page.title });
    box.innerHTML = `<strong>📄 Summary:</strong><p>${escapeHTML(resultText(result))}</p><small>${escapeHTML(page.title)}</small>`;
    await incrementStat('summaries');
  } catch (exception) {
    box.innerHTML = `<span class="error">Error: ${escapeHTML(exception.message)}</span>`;
  }
}

async function translate() {
  const input = $('translateInput').value.trim();
  if (!input) return $('translateResult').innerHTML = '<span class="error">Enter text to translate.</span>';
  try {
    const result = await send({ action: 'translateWithAI', text: input, targetLang: $('targetLang').value });
    $('translateResult').innerHTML = `<strong>🌐 Translation:</strong><p>${escapeHTML(resultText(result))}</p>`;
    await incrementStat('translations');
  } catch (exception) {
    $('translateResult').innerHTML = `<span class="error">Error: ${escapeHTML(exception.message)}</span>`;
  }
}

async function improve(action) {
  const input = $('improveInput').value.trim();
  if (!input) return $('improveResult').innerHTML = '<span class="error">Enter text to improve.</span>';
  try {
    const result = await send({ action, text: input });
    $('improveResult').innerHTML = `<p>${escapeHTML(resultText(result))}</p>`;
    await incrementStat('improvements');
  } catch (exception) {
    $('improveResult').innerHTML = `<span class="error">Error: ${escapeHTML(exception.message)}</span>`;
  }
}

async function chat() {
  const input = $('chatInput');
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  chatHistory.push({ role: 'user', content });
  try {
    const result = await send({ action: 'chatMessage', messages: chatHistory.slice(-CONFIG.CHAT_HISTORY_LIMIT) });
    chatHistory.push({ role: 'assistant', content: resultText(result) });
    await chrome.storage.local.set({ chatHistory: chatHistory.slice(-CONFIG.CHAT_HISTORY_LIMIT) });
    renderChat();
    await incrementStat('chats');
  } catch (exception) {
    chatHistory.push({ role: 'assistant', content: `Error: ${exception.message}` });
    renderChat();
  }
}

function loadSettings() {
  chrome.storage.local.get(['settings', 'hf_api_key', 'privacyMode', 'chatHistory'], data => {
    const settings = data.settings || {};
    $('aiNameInput').value = settings.aiName || 'ChromeMind';
    $('aiToneInput').value = settings.aiTone || 'friendly';
    $('privacyModeSelect').value = data.privacyMode || settings.privacyMode || 'local-preferred';
    $('contextMemoryToggle').checked = Boolean(settings.contextMemory);
    $('adaptiveResponseToggle').checked = Boolean(settings.adaptiveResponse);
    if (data.hf_api_key) $('apiKeyInput').value = `••••••••${data.hf_api_key.slice(-4)}`;
    chatHistory = Array.isArray(data.chatHistory) ? data.chatHistory.slice(-CONFIG.CHAT_HISTORY_LIMIT) : [];
    renderChat();
  });
}

function saveSettings() {
  const privacyMode = $('privacyModeSelect').value;
  const settings = {
    aiName: $('aiNameInput').value.trim(),
    aiTone: $('aiToneInput').value,
    contextMemory: $('contextMemoryToggle').checked,
    adaptiveResponse: $('adaptiveResponseToggle').checked,
    privacyMode
  };
  const writes = { settings, privacyMode };
  const key = $('apiKeyInput').value;
  if (key && !key.includes('•')) writes.hf_api_key = key;
  chrome.storage.local.set(writes, () => {
    $('settingsStatus').textContent = 'Settings saved ✅';
    updateAIStatus();
  });
}

function incrementStat(key) {
  return new Promise(resolve =>
    chrome.storage.local.get(['stats'], data => {
      const stats = data.stats || {};
      stats[key] = (stats[key] || 0) + 1;
      chrome.storage.local.set({ stats }, () => {
        loadStats();
        resolve();
      });
    })
  );
}

function loadStats() {
  chrome.storage.local.get(['stats'], data => {
    const stats = data.stats || {};
    $('summaryCount').textContent = stats.summaries || 0;
    $('translateCount').textContent = stats.translations || 0;
    $('improvementCount').textContent = stats.improvements || 0;
    $('chatCount').textContent = stats.chats || 0;
  });
}

function clearData() {
  if (!confirm('Clear all ChromeMind data?')) return;
  chrome.storage.local.clear(() => {
    chatHistory = [];
    renderChat();
    loadSettings();
    loadStats();
    updateAIStatus();
    $('settingsStatus').textContent = 'All data cleared ✅';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadSettings();
  loadStats();
  updateAIStatus();
  $('summarizeBtn').addEventListener('click', summarize);
  $('translateBtn').addEventListener('click', translate);
  $('proofreadBtn').addEventListener('click', () => improve('proofreadText'));
  $('rewriteBtn').addEventListener('click', () => improve('rewriteText'));
  $('chatSendBtn').addEventListener('click', chat);
  $('clrChatBtn').addEventListener('click', () => {
    chatHistory = [];
    renderChat();
    chrome.storage.local.remove('chatHistory');
  });
  $('saveSettingsBtn').addEventListener('click', saveSettings);
  $('clearDataBtn').addEventListener('click', clearData);
});
