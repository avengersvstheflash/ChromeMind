// ChromeMind Phase 2 content intelligence.
// Page text is treated as untrusted data and sensitive controls are excluded.

const MAX_TEXT_LENGTH = 12000;
const SENSITIVE_INPUT_SELECTOR = 'input[type="password"], input[type="email"], input[type="tel"], textarea, [contenteditable="true"]';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getPageContent') {
      sendResponse({ success: true, ...extractPageContent(), url: window.location.href });
      return false;
    }
    if (request.action === 'highlightSelection' || request.action === 'showTranslationResult') {
      const text = request.action === 'showTranslationResult' ? request.originalText : request.text;
      if (text) highlightText(text);
      if (request.action === 'showTranslationResult') {
        showTooltip(`Translation: ${request.translatedText}`);
      } else {
        showTooltip('Selection highlighted.');
      }
      sendResponse({ success: true });
      return false;
    }
    sendResponse({ success: false, error: 'Unknown action' });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
  return false;
});

function extractPageContent() {
  const root = chooseContentRoot();
  const blocks = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,pre,blockquote')]
    .filter(element => !element.closest('nav,header,footer,aside,form,dialog,[aria-hidden="true"]'))
    .filter(element => !element.matches(SENSITIVE_INPUT_SELECTOR))
    .map(element => {
      const text = element.innerText?.replace(/\s+/g, ' ').trim();
      if (!text) return '';
      const tag = element.tagName.toLowerCase();
      return tag.startsWith('h') ? `\n${text}\n` : text;
    })
    .filter(Boolean);

  const content = blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT_LENGTH);
  return {
    title: document.title,
    content: content || 'No readable article content found on this page.',
    truncated: content.length >= MAX_TEXT_LENGTH,
    contentType: root === document.body ? 'document' : 'article'
  };
}

function chooseContentRoot() {
  const candidates = [...document.querySelectorAll('article, main, [role="main"], .post, .article, .entry-content')]
    .filter(element => !element.closest('nav,header,footer,aside'));
  return candidates.sort((a, b) => score(b) - score(a))[0] || document.body;
}

function score(element) {
  const textLength = (element.innerText || '').length;
  const paragraphCount = element.querySelectorAll('p').length;
  return textLength + paragraphCount * 200;
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
