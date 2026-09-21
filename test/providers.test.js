import test from 'node:test';
import assert from 'node:assert/strict';
import {
  messagesToPrompt,
  providerOrder,
  resolveActiveCloudProvider,
  isCloudConfigured,
  cloudProvider
} from '../src/providers/runtime.js';
import { ProviderError, isRetryableStatus } from '../src/providers/provider-errors.js';
import * as openrouter from '../src/providers/openrouter.js';
import * as geminiApi from '../src/providers/gemini-api.js';
import { messagesToGemini } from '../src/providers/gemini-api.js';

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

test('messagesToGemini transform converts user and assistant to model with parts', () => {
  const payload = messagesToGemini([
    { role: 'user', content: 'Explain quantum computing' },
    { role: 'assistant', content: 'Quantum computing uses qubits...' }
  ]);
  assert.deepEqual(payload, {
    contents: [
      { role: 'user', parts: [{ text: 'Explain quantum computing' }] },
      { role: 'model', parts: [{ text: 'Quantum computing uses qubits...' }] }
    ]
  });
});

test('missing-key availability tests for openrouter, gemini, and huggingface', () => {
  assert.equal(openrouter.isAvailable(''), false);
  assert.equal(openrouter.isAvailable(null), false);
  assert.equal(openrouter.isAvailable('  '), false);
  assert.equal(openrouter.isAvailable('sk-or-valid-key'), true);

  assert.equal(geminiApi.isAvailable(''), false);
  assert.equal(geminiApi.isAvailable(undefined), false);
  assert.equal(geminiApi.isAvailable('AIzaSyValidKey'), true);

  assert.equal(isCloudConfigured({ cloudProvider: 'openrouter', openrouterApiKey: '' }), false);
  assert.equal(isCloudConfigured({ cloudProvider: 'openrouter', openrouterApiKey: 'sk-or-123' }), true);
  assert.equal(isCloudConfigured({ cloudProvider: 'gemini-api', geminiApiKey: '' }), false);
  assert.equal(isCloudConfigured({ cloudProvider: 'gemini-api', geminiApiKey: 'AIzaSy123' }), true);
  assert.equal(isCloudConfigured({ cloudProvider: 'huggingface', hf_api_key: '' }), false);
  assert.equal(isCloudConfigured({ cloudProvider: 'huggingface', hf_api_key: 'hf_123' }), true);

  assert.equal(geminiApi.getCapabilities().defaultModel, 'gemini-3.6-flash');
  assert.equal(openrouter.getCapabilities().defaultModel, 'deepseek/deepseek-v4-flash');
});

test('mocked fetch verifies OpenRouter request URL, headers, and body shape', async () => {
  const originalFetch = globalThis.fetch;
  try {
    let capturedUrl, capturedOptions;
    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Mock OpenRouter response' } }]
        })
      };
    };

    const result = await openrouter.generate(
      [{ role: 'user', content: 'Hi OpenRouter' }],
      { apiKey: 'sk-or-test-key', model: 'deepseek/deepseek-v4-flash' }
    );

    assert.equal(result, 'Mock OpenRouter response');
    assert.equal(capturedUrl, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(capturedOptions.method, 'POST');
    assert.equal(capturedOptions.headers['Authorization'], 'Bearer sk-or-test-key');
    assert.equal(capturedOptions.headers['Content-Type'], 'application/json');
    assert.equal(capturedOptions.headers['HTTP-Referer'], 'https://github.com/avengersvstheflash/ChromeMind');
    assert.equal(capturedOptions.headers['X-Title'], 'ChromeMind');
    const parsedBody = JSON.parse(capturedOptions.body);
    assert.equal(parsedBody.model, 'deepseek/deepseek-v4-flash');
    assert.deepEqual(parsedBody.messages, [{ role: 'user', content: 'Hi OpenRouter' }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('mocked fetch verifies Gemini API request URL with key and body shape', async () => {
  const originalFetch = globalThis.fetch;
  try {
    let capturedUrl, capturedOptions;
    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Mock Gemini response' }] } }]
        })
      };
    };

    const result = await geminiApi.generate(
      [{ role: 'user', content: 'Hello Gemini' }, { role: 'assistant', content: 'Hi' }],
      { apiKey: 'AIzaSyTestKey', model: 'gemini-3.6-flash' }
    );

    assert.equal(result, 'Mock Gemini response');
    assert.ok(capturedUrl.startsWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'));
    assert.ok(capturedUrl.includes('key=AIzaSyTestKey'));
    assert.equal(capturedOptions.method, 'POST');
    assert.equal(capturedOptions.headers['Content-Type'], 'application/json');
    const parsedBody = JSON.parse(capturedOptions.body);
    assert.deepEqual(parsedBody, {
      contents: [
        { role: 'user', parts: [{ text: 'Hello Gemini' }] },
        { role: 'model', parts: [{ text: 'Hi' }] }
      ]
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('provider-selection dispatch routes to selected cloud adapter', async () => {
  const originalFetch = globalThis.fetch;

  assert.equal(resolveActiveCloudProvider({ cloudProvider: 'openrouter' }), 'openrouter');
  assert.equal(resolveActiveCloudProvider({ cloudProvider: 'gemini-api' }), 'gemini-api');
  assert.equal(resolveActiveCloudProvider({ cloudProvider: 'huggingface' }), 'huggingface');
  assert.equal(resolveActiveCloudProvider({}), 'huggingface');

  try {
    let dispatchedUrl = '';
    globalThis.fetch = async (url) => {
      dispatchedUrl = url;
      if (url.includes('openrouter.ai')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: 'from openrouter' } }] })
        };
      }
      if (url.includes('googleapis.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ candidates: [{ content: { parts: [{ text: 'from gemini' }] } }] })
        };
      }
      if (url.includes('huggingface.co')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ generated_text: 'from huggingface' }]
        };
      }
      throw new Error('Unexpected URL: ' + url);
    };

    const resOr = await cloudProvider(
      [{ role: 'user', content: 'test' }],
      { cloudProvider: 'openrouter', openrouterApiKey: 'test-key' }
    );
    assert.equal(resOr, 'from openrouter');
    assert.ok(dispatchedUrl.includes('openrouter.ai'));

    const resGem = await cloudProvider(
      [{ role: 'user', content: 'test' }],
      { cloudProvider: 'gemini-api', geminiApiKey: 'test-key' }
    );
    assert.equal(resGem, 'from gemini');
    assert.ok(dispatchedUrl.includes('googleapis.com'));

    const resHf = await cloudProvider(
      [{ role: 'user', content: 'test' }],
      { cloudProvider: 'huggingface', hf_api_key: 'test-key' }
    );
    assert.equal(resHf, 'from huggingface');
    assert.ok(dispatchedUrl.includes('huggingface.co'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
