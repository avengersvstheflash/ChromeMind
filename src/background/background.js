import { CONFIG } from '../config.js';
import { generate, getBackendStatus } from '../providers/runtime.js';

function respond(promise, sendResponse) {
  promise
    .then(result => sendResponse({ success: true, result }))
    .catch(error => sendResponse({ success: false, error: error.message, code: error.code }));
  return true;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'chromemind-translate',
    title: 'Translate with ChromeMind',
    contexts: ['selection']
  }).catch?.(() => {});

  chrome.storage.local.get(['aiEnabled', 'theme', 'autoSummarize', 'privacyMode'], data => {
    chrome.storage.local.set({
      aiEnabled: data.aiEnabled ?? true,
      theme: data.theme ?? 'default',
      autoSummarize: data.autoSummarize ?? false,
      privacyMode: data.privacyMode ?? CONFIG.DEFAULT_PRIVACY_MODE
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'chromemind-translate' || !info.selectionText) return;
  handleTranslateRequest(info.selectionText, 'es', tab?.id).catch(() => {});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const actions = {
    getBackendStatus: () => getBackendStatus(),
    translateWithAI: () => handleTranslateRequest(request.text, request.targetLang, sender.tab?.id),
    summarizeContent: () => generate([{ role: 'user', content: `Summarize this content in 2-3 sentences:\n\n${request.content}` }], { max_new_tokens: 100 }),
    proofreadText: () => generate([{ role: 'user', content: `Proofread and correct grammar. Only return corrected text:\n\n${request.text}` }], { max_new_tokens: 150 }),
    rewriteText: () => generate([{ role: 'user', content: `Rewrite for clarity, style, and conciseness:\n\n${request.text}` }], { max_new_tokens: 200 }),
    chatMessage: () => generate((request.messages || []).slice(-CONFIG.CHAT_HISTORY_LIMIT), { max_new_tokens: 150 })
  };

  if (!actions[request.action]) {
    sendResponse({ success: false, error: 'Unknown action', code: 'unknown_action' });
    return false;
  }
  return respond(actions[request.action](), sendResponse);
});

async function handleTranslateRequest(text, targetLang, tabId) {
  const language = getLanguageName(targetLang);
  const result = await generate([{ role: 'user', content: `Translate the following text to ${language}:\n\n${text}` }], { max_new_tokens: 150 });
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      action: 'showTranslationResult',
      originalText: text,
      translatedText: result.text
    }).catch?.(() => {});
  }
  return result;
}

function getLanguageName(code) {
  return ({ es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese', zh: 'Chinese', pt: 'Portuguese', it: 'Italian', ru: 'Russian', ko: 'Korean' })[code] || 'English';
}
