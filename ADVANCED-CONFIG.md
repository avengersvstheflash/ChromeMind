# ChromeMind - Known Issues & Advanced Configuration

**Detailed breakdown of limitations, future roadmap, and advanced setup options.**

---

## Known Limitations & Issues

### 1. Gemini Nano Integration (Experimental, Disabled)

**Status:** ⏳ Planned for future  
**Current:** Disabled (`USE_GEMINI_NANO: false`)

**Issue:**
- At development time, Google's Chrome Gemini Nano API was **not publicly stable** or available
- Code structure supports it (Priority 2 in fallback chain)
- Waiting for official stable API release

**When it becomes available:**
```javascript
// In config.js:
USE_GEMINI_NANO: true  // Enable when APIs stable

// In popup.js or background.js:
// Status will show: 🔵 "AI Ready (Gemini Nano)"
```

**Why it matters:**
- Gemini Nano = instant in-browser LLM (no downloads needed)
- True private AI without local server setup
- Lightning-fast response times

---

### 2. Local LLM Speed in Extension (vs. Desktop App)

**Issue:** Slower in extension than GPT4All desktop app

**Why:**
- Extension runs in restricted sandbox with limited resources
- Async message passing adds latency
- No direct GPU access (depends on OS configuration)
- GPT4All desktop app has direct memory/GPU control

**Current Workaround:**
- Use **Mistral-7B** instead of Llama-3-8B (faster)
- Increase `max_tokens` parameter for more verbose responses
- Use cloud fallback for critical operations

**Future Fix:**
- Token streaming (realtime chunks instead of waiting for full response)
- WebWorker integration for background processing
- Direct GPU access (if Manifest V4 allows)

---

### 3. Page Content Extraction Limitations

**Issue:** Some websites not extracting correctly

**Why:**
- Uses CSS selectors: `article`, `main`, `[role="main"]`, `.content`, etc.
- Complex/custom layouts may not match these selectors
- JavaScript-heavy sites may load content asynchronously
- Content maxes at 5,000 characters

**Solution:**
1. **Manual copy-paste** into Chat tab
2. **Use Chat tab directly** instead of auto-summarize
3. **Workaround code** (for developer):
   ```javascript
   // In src/content.js, add custom selector for specific site:
   const selectors = [
     'article',
     'main',
     '[role="main"]',
     '.post-content',           // Add custom selector
     '.article-body',            // Add for your site
     '.content',
     'body'
   ];
   ```

---

### 4. Context Window Limit (5,000 Characters)

**Issue:** Large articles truncated

**Current Code:**
```javascript
// In src/content.js:
content = content.slice(0, 5000);  // Hard limit
```

**Why This Limit:**
- Smaller contexts = faster processing
- Fits within token limits of smaller models
- Keeps extension responsive

**Workaround:**
1. Copy key sections manually
2. Break article into parts
3. Ask follow-up questions in Chat tab

**Future Solution:**
- Dynamic content sizing based on available model
- RAG (Retrieval-Augmented Generation) for smart chunking

---

### 5. Multi-Language Support

**Currently Supported Languages:**
- Spanish, French, German, Japanese, Chinese, Portuguese, Italian, Russian, Korean

**Why Limited:**
- Supported by `getLanguageName()` mapping in background.js
- Easy to add more (just 2 lines)

**To Add New Language:**
```javascript
// In src/background.js, in getLanguageName():
function getLanguageName(code) {
  const map = {
    es: 'Spanish',
    fr: 'French',
    nl: 'Dutch',      // ← Add new
    pl: 'Polish',     // ← Add new
    sv: 'Swedish'     // ← Add new
    // ... more
  };
  return map[code] || 'English';
}

// Then in popup.html, add select option:
<option value="nl">🇳🇱 Dutch</option>
<option value="pl">🇵🇱 Polish</option>
```

---

### 6. No Real-Time Streaming (Local LLM)

**Issue:** Must wait for full response (not streaming)

**Why:**
- Local LLM API returns full response as one JSON
- Extension doesn't currently poll for tokens
- Feels slower than streaming chat apps

**Future Fix:**
- Implement token polling
- Stream tokens as they arrive
- Show "thinking..." indicator

---

## Advanced Configuration

### Custom Prompt Engineering

**For better summaries, edit the prompts in `src/background.js`:**

```javascript
// Current summary prompt:
const messages = [
  { role: 'user', content: `Summarize this content in 2-3 sentences:\n\n${content}` }
];

// Make it more specific:
const messages = [
  { role: 'user', content: `
    You are a professional writer. Summarize the following content in 2-3 sentences.
    Focus on: key takeaways, main ideas, and important facts.
    Use clear, professional language.
    
    Content:
    ${content}
  ` }
];
```

**Translation prompt:**
```javascript
// Current:
const messages = [
  { role: 'user', content: `Translate the following text to ${targetLangName}:\n\n${text}` }
];

// Better with context:
const messages = [
  { role: 'user', content: `
    Translate the following text to ${targetLangName}.
    Maintain the original tone and style.
    If there are idioms, translate their meaning rather than literally.
    
    Text to translate:
    ${text}
  ` }
];
```

**Result:** Better quality responses from same model! 🎯

---

### Using Alternative Local LLM: Ollama

Instead of GPT4All, you can use **Ollama** (another local LLM runner):

**Install Ollama:**
```bash
# macOS/Linux/Windows
# Download from: https://ollama.ai/

# Or via Homebrew (macOS):
brew install ollama
```

**Start Ollama Server:**
```bash
# Default port: 11434
ollama serve
```

**Configure ChromeMind for Ollama:**

```javascript
// In src/config.js:
LOCAL_SERVER_URL: 'http://localhost:11434/api/generate',  // Different endpoint!
LOCAL_MODEL: 'llama2',  // Ollama model name

// Note: Ollama API format is different from GPT4All
// You may need to modify huggingface.js:
```

**Modify `src/huggingface.js` for Ollama:**
```javascript
// Add Ollama detection:
const body = CONFIG.LOCAL_SERVER_URL.includes('11434')
  ? {
      model: CONFIG.LOCAL_MODEL,
      prompt: prompt,
      stream: false
    }
  : {
      model: CONFIG.LOCAL_MODEL,
      prompt: prompt,
      max_tokens: 300,
      temperature: 0.7
    };
```

---

### Using Custom Cloud LLM (Not HuggingFace)

**Example: AWS Bedrock**

```javascript
// In src/config.js:
BEDROCK_URL: 'https://bedrock-runtime.{region}.amazonaws.com/...',
BEDROCK_KEY: '',  // Your AWS access key
USE_BEDROCK: true,

// In src/huggingface.js:
if (USE_BEDROCK) {
  try {
    const response = await fetch(BEDROCK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEDROCK_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 300
      })
    });
    
    const data = await response.json();
    if (data.result) return data.result;
  } catch (err) {
    console.warn('[AI] Bedrock failed...');
  }
}
```

**Other providers (same pattern):**
- Azure OpenAI
- Replicate
- Together AI
- RunPod

---

### Increasing Max Tokens for Longer Responses

**More detailed responses = more tokens**

```javascript
// In src/background.js, increase max_tokens:

// Current (short responses):
{ max_new_tokens: 100 }

// For longer summarization:
{ max_new_tokens: 200 }

// For detailed translation:
{ max_new_tokens: 150 }

// For complex analysis:
{ max_new_tokens: 300 }
```

**Trade-off:** More tokens = slower response, better quality

---

### Disabling Cloud Fallback (Privacy Mode)

**Use only local LLM, never send to cloud:**

```javascript
// In src/config.js:
USE_LOCAL_FIRST: true,      // Keep this
HF_API_KEY: '',             // Leave empty
TIMEOUT: 30000,

// In src/huggingface.js, modify to block cloud:
// Comment out or remove the cloud fallback section:
/*
// 🟡 PRIORITY 3: Fall back to Cloud (HuggingFace)
console.log('[AI] 🟡 Using CLOUD model (HuggingFace)...');
return await callCloudModel(prompt);
*/

// Instead, throw error:
throw new Error('[AI] ❌ No local backend available. Add API key for cloud.');
```

**Result:** 100% private, or complete failure—no middle ground! 🔐

---

### Performance Tuning for Slow Machines

**Lower token limits & faster model:**

```javascript
// In src/config.js:
LOCAL_MODEL: 'mistral-7b-openorca',  // Smaller = faster
TIMEOUT: 60000,                       // Longer timeout

// In src/background.js:
{ max_new_tokens: 50 }  // Shorter responses

// In src/huggingface.js:
temperature: 0.5,       // Less creative = faster
```

**On slow machines:** Accept slower, shorter responses

---

### Performance Tuning for Fast Machines

**Go all-out on quality:**

```javascript
// In src/config.js:
LOCAL_MODEL: 'llama-2-13b',  // Largest available
TIMEOUT: 30000,

// In src/background.js:
{ max_new_tokens: 300 }  // Longer responses

// In src/huggingface.js:
temperature: 0.9,  // More creative
```

**On fast machines:** Use larger models, better quality

---

## Environment Variables

**For security, use `.env` file (if building with Node):**

```
# .env
VITE_HF_API_KEY=hf_xxxx...
VITE_LOCAL_SERVER=http://localhost:4891
VITE_MODEL_NAME=llama-3-8b-instruct
```

**Load in config.js:**
```javascript
export const CONFIG = {
  HF_API_KEY: import.meta.env.VITE_HF_API_KEY || '',
  LOCAL_SERVER_URL: import.meta.env.VITE_LOCAL_SERVER || '...',
  LOCAL_MODEL: import.meta.env.VITE_MODEL_NAME || '...'
};
```

---

## Debugging Advanced Issues

### Check LLM Response Format

**If cloud backend fails:**
```bash
# Test raw API call:
curl -X POST https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs":"Hello, summarize this"}'

# Check response format matches expectations
```

### Monitor Network Requests

**In Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "XHR" or "Fetch"
4. Make a request
5. Inspect request/response bodies

### Check Memory Usage

**Local LLM consuming too much RAM:**
```bash
# Monitor memory:
ps aux | grep gpt4all

# Kill and restart with lower VRAM usage:
pkill gpt4all-server
gpt4all-server --model mistral-7b --listen 127.0.0.1:4891
```

---

## Future Roadmap

### Phase 2: Gemini Nano Integration
- [ ] Wait for stable Chrome API release
- [ ] Implement Priority 2 fallback
- [ ] Test on Chrome Dev/Canary
- [ ] Release conditional enable

### Phase 3: Token Streaming
- [ ] Implement token polling for local LLM
- [ ] Show streaming UI (animated "...")
- [ ] Improve perceived performance

### Phase 4: RAG (Retrieval-Augmented Generation)
- [ ] Store conversation history locally
- [ ] Retrieve relevant context for new questions
- [ ] Better multi-turn conversations

### Phase 5: Fine-Tuned Models
- [ ] Train custom models for specific domains
- [ ] Law/medical/technical specializations
- [ ] User-specific fine-tuning

### Phase 6: Cross-Browser Support
- [ ] Firefox extension
- [ ] Edge extension
- [ ] Safari extension (limited)

---

## Migration Guide: GPT4All to Ollama

**If you want to switch from GPT4All to Ollama:**

```javascript
// In config.js - BEFORE (GPT4All):
LOCAL_SERVER_URL: 'http://localhost:4891/v1/completions'
LOCAL_MODEL: 'llama-3-8b-instruct'

// In config.js - AFTER (Ollama):
LOCAL_SERVER_URL: 'http://localhost:11434/api/generate'
LOCAL_MODEL: 'llama2'  // or mistral, neural-chat, etc.
```

**Steps:**
1. Stop GPT4All: `pkill gpt4all-server`
2. Install Ollama from https://ollama.ai/
3. Download model: `ollama pull llama2`
4. Start Ollama: `ollama serve`
5. Update config.js with Ollama settings
6. Reload ChromeMind extension
7. Test in popup (Chat tab)

---

## Troubleshooting Advanced Issues

### Issue: "Mixed Content" Error

**Cause:** Using HTTP local server from HTTPS page

**Solution:**
- Use localhost:4891 (not public IP)
- OR enable chrome://flags → Allow Insecure Localhost

### Issue: CORS Blocked (Cloud)

**Cause:** Browser blocking cross-origin request

**Check:**
- manifest.json has correct `host_permissions`
- API URL is whitelisted

**Solution:**
```json
{
  "host_permissions": [
    "https://api-inference.huggingface.co/*",
    "https://your-custom-api.com/*"
  ]
}
```

### Issue: Storage Quota Exceeded

**Cause:** Chat history too large

**Fix:**
```javascript
// Limit chat history size:
const MAX_HISTORY = 50;  // Messages
if (chatHistory.length > MAX_HISTORY) {
  chatHistory = chatHistory.slice(-MAX_HISTORY);
}
```

---

## Contributing

**Want to improve ChromeMind?**

Areas for PRs:
- Add new LLM backends
- Optimize token streaming
- Fix extraction on specific sites
- Improve UI/UX
- Better error messages

---

**Questions? Check main README or GitHub!** 🚀