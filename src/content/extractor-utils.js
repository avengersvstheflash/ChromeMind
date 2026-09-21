// ChromeMind Pure Extractor Utilities
// Webpage text is untrusted data. Sensitive pages, URLs, and controls are excluded by default.
// Pure functions only — no document, no window, no chrome dependencies.

export const MAX_TEXT_LENGTH = 12000;
export const CHUNK_LENGTH = 2400;

export const SENSITIVE_INPUT_SELECTOR = 'input[type="password"], input[type="email"], input[type="tel"], input[autocomplete*="cc-"], textarea, [contenteditable="true"]';
export const SENSITIVE_PAGE_SELECTOR = 'input[type="password"], input[autocomplete="cc-number"], input[autocomplete="cc-csc"], [name*="card" i], [name*="cvv" i], [name*="ssn" i]';
export const SENSITIVE_URL_PATTERN = /login|signin|sign-in|checkout|payment|billing|account\/settings|password|reset-password/i;

/**
 * Checks whether a URL contains sensitive path or query keywords.
 * @param {string} url
 * @returns {boolean}
 */
export function isSensitiveUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return SENSITIVE_URL_PATTERN.test(url);
}

/**
 * Checks whether a DOM element or element descriptor represents a sensitive input control.
 * Works with DOM Element instances or plain JavaScript object descriptors.
 * @param {object} el - DOM element or descriptor { tagName, type, autocomplete, name, contentEditable }
 * @returns {boolean}
 */
export function isSensitiveControl(el) {
  if (!el || typeof el !== 'object') return false;

  const getAttr = (name) => {
    if (typeof el.getAttribute === 'function') {
      const val = el.getAttribute(name);
      if (val !== null && val !== undefined) return String(val);
    }
    const prop = el[name];
    if (prop !== null && prop !== undefined) return String(prop);
    return '';
  };

  const tagName = (el.tagName || getAttr('tagName') || '').toLowerCase();
  const type = (el.type || getAttr('type') || '').toLowerCase();
  const autocomplete = (el.autocomplete || getAttr('autocomplete') || '').toLowerCase();
  const name = (el.name || getAttr('name') || '').toLowerCase();
  const isContentEditable = el.contentEditable === true || el.contentEditable === 'true' ||
                            getAttr('contenteditable') === 'true' || el.isContentEditable === true;

  if (tagName === 'textarea') return true;
  if (isContentEditable) return true;
  if (type === 'password' || type === 'email' || type === 'tel') return true;
  if (autocomplete.includes('cc-')) return true;
  if (/card|cvv|ssn/i.test(name)) return true;

  return false;
}

/**
 * Slices text to maximum length and splits into indexed chunks.
 * @param {string} text - The input text
 * @param {number} [max=MAX_TEXT_LENGTH] - Max bounded length
 * @param {number} [chunkSize=CHUNK_LENGTH] - Chunk size
 * @returns {Array<{ index: number, text: string }>}
 */
export function chunkText(text, max = MAX_TEXT_LENGTH, chunkSize = CHUNK_LENGTH) {
  if (!text || typeof text !== 'string') return [];
  const boundedText = text.slice(0, max);
  const chunks = [];
  for (let start = 0; start < boundedText.length; start += chunkSize) {
    chunks.push({
      index: chunks.length,
      text: boundedText.slice(start, start + chunkSize)
    });
  }
  return chunks;
}

/**
 * Scores a candidate content container node based on text length and paragraph count.
 * Pure function accepting DOM elements or mock/plain objects.
 * @param {object} node - DOM element or descriptor { text, innerText, textLength, paragraphCount, paragraphs }
 * @returns {number}
 */
export function scoreContentNode(node) {
  if (!node || typeof node !== 'object') return 0;
  const rawText = node.innerText || node.text || '';
  const textLength = typeof node.textLength === 'number' ? node.textLength : rawText.length;

  let paragraphCount = 0;
  if (typeof node.paragraphCount === 'number') {
    paragraphCount = node.paragraphCount;
  } else if (Array.isArray(node.paragraphs)) {
    paragraphCount = node.paragraphs.length;
  } else if (typeof node.querySelectorAll === 'function') {
    paragraphCount = node.querySelectorAll('p').length;
  }

  return textLength + paragraphCount * 200;
}
