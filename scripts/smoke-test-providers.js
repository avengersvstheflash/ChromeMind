import { CONFIG } from '../src/config.js';
import * as openrouter from '../src/providers/openrouter.js';
import * as geminiApi from '../src/providers/gemini-api.js';

async function runSmokeTests() {
  console.log('=== ChromeMind Provider Smoke Test ===\n');

  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const hfToken = process.env.HF_TOKEN?.trim();

  let totalTested = 0;
  let failures = 0;

  // 1. OpenRouter
  if (openrouterKey) {
    totalTested += 1;
    const start = Date.now();
    try {
      const reply = await openrouter.generate(
        [{ role: 'user', content: 'Reply with exactly: OPENROUTER_OK' }],
        { apiKey: openrouterKey }
      );
      const latencyMs = Date.now() - start;
      console.log(`[OpenRouter] ✅ 200 OK (${latencyMs}ms)\n  Reply: "${reply}"\n`);
    } catch (error) {
      failures += 1;
      const latencyMs = Date.now() - start;
      console.error(`[OpenRouter] ❌ FAILED (Status: ${error.status || 'N/A'}, ${latencyMs}ms)\n  Error: ${error.message}\n`);
    }
  } else {
    console.log('[OpenRouter] ⏭️ Skipped (OPENROUTER_API_KEY not set)\n');
  }

  // 2. Google Gemini API
  if (geminiKey) {
    totalTested += 1;
    const start = Date.now();
    try {
      const reply = await geminiApi.generate(
        [{ role: 'user', content: 'Reply with exactly: GEMINI_OK' }],
        { apiKey: geminiKey }
      );
      const latencyMs = Date.now() - start;
      console.log(`[Gemini API] ✅ 200 OK (${latencyMs}ms)\n  Reply: "${reply}"\n`);
    } catch (error) {
      failures += 1;
      const latencyMs = Date.now() - start;
      console.error(`[Gemini API] ❌ FAILED (Status: ${error.status || 'N/A'}, ${latencyMs}ms)\n  Error: ${error.message}\n`);
    }
  } else {
    console.log('[Gemini API] ⏭️ Skipped (GEMINI_API_KEY not set)\n');
  }

  // 3. Hugging Face
  if (hfToken) {
    totalTested += 1;
    const start = Date.now();
    try {
      const response = await fetch(CONFIG.HF_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: 'Reply with exactly: HF_OK' })
      });
      const data = await response.json().catch(() => ({}));
      const latencyMs = Date.now() - start;
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      const text = data[0]?.generated_text || data.generated_text || '';
      console.log(`[Hugging Face] ✅ ${response.status} OK (${latencyMs}ms)\n  Reply: "${text.trim()}"\n`);
    } catch (error) {
      failures += 1;
      const latencyMs = Date.now() - start;
      console.error(`[Hugging Face] ❌ FAILED (${latencyMs}ms)\n  Error: ${error.message}\n`);
    }
  } else {
    console.log('[Hugging Face] ⏭️ Skipped (HF_TOKEN not set)\n');
  }

  console.log(`=== Summary: ${totalTested} tested, ${failures} failed ===`);

  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests().catch(err => {
  console.error('Fatal smoke test runner error:', err.message);
  process.exit(1);
});
