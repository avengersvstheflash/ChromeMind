import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSensitiveUrl,
  isSensitiveControl,
  chunkText,
  scoreContentNode,
  MAX_TEXT_LENGTH,
  CHUNK_LENGTH,
  SENSITIVE_URL_PATTERN
} from '../src/content/extractor-utils.js';

test('isSensitiveUrl detects auth, payment, and account credential endpoints', () => {
  const sensitiveUrls = [
    'https://example.com/login',
    'https://example.com/auth/signin',
    'https://example.com/user/sign-in',
    'https://shop.example.com/checkout/step-2',
    'https://billing.service.com/payment',
    'https://cloud.provider.com/billing/invoices',
    'https://app.example.com/account/settings',
    'https://example.com/user/password',
    'https://example.com/auth/reset-password?token=123'
  ];

  for (const url of sensitiveUrls) {
    assert.equal(isSensitiveUrl(url), true, `Expected sensitive URL: ${url}`);
  }
});

test('isSensitiveUrl permits non-sensitive public and content URLs', () => {
  const safeUrls = [
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    'https://github.com/avengersvstheflash/ChromeMind',
    'https://en.wikipedia.org/wiki/Artificial_intelligence',
    'https://news.ycombinator.com/item?id=123456',
    'https://blog.example.com/posts/how-to-code'
  ];

  for (const url of safeUrls) {
    assert.equal(isSensitiveUrl(url), false, `Expected safe URL: ${url}`);
  }
});

test('isSensitiveUrl safely handles invalid and empty inputs', () => {
  assert.equal(isSensitiveUrl(''), false);
  assert.equal(isSensitiveUrl(null), false);
  assert.equal(isSensitiveUrl(undefined), false);
  assert.equal(isSensitiveUrl(123), false);
  assert.equal(isSensitiveUrl({}), false);
});

test('isSensitiveControl detects sensitive inputs and editable areas', () => {
  // Passwords and credentials
  assert.equal(isSensitiveControl({ tagName: 'input', type: 'password' }), true);
  assert.equal(isSensitiveControl({ type: 'password' }), true);

  // Communications / PII inputs
  assert.equal(isSensitiveControl({ tagName: 'input', type: 'email' }), true);
  assert.equal(isSensitiveControl({ tagName: 'input', type: 'tel' }), true);

  // Credit card autocomplete descriptors
  assert.equal(isSensitiveControl({ tagName: 'input', autocomplete: 'cc-number' }), true);
  assert.equal(isSensitiveControl({ tagName: 'input', autocomplete: 'cc-csc' }), true);
  assert.equal(isSensitiveControl({ tagName: 'input', autocomplete: 'cc-exp' }), true);

  // Sensitive field names
  assert.equal(isSensitiveControl({ tagName: 'input', name: 'userCreditCard' }), true);
  assert.equal(isSensitiveControl({ tagName: 'input', name: 'card_cvv' }), true);
  assert.equal(isSensitiveControl({ tagName: 'input', name: 'ssn_number' }), true);

  // Textareas and contenteditable
  assert.equal(isSensitiveControl({ tagName: 'textarea' }), true);
  assert.equal(isSensitiveControl({ tagName: 'div', contentEditable: true }), true);
  assert.equal(isSensitiveControl({ tagName: 'div', contentEditable: 'true' }), true);
  assert.equal(isSensitiveControl({ tagName: 'span', isContentEditable: true }), true);
});

test('isSensitiveControl works with DOM element getAttribute interface', () => {
  const mockDomInput = {
    getAttribute(name) {
      if (name === 'type') return 'password';
      return null;
    }
  };
  assert.equal(isSensitiveControl(mockDomInput), true);

  const mockDomSafe = {
    getAttribute(name) {
      if (name === 'type') return 'text';
      if (name === 'name') return 'search_query';
      return null;
    }
  };
  assert.equal(isSensitiveControl(mockDomSafe), false);
});

test('isSensitiveControl permits safe and non-sensitive controls', () => {
  assert.equal(isSensitiveControl({ tagName: 'input', type: 'text', name: 'search' }), false);
  assert.equal(isSensitiveControl({ tagName: 'button', type: 'submit' }), false);
  assert.equal(isSensitiveControl({ tagName: 'div', className: 'content' }), false);
  assert.equal(isSensitiveControl({ tagName: 'p' }), false);
  assert.equal(isSensitiveControl(null), false);
  assert.equal(isSensitiveControl(undefined), false);
  assert.equal(isSensitiveControl(''), false);
});

test('chunkText splits text within CHUNK_LENGTH boundaries', () => {
  assert.equal(CHUNK_LENGTH, 2400);

  // Empty or invalid input
  assert.deepEqual(chunkText(''), []);
  assert.deepEqual(chunkText(null), []);
  assert.deepEqual(chunkText(undefined), []);

  // Text smaller than chunk size
  const shortText = 'Short article text.';
  const shortChunks = chunkText(shortText);
  assert.equal(shortChunks.length, 1);
  assert.equal(shortChunks[0].index, 0);
  assert.equal(shortChunks[0].text, shortText);

  // Text exactly equal to chunk length
  const exactText = 'a'.repeat(CHUNK_LENGTH);
  const exactChunks = chunkText(exactText);
  assert.equal(exactChunks.length, 1);
  assert.equal(exactChunks[0].index, 0);
  assert.equal(exactChunks[0].text.length, CHUNK_LENGTH);

  // Multi-chunk text (5000 chars -> 2400 + 2400 + 200)
  const multiText = 'x'.repeat(5000);
  const multiChunks = chunkText(multiText);
  assert.equal(multiChunks.length, 3);
  assert.equal(multiChunks[0].index, 0);
  assert.equal(multiChunks[0].text.length, 2400);
  assert.equal(multiChunks[1].index, 1);
  assert.equal(multiChunks[1].text.length, 2400);
  assert.equal(multiChunks[2].index, 2);
  assert.equal(multiChunks[2].text.length, 200);
});

test('chunkText enforces MAX_TEXT_LENGTH boundary', () => {
  assert.equal(MAX_TEXT_LENGTH, 12000);

  // Oversized text (20,000 characters)
  const oversizedText = 'y'.repeat(20000);
  const chunks = chunkText(oversizedText);

  // 12000 / 2400 = 5 chunks
  assert.equal(chunks.length, 5);
  const totalLength = chunks.reduce((sum, c) => sum + c.text.length, 0);
  assert.equal(totalLength, MAX_TEXT_LENGTH);
  assert.equal(chunks[4].index, 4);
});

test('chunkText supports custom max and chunkSize boundaries', () => {
  const customText = 'abcdefghijklmnopqrstuvwxyz';
  const customChunks = chunkText(customText, 10, 3);

  // Max 10 chars: 'abcdefghij', chunk size 3: ['abc', 'def', 'ghi', 'j']
  assert.equal(customChunks.length, 4);
  assert.equal(customChunks[0].text, 'abc');
  assert.equal(customChunks[1].text, 'def');
  assert.equal(customChunks[2].text, 'ghi');
  assert.equal(customChunks[3].text, 'j');
});

test('scoreContentNode weighs text length and paragraph frequency', () => {
  // Empty or invalid nodes
  assert.equal(scoreContentNode(null), 0);
  assert.equal(scoreContentNode(undefined), 0);
  assert.equal(scoreContentNode({}), 0);

  // Text only (no paragraphs)
  const textOnlyNode = { text: 'a'.repeat(400) };
  assert.equal(scoreContentNode(textOnlyNode), 400);

  // Text with explicit paragraphCount (+200 per paragraph)
  const articleNode = {
    text: 'a'.repeat(800),
    paragraphCount: 4
  };
  // 800 + (4 * 200) = 1600
  assert.equal(scoreContentNode(articleNode), 1600);

  // Node with paragraph array
  const listNode = {
    innerText: 'Short intro', // length 11
    paragraphs: ['p1', 'p2'] // 2 * 200 = 400
  };
  assert.equal(scoreContentNode(listNode), 411);

  // Node with DOM querySelectorAll mock
  const domNode = {
    innerText: 'Main article content here.', // length 26
    querySelectorAll(selector) {
      if (selector === 'p') return [{}, {}, {}]; // 3 paragraphs
      return [];
    }
  };
  // 26 + (3 * 200) = 626
  assert.equal(scoreContentNode(domNode), 626);
});
