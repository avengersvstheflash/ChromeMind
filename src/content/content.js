// ChromeMind Phase 2 content intelligence.
// Webpage text is untrusted data. Sensitive pages and controls are excluded by default.

const MAX_TEXT_LENGTH = 12000;
const CHUNK_LENGTH = 2400;
const SENSITIVE_INPUT_SELECTOR = 'input[type="password"], input[type="email"], input[type="tel"], input[autocomplete*="cc-"], textarea, [contenteditable="true"]';
const SENSITIVE_PAGE_SELECTOR = 'input[type="password"], input[autocomplete="cc-number"], input[autocomplete="cc-csc"], [name*="card" i], [name*="cvv" i], [name*="ssn" i]';
const SENSITIVE_URL_PATTERN = /login|signin|sign-in|checkout|payment|billing|account\/settings|password|reset-password/i;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    chrome.storage.local.get(['contentExtractionEnabled'], settings => {
      if (settings.contentExtractionEnabled === false) {
        sendResponse({ success: false, error: 'Page extraction is disabled in ChromeMind settings.', code: 'extraction_disabled' });
        return;
      }
      const sensitive = detectSensitivePage();
      if (sensitive.detected) {
        sendResponse({ success: false, error: 'ChromeMind did not extract this page because it may contain sensitive information.', code: 'sensitive_page', signals: sensitive.signals });
        return;
      }
      sendResponse({ success: true, ...extractPageContent(), url: window.location.href });
    });
    return true;
  }

  try {
    if (request.action === 'highlightSelection' || request.action === 'showTranslationResult') {
      const text = request.action === 'showTranslationResult' ? request.originalText : request.text;
      if (text && !detectSensitivePage().detected) highlightText(text);
      showTooltip(request.action === 'showTranslationResult' ? `Translation: ${request.translatedText}` : 'Selection highlighted.');
      sendResponse({ success: true });
      return false;
    }
    sendResponse({ success: false, error: 'Unknown action', code: 'unknown_action' });
  } catch (error) {
    sendResponse({ success: false, error: error.message, code: 'content_script_error' });
  }
  return false;
});

function detectSensitivePage() {
  const signals = [];
  if (SENSITIVE_URL_PATTERN.test(window.location.href)) signals.push('sensitive_url');
  if (document.querySelector(SENSITIVE_PAGE_SELECTOR)) signals.push('sensitive_control');
  if (/\b(sign in|log in|checkout|payment|credit card|social security)\b/i.test(document.body?.innerText || '')) signals.push('sensitive_text');
  return { detected: signals.length > 0, signals };
}

function extractPageContent() {
  const root = chooseContentRoot();
  const blocks = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,pre,blockquote')]
    .filter(element => !element.closest('nav,header,footer,aside,form,dialog,[aria-hidden="true"]'))
    .filter(element => !element.matches(SENSITIVE_INPUT_SELECTOR))
    .map(element => {
      const text = element.innerText?.replace(/\s+/g, ' ').trim();
      if (!text) return '';
      return element.tagName.toLowerCase().startsWith('h') ? `\n${text}\n` : text;
    })
    .filter(Boolean);

  const fullText = blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const content = fullText.slice(0, MAX_TEXT_LENGTH);
  return {
    title: document.title,
    content: content || 'No readable article content found on this page.',
    chunks: chunkText(content),
    truncated: fullText.length > MAX_TEXT_LENGTH,
    contentType: root === document.body ? 'document' : 'article',
    privacy: 'page-content-stays-in-extension-until-provider-policy-allows'
  };
}

function chunkText(text) {
  const chunks = [];
  for (let start = 0; start < text.length; start += CHUNK_LENGTH) {
    chunks.push({ index: chunks.length, text: text.slice(start, start + CHUNK_LENGTH) });
  }
  return chunks;
}

function chooseContentRoot() {
  const candidates = [...document.querySelectorAll('article, main, [role="main"], .post, .article, .entry-content')]
    .filter(element => !element.closest('nav,header,footer,aside'));
  return candidates.sort((a, b) => score(b) - score(a))[0] || document.body;
}

function score(element) {
  return (element.innerText || '').length + element.querySelectorAll('p').length * 200;
}

function highlightText(text) {
  const target = text.trim();
  if (!target || target.length > 500) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.includes(target) || node.parentElement?.closest(SENSITIVE_INPUT_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest('.chromemind-highlight')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const node = walker.nextNode();
  if (!node) return;
  const index = node.nodeValue.indexOf(target);
  const range = document.createRange();
  range.setStart(node, index);
  range.setEnd(node, index + target.length);
  const mark = document.createElement('mark');
  mark.className = 'chromemind-highlight';
  range.surroundContents(mark);
  mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showTooltip(message) {
  document.querySelector('.chromemind-tooltip')?.remove();
  const tooltip = document.createElement('div');
  tooltip.className = 'chromemind-tooltip';
  tooltip.textContent = message;
  tooltip.setAttribute('role', 'status');
  tooltip.style.top = `${window.scrollY + 24}px`;
  tooltip.style.right = '24px';
  document.body.appendChild(tooltip);
  setTimeout(() => tooltip.remove(), 4000);
}
