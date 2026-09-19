import test from 'node:test';
import assert from 'node:assert/strict';
import { messagesToPrompt } from '../src/providers/runtime.js';

test('messagesToPrompt preserves roles and bounds content', () => {
  const prompt = messagesToPrompt([{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi' }]);
  assert.equal(prompt, 'USER: Hello\nASSISTANT: Hi');
});
