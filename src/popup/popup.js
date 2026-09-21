import { CONFIG } from '../config.js';

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

const DEFAULT_MODELS = {
  'huggingface': 'Qwen/Qwen2.5-7B-Instruct',
  'openrouter': 'openai/gpt-4o-mini',
  'gemini-api': 'gemini-3.6-flash'
};

const PROVIDER_NAMES = {
  'huggingface': 'Hugging Face',
  'openrouter': 'OpenRouter',
  'gemini-api': 'Google Gemini API'
};

const send = request => new Promise((resolve, reject) => chrome.runtime.sendMessage(request, response => {
  if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
  if (!response?.success) return reject(Object.assign(new Error(response?.error || 'ChromeMind request failed'), { code: response?.code }));
  resolve(response.result);
}));

let chatHistory = [], activeDomain = '';

const resultText = result => typeof result === 'string' ? result : result?.text || '';
const metadata = result => result?.provider
  ? `<small class="provider-meta">Processed by ${escapeHTML(result.provider)} · ${escapeHTML(result.privacy || 'unknown')} · ${result.fallbackUsed ? 'fallback used' : 'no fallback'}</small>`
  : '';

function setStatus(text, online) {
  const element = $('aiStatus');
  element.classList.toggle('online', online);
  element.classList.toggle('offline', !online);
  element.querySelector('.status-text').textContent = text;
}

function updateKeyFieldVisibility(provider) {
  $('hfKeyContainer').style.display = provider === 'huggingface' ? 'block' : 'none';
  $('openrouterKeyContainer').style.display = provider === 'openrouter' ? 'block' : 'none';
  $('geminiKeyContainer').style.display = provider === 'gemini-api' ? 'block' : 'none';
  $('cloudModelInput').placeholder = DEFAULT_MODELS[provider] || 'Default model';
}

async function updateAIStatus() {
  try {
    const state = await send({ action: 'getBackendStatus' });
    if (state.chromeManaged) {
      setStatus(`Chrome AI: ${state.geminiNano}`, true);
    } else if (state.cloud) {
      const name = PROVIDER_NAMES[state.cloudProvider] || state.cloudProvider || 'Cloud';
      setStatus(`${name} configured`, true);
    } else {
      setStatus('No AI backend available', false);
    }
  } catch {
    setStatus('Backend status unavailable', false);
  }
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    $(button.dataset.tab).classList.add('active');
  }));
}

async function currentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeDomain = (() => { try { return new URL(tab.url).hostname; } catch { return ''; } })();
  return { tab, page: await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }) };
}

async function summarize() {
  try {
    const { page } = await currentPage();
    if (!page?.success) throw Object.assign(new Error(page?.error || 'Could not extract page content'), { code: page?.code });
    const result = await send({ action: 'summarizeContent', content: page.content, chunks: page.chunks, query: page.title });
    $('summaryResult').innerHTML = `<strong>📄 Summary:</strong><p>${escapeHTML(resultText(result))}</p>${metadata(result)}<small>${escapeHTML(page.title)}</small>`;
    await incrementStat('summaries');
  } catch (e) {
    $('summaryResult').innerHTML = `<span class="error">${escapeHTML(e.message)}</span>`;
  }
}

async function translate() {
  const input = $('translateInput').value.trim();
  if (!input) return $('translateResult').innerHTML = '<span class="error">Enter text to translate.</span>';
  try {
    const result = await send({ action: 'translateWithAI', text: input, targetLang: $('targetLang').value });
    $('translateResult').innerHTML = `<strong>🌐 Translation:</strong><p>${escapeHTML(resultText(result))}</p>${metadata(result)}`;
    await incrementStat('translations');
  } catch (e) {
    $('translateResult').innerHTML = `<span class="error">${escapeHTML(e.message)}</span>`;
  }
}

async function improve(action) {
  const input = $('improveInput').value.trim();
  if (!input) return $('improveResult').innerHTML = '<span class="error">Enter text to improve.</span>';
  try {
    const result = await send({ action, text: input });
    $('improveResult').innerHTML = `<p>${escapeHTML(resultText(result))}</p>${metadata(result)}`;
    await incrementStat('improvements');
  } catch (e) {
    $('improveResult').innerHTML = `<span class="error">${escapeHTML(e.message)}</span>`;
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
    chatHistory.push({ role: 'assistant', content: resultText(result), metadata: result });
    await chrome.storage.local.set({ chatHistory: chatHistory.slice(-CONFIG.CHAT_HISTORY_LIMIT) });
    renderChat();
    await incrementStat('chats');
  } catch (e) {
    chatHistory.push({ role: 'assistant', content: `Error: ${e.message}` });
    renderChat();
  }
}

function renderChat() {
  $('chatContainer').innerHTML = chatHistory.map(message =>
    `<div class="chat-message ${message.role}"><strong>${message.role === 'user' ? 'You' : 'ChromeMind'}:</strong> ${escapeHTML(message.content)}${message.metadata ? metadata(message.metadata) : ''}</div>`
  ).join('');
}

async function loadSettings() {
  const data = await chrome.storage.local.get([
    'settings',
    'hf_api_key',
    'openrouterApiKey',
    'geminiApiKey',
    'cloudProvider',
    'cloudModel',
    'privacyMode',
    'contentExtractionEnabled',
    'siteOptOuts',
    'chatHistory'
  ]);
  const settings = data.settings || {};
  $('aiNameInput').value = settings.aiName || 'ChromeMind';
  $('aiToneInput').value = settings.aiTone || 'friendly';
  $('privacyModeSelect').value = data.privacyMode || settings.privacyMode || CONFIG.DEFAULT_PRIVACY_MODE;
  $('contentExtractionToggle').checked = data.contentExtractionEnabled !== false;

  const currentProvider = data.cloudProvider || 'huggingface';
  $('cloudProviderSelect').value = currentProvider;
  updateKeyFieldVisibility(currentProvider);

  if (data.hf_api_key) $('hfKeyInput').value = `••••••••${data.hf_api_key.slice(-4)}`;
  if (data.openrouterApiKey) $('openrouterKeyInput').value = `••••••••${data.openrouterApiKey.slice(-4)}`;
  if (data.geminiApiKey) $('geminiKeyInput').value = `••••••••${data.geminiApiKey.slice(-4)}`;
  $('cloudModelInput').value = data.cloudModel || '';

  $('contextMemoryToggle').checked = Boolean(settings.contextMemory);
  $('adaptiveResponseToggle').checked = Boolean(settings.adaptiveResponse);
  chatHistory = Array.isArray(data.chatHistory) ? data.chatHistory.slice(-CONFIG.CHAT_HISTORY_LIMIT) : [];
  renderChat();
  await updateSiteOptOut(data.siteOptOuts || {});
}

async function updateSiteOptOut(siteOptOuts) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeDomain = new URL(tab.url).hostname;
    $('siteOptOutDomain').textContent = activeDomain ? `Current site: ${activeDomain}` : '';
    $('siteOptOutToggle').checked = Boolean(siteOptOuts[activeDomain]);
  } catch {
    $('siteOptOutDomain').textContent = 'Current site unavailable';
  }
}

async function saveSettings() {
  const privacyMode = $('privacyModeSelect').value;
  const cloudProvider = $('cloudProviderSelect').value;
  const cloudModel = $('cloudModelInput').value.trim();
  const domain = activeDomain;
  const data = await chrome.storage.local.get(['siteOptOuts']);
  const siteOptOuts = data.siteOptOuts || {};
  if (domain) {
    if ($('siteOptOutToggle').checked) siteOptOuts[domain] = true;
    else delete siteOptOuts[domain];
  }
  const settings = {
    aiName: $('aiNameInput').value.trim(),
    aiTone: $('aiToneInput').value,
    contextMemory: $('contextMemoryToggle').checked,
    adaptiveResponse: $('adaptiveResponseToggle').checked,
    privacyMode
  };
  const writes = {
    settings,
    privacyMode,
    cloudProvider,
    cloudModel,
    contentExtractionEnabled: $('contentExtractionToggle').checked,
    siteOptOuts
  };

  const hfKey = $('hfKeyInput').value;
  if (hfKey && !hfKey.includes('•')) writes.hf_api_key = hfKey.trim();

  const orKey = $('openrouterKeyInput').value;
  if (orKey && !orKey.includes('•')) writes.openrouterApiKey = orKey.trim();

  const gemKey = $('geminiKeyInput').value;
  if (gemKey && !gemKey.includes('•')) writes.geminiApiKey = gemKey.trim();

  chrome.storage.local.set(writes, () => {
    $('settingsStatus').textContent = 'Settings saved ✅';
    updateAIStatus();
  });
}

function incrementStat(key) {
  return new Promise(resolve => chrome.storage.local.get(['stats'], data => {
    const stats = data.stats || {};
    stats[key] = (stats[key] || 0) + 1;
    chrome.storage.local.set({ stats }, () => {
      loadStats();
      resolve();
    });
  }));
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
  $('cloudProviderSelect').addEventListener('change', e => {
    updateKeyFieldVisibility(e.target.value);
  });
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
