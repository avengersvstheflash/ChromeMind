import { generate, getBackendStatus } from '../providers/runtime.js';
import { CONFIG } from '../config.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'chromemind-translate', title: 'Translate with ChromeMind', contexts: ['selection'] }).catch?.(() => {});
  chrome.storage.local.get(['aiEnabled', 'theme', 'autoSummarize', 'privacyMode'], data => {
    chrome.storage.local.set({
      aiEnabled: data.aiEnabled ?? true,
      theme: data.theme ?? 'default',
      autoSummarize: data.autoSummarize ?? false,
      privacyMode: data.privacyMode ?? 'local-preferred'
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'chromemind-translate') handleTranslateRequest(info.selectionText, 'es', tab?.id).catch(() => {});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handlers = {
    translateWithAI: () => handleTranslateRequest(request.text, request.targetLang, sender.tab?.id),
    summarizeContent: () => generate([{ role: 'user', content: `Summarize this content in 2-3 sentences:\n\n${request.content}` }], { max_new_tokens: 100 }),
    proofreadText: () => generate([{ role: 'user', content: `Proofread and correct grammar. Only return corrected text:\n\n${request.text}` }], { max_new_tokens: 150 }),
    rewriteText: () => generate([{ role: 'user', content: `Rewrite for clarity, style, and conciseness:\n\n${request.text}` }], { max_new_tokens: 200 }),
    chatMessage: () => generate((request.messages || []).slice(-CONFIG.CHAT_HISTORY_LIMIT), { max_new_tokens: 150 }),
    getBackendStatus: () => getBackendStatus()
  };
  if (!handlers[request.action]) { sendResponse({ success: false, error: 'Unknown action' }); return false; }
  handlers[request.action]().then(result => sendResponse({ success: true, result })).catch(error => sendResponse({ success: false, error: error.message, code: error.code }));
  return true;
});

async function handleTranslateRequest(text, targetLang, tabId) {
  const result = await generate([{ role: 'user', content: `Translate the following text to ${getLanguageName(targetLang)}:\n\n${text}` }], { max_new_tokens: 150 });
  if (tabId) chrome.tabs.sendMessage(tabId, { action: 'showTranslationResult', originalText: text, translatedText: result.text }).catch?.(() => {});
  return result;
}

function getLanguageName(code) {
  return ({ es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese', zh: 'Chinese', pt: 'Portuguese', it: 'Italian', ru: 'Russian', ko: 'Korean' })[code] || 'English';
}
