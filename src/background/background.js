// src/background/background.js
// FIXED: Service worker with LLM integration, proper message handling, and relay logic

import { CONFIG } from '../config.js';
import { callHuggingFace } from '../huggingface.js';

console.log('🚀 ChromeMind background service worker started!');

// Extension install/upgrade event
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ ChromeMind installed successfully!');

  // Create context menu for translation on selected text
  chrome.contextMenus.create({
    id: 'chromemind-translate',
    title: 'Translate with ChromeMind',
    contexts: ['selection']
  });

  // Initialize default settings only if not already set
  chrome.storage.local.get(['aiEnabled', 'theme', 'autoSummarize'], (data) => {
    if (typeof data.aiEnabled === 'undefined')
      chrome.storage.local.set({ aiEnabled: true });
    if (typeof data.theme === 'undefined')
      chrome.storage.local.set({ theme: 'default' });
    if (typeof data.autoSummarize === 'undefined')
      chrome.storage.local.set({ autoSummarize: false });
  });

  console.log('[Background] Default settings initialized');
});

// Handle context menu clicks (right-click translation)
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'chromemind-translate') {
    const selectedText = info.selectionText;
    console.log('[Context Menu] Translation requested for:', selectedText);

    // Send message to content script first (for highlighting)
    chrome.tabs.sendMessage(tab.id, {
      action: 'highlightSelection',
      text: selectedText
    }).catch(err => {
      console.warn('[Background] Could not reach content script:', err.message);
    });

    // Handle translation via LLM
    handleTranslateRequest(selectedText, 'es', tab.id)
      .catch(err => console.error('[Background] Translation error:', err.message));
  }
});

// Handle extension messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Message from', sender.url || 'popup', ':', request.action);

  if (request.action === 'translateWithAI') {
    handleTranslateRequest(request.text, request.targetLang, sender.tab?.id)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async
  }

  if (request.action === 'summarizeContent') {
    handleSummarizeRequest(request.content, request.title)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'proofreadText') {
    handleProofreadRequest(request.text)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'rewriteText') {
    handleRewriteRequest(request.text)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'chatMessage') {
    handleChatRequest(request.messages)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

// LLM request handlers
async function handleTranslateRequest(text, targetLang, tabId) {
  const targetLangName = getLanguageName(targetLang);
  const messages = [
    { role: 'user', content: `Translate the following text to ${targetLangName}:\n\n${text}` }
  ];
  const result = await callHuggingFace(messages, { max_new_tokens: 150 });

  // Notify content script to highlight translation (if on a tab)
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      action: 'showTranslationResult',
      originalText: text,
      translatedText: result
    }).catch(err => console.warn('[Background] Could not notify content script:', err.message));
  }

  return result;
}

async function handleSummarizeRequest(content, title) {
  const messages = [
    { role: 'user', content: `Summarize this content in 2-3 sentences:\n\n${content}` }
  ];
  return await callHuggingFace(messages, { max_new_tokens: 100 });
}

async function handleProofreadRequest(text) {
  const messages = [
    { role: 'user', content: `Proofread and correct grammar in the following text. Only return the corrected text:\n\n${text}` }
  ];
  return await callHuggingFace(messages, { max_new_tokens: 150 });
}

async function handleRewriteRequest(text) {
  const messages = [
    { role: 'user', content: `Rewrite the following text for improved clarity, style, and conciseness:\n\n${text}` }
  ];
  return await callHuggingFace(messages, { max_new_tokens: 200 });
}

async function handleChatRequest(messages) {
  return await callHuggingFace(messages, { max_new_tokens: 100 });
}

// Utility: Get language name from code
function getLanguageName(code) {
  const map = {
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    zh: 'Chinese',
    pt: 'Portuguese',
    it: 'Italian',
    ru: 'Russian',
    ko: 'Korean'
  };
  return map[code] || 'English';
}

// Service worker startup logging
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 ChromeMind service worker restarted');
});

console.log('✅ ChromeMind background service worker ready!');