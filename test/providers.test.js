import test from 'node:test';
import assert from 'node:assert/strict';
import { messagesToPrompt, providerOrder } from '../src/providers/runtime.js';
import { ProviderError, isRetryableStatus } from '../src/providers/provider-errors.js';

test('messagesToPrompt preserves roles and bounds content', () => {
  const prompt = messagesToPrompt([{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi' }]);
  assert.equal(prompt, 'USER: Hello\nASSISTANT: Hi');
});

test('provider policy keeps Chrome AI first by default', () => {
  assert.deepEqual(providerOrder('chrome-local-first'), ['gemini-nano', 'cloud']);
  assert.deepEqual(providerOrder('local-only'), ['gemini-nano']);
  assert.deepEqual(providerOrder('chrome-local-only'), ['gemini-nano']);
  assert.deepEqual(providerOrder('cloud-only'), ['cloud']);
});

test('retry classification excludes authentication failures', () => {
  assert.equal(isRetryableStatus(401), false);
  assert.equal(isRetryableStatus(403), false);
  assert.equal(isRetryableStatus(429), true);
  assert.equal(isRetryableStatus(503), true);
});

test('ProviderError retains policy-relevant metadata', () => {
  const error = new ProviderError('Unavailable', { provider: 'gemini-nano', code: 'unavailable', retryable: false });
  assert.equal(error.provider, 'gemini-nano');
  assert.equal(error.code, 'unavailable');
  assert.equal(error.retryable, false);
});
