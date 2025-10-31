// src/content/content.js
// FIXED: Proper message handling, CSS injection, and better error handling

console.log('🧠 ChromeMind content script loaded on:', window.location.href);

// Inject CSS for highlights and tooltips dynamically
const styleEl = document.createElement('style');
styleEl.textContent = `
  .chromemind-highlight {
    background-color: #ffeb3b;
    padding: 2px 4px;
    border-radius: 3px;
    transition: all 0.3s ease;
    outline: 1px solid #ffc107;
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
    cursor: pointer;
  }
  
  .chromemind-tooltip {
    position: absolute;
    background: white;
    border: 2px solid #667eea;
    border-radius: 8px;
    padding: 10px 15px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    pointer-events: auto;
    opacity: 0.99;
    max-width: 300px;
    word-wrap: break-word;
    line-height: 1.4;
  }
`;
document.head.appendChild(styleEl);

// Message listener for popup/background communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Content Script] Received message:', request.action);

  if (request.action === 'getPageContent') {
    try {
      const content = extractPageContent();
      const title = document.title;
      sendResponse({
        success: true,
        content: content,
        title: title,
        url: window.location.href
      });
    } catch (error) {
      console.error('[Content Script] getPageContent error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
    return true;
  }

  if (request.action === 'highlightSelection') {
    try {
      highlightText(request.text);
      showBubbleTooltip('Selection highlighted!', window.getSelection());
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Content Script] highlightSelection error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'showTranslationResult') {
    try {
      highlightText(request.originalText);
      showBubbleTooltip(`Translation: ${request.translatedText}`, window.getSelection());
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Content Script] showTranslationResult error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

/**
 * Extract main content from page
 * Tries common selectors and falls back to body
 */
function extractPageContent() {
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.main-content',
    '#content',
    'body'
  ];

  let content = '';

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = element.innerText;
      break;
    }
  }

  // Clean up content
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 5000);

  return content || 'No content found on this page.';
}

/**
 * Highlight plain text within elements
 * Uses regex to find and wrap text in highlight span
 */
function highlightText(text, color = '#ffeb3b') {
  if (!text || text.length === 0) {
    console.warn('[Content Script] No text to highlight');
    return;
  }

  const elements = Array.from(document.querySelectorAll('body, article, main, .content, .main-content, #content'));

  for (let el of elements) {
    if (el.innerText.includes(text)) {
      const safeText = escapeHTML(text);
      const regex = new RegExp(escapeRegExp(text), 'gi');
      try {
        const html = el.innerHTML.replace(
          regex,
          `<span class="chromemind-highlight" title="ChromeMind highlight">$&</span>`
        );
        el.innerHTML = html;
        console.log('[Content Script] Highlighted text successfully');
        break;
      } catch (err) {
        console.error('[Content Script] Highlight error:', err);
      }
    }
  }
}

/**
 * Escape regex special characters
 * Prevents regex injection attacks
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * HTML escape to prevent XSS
 * Escapes dangerous HTML characters
 */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

/**
 * Show a floating tooltip bubble
 * Positions near the user's selection
 */
function showBubbleTooltip(message, selection) {
  removeExistingBubble();

  let tooltip = document.createElement('div');
  tooltip.className = 'chromemind-tooltip';
  tooltip.textContent = message;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('aria-live', 'polite');

  if (selection && selection.rangeCount > 0) {
    try {
      let rect = selection.getRangeAt(0).getBoundingClientRect();
      tooltip.style.top = (window.scrollY + rect.bottom + 8) + 'px';
      tooltip.style.left = (window.scrollX + rect.left) + 'px';
    } catch (err) {
      console.warn('[Content Script] Could not position tooltip:', err);
      tooltip.style.top = '20px';
      tooltip.style.left = '20px';
    }
  } else {
    tooltip.style.top = '20px';
    tooltip.style.left = '20px';
  }

  document.body.appendChild(tooltip);
  console.log('[Content Script] Tooltip shown');

  // Auto-remove after 3 seconds
  setTimeout(removeExistingBubble, 3000);
}

/**
 * Remove existing tooltip bubble
 */
function removeExistingBubble() {
  let t = document.querySelector('.chromemind-tooltip');
  if (t) {
    t.remove();
    console.log('[Content Script] Tooltip removed');
  }
}

console.log('✅ ChromeMind content script ready!');
