# ChromeMind API & Integration Reference

**For developers building on top of ChromeMind or integrating new LLM backends.**

---

## Message API Reference

ChromeMind uses Chrome's `runtime.sendMessage` for inter-process communication. All messages go through `background.js` (service worker).

### Sending Messages from Popup

```javascript
// Standard pattern
chrome.runtime.sendMessage(
  { action: 'ACTION_NAME', ...params },
  (response) => {
    if (response?.success) {
      console.log('Result:', response.result);
    } else {
      console.error('Error:', response?.error);
    }
  }
);
```

---

## API Actions

### 1. `summarizeContent`

**Summarize a page or text in 2-3 sentences.**

**Parameters:**
```javascript
{
  action: 'summarizeContent',
  content: string,        // Text to summarize (max 5000 chars)
  title: string          // Page title (optional)
}
```

**Response:**
```javascript
{
  success: true,
  result: "Summary text here..."
}
```

**Example:**
```javascript
chrome.runtime.sendMessage(
  {
    action: 'summarizeContent',
    content: 'The quick brown fox jumps over the lazy dog. This is a test summary.',
    title: 'Test Article'
  },
  (response) => {
    if (response.success) {
      console.log('Summary:', response.result);
    }
  }
);
```

**Backend Chain:**
```
popup.js → background.js → handleSummarizeRequest() 
→ callHuggingFace() → Local/Cloud LLM
```

---

### 2. `translateWithAI`

**Translate text to a target language.**

**Parameters:**
```javascript
{
  action: 'translateWithAI',
  text: string,           // Text to translate
  targetLang: string      // Language code (es, fr, de, ja, etc.)
}
```

**Supported Languages:**
- `es` → Spanish
- `fr` → French
- `de` → German
- `ja` → Japanese
- `zh` → Chinese
- `pt` → Portuguese
- `it` → Italian
- `ru` → Russian
- `ko` → Korean

**Response:**
```javascript
{
  success: true,
  result: "Translated text..."
}
```

**Example:**
```javascript
chrome.runtime.sendMessage(
  {
    action: 'translateWithAI',
    text: 'Hello, how are you?',
    targetLang: 'es'
  },
  (response) => {
    if (response.success) {
      console.log('Translation:', response.result);
      // Output: "Hola, ¿cómo estás?"
    }
  }
);
```

**Backend Chain:**
```
popup.js → background.js → handleTranslateRequest()
→ content.js (highlight) → callHuggingFace() → LLM
```

---

### 3. `proofreadText`

**Fix grammar, punctuation, and clarity.**

**Parameters:**
```javascript
{
  action: 'proofreadText',
  text: string            // Text to proofread
}
```

**Response:**
```javascript
{
  success: true,
  result: "Corrected text..."
}
```

**Example:**
```javascript
chrome.runtime.sendMessage(
  {
    action: 'proofreadText',
    text: 'Their going to the store tomarrow'
  },
  (response) => {
    if (response.success) {
      console.log('Proofread:', response.result);
      // Output: "They're going to the store tomorrow."
    }
  }
);
```

---

### 4. `rewriteText`

**Rewrite text for improved clarity, style, and conciseness.**

**Parameters:**
```javascript
{
  action: 'rewriteText',
  text: string            // Text to rewrite
}
```

**Response:**
```javascript
{
  success: true,
  result: "Rewritten text..."
}
```

**Example:**
```javascript
chrome.runtime.sendMessage(
  {
    action: 'rewriteText',
    text: 'The quick brown fox jumps over the lazy dog which is sleeping'
  },
  (response) => {
    if (response.success) {
      console.log('Rewritten:', response.result);
      // Output: "A quick brown fox leaps over a sleeping dog."
    }
  }
);
```

---

### 5. `chatMessage`

**Multi-turn conversation with context memory.**

**Parameters:**
```javascript
{
  action: 'chatMessage',
  messages: [            // Array of message objects
    {
      role: 'user' | 'assistant',
      content: string
    },
    ...
  ]
}
```

**Response:**
```javascript
{
  success: true,
  result: "AI response..."
}
```

**Example:**
```javascript
// First turn
chrome.runtime.sendMessage(
  {
    action: 'chatMessage',
    messages: [
      { role: 'user', content: 'What is AI?' }
    ]
  },
  (response) => {
    console.log('Response:', response.result);
    
    // Second turn (with history)
    chrome.runtime.sendMessage(
      {
        action: 'chatMessage',
        messages: [
          { role: 'user', content: 'What is AI?' },
          { role: 'assistant', content: response.result },
          { role: 'user', content: 'Tell me more about ML' }
        ]
      },
      (response2) => {
        console.log('Follow-up:', response2.result);
      }
    );
  }
);
```

**Multi-turn Workflow:**
```
First request → LLM response
Add to messages array
Second request (includes full history) → LLM response
AI maintains context across turns
```

---

## Content Script Messages

Messages from **content.js** to webpage context:

### `getPageContent`

**Request page content from any tab.**

```javascript
// From popup.js:
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(
    tabs[0].id,
    { action: 'getPageContent' },
    (response) => {
      console.log('Page content:', response.content);
      console.log('Title:', response.title);
      console.log('URL:', response.url);
    }
  );
});
```

**Response:**
```javascript
{
  success: true,
  content: "Extracted page text...",
  title: "Page Title",
  url: "https://example.com"
}
```

### `highlightSelection`

**Highlight text on the current page.**

```javascript
chrome.tabs.sendMessage(
  tabId,
  {
    action: 'highlightSelection',
    text: 'text to highlight'
  },
  (response) => {
    console.log('Highlighted:', response.success);
  }
);
```

### `showTranslationResult`

**Show translation result with highlight and tooltip.**

```javascript
chrome.tabs.sendMessage(
  tabId,
  {
    action: 'showTranslationResult',
    originalText: 'Hello',
    translatedText: 'Hola'
  },
  (response) => {
    console.log('Translation shown:', response.success);
  }
);
```

---

## LLM Backend Integration

### Adding a New LLM Backend

**File: `src/huggingface.js`**

The hybrid fallback system is in this file. To add a new backend:

```javascript
// In callHuggingFace():

export async function callHuggingFace(messages, params = {}) {
  const prompt = messagesToPrompt(messages);

  // Priority 1: Local LLM
  if (CONFIG.USE_LOCAL_FIRST) {
    try {
      const localRes = await fetch(CONFIG.LOCAL_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CONFIG.LOCAL_MODEL,
          prompt: prompt,
          max_tokens: 300,
          temperature: 0.7
        })
      });
      
      if (localRes.ok) {
        const data = await localRes.json();
        if (data.choices && data.choices[0]?.text) {
          return data.choices[0].text.trim();
        }
      }
    } catch (err) {
      console.warn('[AI] Local failed, trying next...');
    }
  }

  // Priority 2: Your New Backend Here!
  try {
    console.log('[AI] Trying NEW_BACKEND...');
    const response = await fetch('YOUR_API_URL', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer YOUR_API_KEY`
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 300
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.result) {
        console.log('[AI] NEW_BACKEND responded!');
        return data.result;
      }
    }
  } catch (err) {
    console.warn('[AI] NEW_BACKEND failed, trying next...');
  }

  // ... existing fallbacks ...
}
```

**Configuration:**
```javascript
// In src/config.js, add:
export const CONFIG = {
  // ... existing config ...
  
  // NEW BACKEND
  NEW_BACKEND_URL: 'https://api.mynewllm.com/v1/complete',
  NEW_BACKEND_API_KEY: '',  // Load from chrome.storage
  USE_NEW_BACKEND: false,   // Enable when ready
};
```

---

### Switching LLM Models

**For Local Models (GPT4All):**

```javascript
// In src/config.js:
LOCAL_MODEL: 'mistral-7b-openorca'  // Change model name

// Restart GPT4All server:
gpt4all-server --model mistral-7b-openorca --listen 127.0.0.1:4891
```

**For Cloud Models (HuggingFace):**

```javascript
// In src/config.js:
HF_API_URL: 'https://api-inference.huggingface.co/models/YOUR_NEW_MODEL'
HF_MODEL_ID: 'your-namespace/model-name'

// Examples:
// - meta-llama/Llama-2-7b
// - mistralai/Mistral-7B-Instruct-v0.1
// - Qwen/Qwen2.5-7B-Instruct
```

---

## Chrome Storage API

ChromeMind stores data locally using `chrome.storage.local`:

```javascript
// Save data
chrome.storage.local.set({ key: value });

// Retrieve data
chrome.storage.local.get(['key'], (data) => {
  console.log(data.key);
});

// Clear all data
chrome.storage.local.clear();
```

**Stored Data:**
```javascript
{
  hf_api_key: "hf_xxxx...",          // Cloud API key
  settings: {                         // User preferences
    aiName: "ChromeMind",
    aiTone: "Professional",
    contextMemory: true,
    adaptiveResponse: true
  },
  stats: {                           // Usage statistics
    summaries: 5,
    translations: 10,
    improvements: 3,
    chats: 8
  },
  chatHistory: [                     // Conversation history
    { role: 'user', content: '...' },
    { role: 'assistant', content: '...' }
  ]
}
```

---

## Error Handling

### Standard Response Format

**Success:**
```javascript
{
  success: true,
  result: "The actual result data"
}
```

**Failure:**
```javascript
{
  success: false,
  error: "Descriptive error message"
}
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `[ERROR] No Cloud API key` | HF API key missing | Add API key in Settings |
| `[ERROR] All AI backends failed` | No local + no cloud | Run local server or add API key |
| `Attempt X failed: Connection refused` | Local server not running | Start GPT4All server |
| `TIMEOUT: Request took too long` | Model too slow | Use faster model (Mistral) |
| `Unknown action` | Invalid message action | Check action name spelling |

---

## Performance Metrics

### Typical Response Times

| Backend | Model | Time |
|---------|-------|------|
| Local | Mistral-7B | 2-3s |
| Local | Llama-3-8B | 5-8s |
| Cloud | Qwen-2.5-7B | 3-5s |

### Memory Usage

| Model | RAM Required |
|-------|--------------|
| Mistral-7B | ~4-5 GB |
| Llama-3-8B | ~5-7 GB |
| Llama-2-13B | ~8-10 GB |

---

## Debugging

### Enable Console Logs

```javascript
// In src/huggingface.js or src/background.js:
console.log('[AI] Debug info:', variable);
console.warn('[AI] Warning:', condition);
console.error('[AI] Error:', error.message);
```

**View logs:**
1. Right-click ChromeMind icon → **Inspect**
2. Click **Service Workers** tab
3. Check console

### Test Messages Directly

```javascript
// In DevTools console (while inspecting extension):
chrome.runtime.sendMessage(
  { action: 'chatMessage', messages: [{ role: 'user', content: 'Hello' }] },
  (res) => console.log(res)
);
```

---

## Security Best Practices

### API Keys

- ✅ Store in `chrome.storage.local` (encrypted by browser)
- ❌ Never hardcode in source
- ❌ Never log to console
- ✅ Mask in UI (show only last 4 chars)

### CORS Handling

Local LLM:
```javascript
// No CORS issues—localhost is always allowed
fetch('http://localhost:4891/...')
```

Cloud LLM:
```javascript
// HuggingFace allows CORS from extensions
fetch('https://api-inference.huggingface.co/...')
```

### Input Sanitization

```javascript
// Always escape user input
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

// Use in DOM:
element.textContent = escapeHTML(userInput);  // Safe!
element.innerHTML = escapeHTML(userInput);    // Also safe!
```

---

## Extension API Permissions

**Why each permission is needed:**

| Permission | Why |
|-----------|-----|
| `activeTab` | Access current page for summarization |
| `storage` | Save API key, settings, chat history |
| `scripting` | Inject content script on all pages |
| `tabs` | Query current tab ID |
| `contextMenus` | Right-click translation menu |
| `host_permissions: huggingface.co` | Make API requests to cloud |

---

## Testing Checklist

- [ ] Local LLM responds to test prompt
- [ ] Cloud API key valid and functional
- [ ] All 5 actions work (summarize, translate, etc.)
- [ ] Chat maintains history across turns
- [ ] Settings save and persist
- [ ] Error messages are clear and helpful
- [ ] Page extraction works on various sites
- [ ] Highlights appear on page
- [ ] Tooltips show correctly
- [ ] Stats increment after each action

---

## Useful Resources

- **GPT4All Documentation:** https://docs.gpt4all.io/
- **HuggingFace API:** https://huggingface.co/docs/api-inference
- **Chrome Extension API:** https://developer.chrome.com/docs/extensions/
- **Ollama Alternative:** https://ollama.ai/

---

**Happy integrating! For questions, check the main README or GitHub issues.** 🚀