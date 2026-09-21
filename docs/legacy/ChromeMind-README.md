> **Historical Notice:** This document is preserved for historical reference from the initial hackathon/Devpost prototype and does not reflect current Manifest V3 architecture or privacy models. See [README.md](../../README.md) for current documentation.

# ChromeMind - Your AI Browser Companion

**Version:** 1.0.0  
**Status:** Production-ready hybrid LLM extension  
**Architecture:** 3-tier fallback (Local → Gemini Nano → Cloud)

---

## Quick Start (TL;DR)

ChromeMind is a **privacy-first Chrome extension** that brings AI-powered text analysis to any webpage—with zero reliance on cloud by default.

**Key Features:**
- 🧠 **Summarize** web pages instantly
- 🌍 **Translate** text to 9+ languages
- ✏️ **Proofread & Rewrite** for clarity
- 💬 **Chat** about page content
- 🔐 **Offline-first** with local LLM support
- ☁️ **Cloud fallback** (HuggingFace) for seamless UX

---

## Installation & Setup

### 1. Install the Extension

1. Clone or download ChromeMind
2. Open Chrome → **Settings → Extensions**
3. Enable **Developer Mode** (top-right corner)
4. Click **Load Unpacked** → Select the ChromeMind folder
5. ✅ Extension loaded! Check your toolbar.

### 2. Set Up Your AI Backend

Choose **one or more** of these:

#### **Option A: Local LLM (Recommended for Privacy)**

Use **GPT4All** or **Ollama** for 100% offline AI.

**Install GPT4All:**
```bash
# Download from: https://www.gpt4all.io/
# Or install via package manager:
brew install gpt4all          # macOS
choco install gpt4all         # Windows
apt install gpt4all          # Linux
```

**Start GPT4All Server:**
```bash
# Default: http://localhost:4891/v1/completions
gpt4all-server --model llama-3-8b-instruct --listen 127.0.0.1:4891
```

**Verify Connection:**
```bash
curl -X POST http://localhost:4891/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello", "max_tokens":10}'
```

#### **Option B: Cloud Fallback (HuggingFace)**

For times when local isn't available:

1. Sign up: https://huggingface.co/
2. Generate API key: Account → Settings → Access Tokens
3. Copy your token
4. Open ChromeMind popup → **Settings** tab
5. Paste your API key → **Save**

**Status Check:**
- 🟢 **AI Ready (Cloud)** = Cloud backend is active
- 🔴 **AI Unavailable** = No local server + no API key

---

## Configuration Guide

### `src/config.js` - Core Settings

```javascript
export const CONFIG = {
  // ===== LOCAL: GPT4All (Priority 1) =====
  LOCAL_SERVER_URL: 'http://localhost:4891/v1/completions',
  LOCAL_MODEL: 'llama-3-8b-instruct',  // or mistral-7b, llama-2, etc.
  USE_LOCAL_FIRST: true,

  // ===== CLOUD: HuggingFace Fallback (Priority 3) =====
  HF_API_KEY: '',  // Loaded from chrome.storage
  HF_API_URL: 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct',
  HF_MODEL_ID: 'Qwen/Qwen2.5-7B-Instruct',

  // ===== EXPERIMENTAL: Gemini Nano (Priority 2, future) =====
  USE_GEMINI_NANO: false,

  TIMEOUT: 30000,
  MAX_RETRIES: 2
};
```

**Modify for your setup:**
- **Local model not responding?** Check `LOCAL_SERVER_URL` and restart server
- **Want a faster model?** Change `LOCAL_MODEL` to `mistral-7b` (smaller, faster)
- **Prefer different cloud model?** Update `HF_API_URL` to any HuggingFace model

### Supported Local Models

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| **Mistral-7B** | 4GB | ⚡ Fast | ⭐⭐⭐ | Quick summaries, chat |
| **Llama-3-8B** | 5GB | ⚡⚡ Medium | ⭐⭐⭐⭐ | Translation, proofread |
| **Llama-2-13B** | 7GB | ⚡⚡⚡ Slow | ⭐⭐⭐⭐⭐ | Complex analysis |

**Download models via GPT4All UI or CLI:**
```bash
gpt4all download mistral-7b-openorca
gpt4all download llama-3-8b-instruct
```

---

## Architecture Overview

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐   │
│  │   POPUP UI   │───→│ BACKGROUND SW   │───→│  AI HANDLER  │   │
│  │ (5 Tabs)     │    │ (Service Worker)│    │ (Hybrid LLM) │   │
│  └──────────────┘    └────────┬────────┘    └──────┬───────┘   │
│                               │                      │          │
│  ┌──────────────┐             │                      │          │
│  │ CONTENT.JS   │─────────────┘                      │          │
│  │ (Page inject)│                                    │          │
│  └──────────────┘                                    │          │
│                                                      ▼          │
│                           ┌─────────────────────────────────┐   │
│                           │   FALLBACK CHAIN (Priority)     │   │
│                           │                                 │   │
│                           │ 1️⃣  Local LLM (GPT4All)         │   │
│                           │     ↓ (if fails)                │   │
│                           │ 2️⃣  Gemini Nano (Experimental) │   │
│                           │     ↓ (if fails)                │   │
│                           │ 3️⃣  Cloud (HuggingFace)         │   │
│                           │                                 │   │
│                           └─────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure & Responsibilities

```
ChromeMind/
├── manifest.json               # Extension metadata, permissions
├── src/
│   ├── config.js              # 🔧 Configuration hub
│   ├── huggingface.js         # 🧠 Hybrid LLM logic
│   ├── assets/                # 📦 Icons (16, 32, 48, 128px)
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── background/
│   │   └── background.js      # ⚙️ Service worker (LLM relay)
│   ├── content/
│   │   ├── content.js         # 📄 Page content extraction
│   │   └── content.css        # 🎨 Highlights + tooltips
│   └── popup/
│       ├── popup.html         # 🖼️ UI (5 tabs)
│       ├── popup.js           # 🎯 UI logic + stats
│       └── popup.css          # 💅 Styling
```

---

## Core Files Explained

### 1. **manifest.json** - Extension Metadata

Defines permissions, scripts, and Chrome API access.

**Key Permissions:**
- `activeTab` → Access current page
- `storage` → Save API key, stats
- `scripting` → Inject content script
- `tabs` → Query open tabs
- `contextMenus` → Right-click translation

**Host Permissions:**
- `https://api-inference.huggingface.co/*` → Cloud fallback

### 2. **config.js** - Configuration Hub

**Centralized settings for the entire extension.**

```javascript
USE_LOCAL_FIRST: true          // Try local first, fallback to cloud
LOCAL_SERVER_URL: '...'        // GPT4All endpoint
LOCAL_MODEL: 'llama-3-8b-...'  // Model name
HF_API_KEY: ''                 // Cloud API (from chrome.storage)
MAX_RETRIES: 2                 // Cloud retry attempts
TIMEOUT: 30000                 // 30s timeout per request
```

**🔄 Dynamic Loading:**
Chrome storage is checked on startup—API keys don't need hardcoding.

### 3. **huggingface.js** - AI Brain (Hybrid Fallback)

**The magic happens here!** Three-tier LLM strategy:

```javascript
// PRIORITY 1: Try local (fastest, private)
↓ fetch(LOCAL_SERVER_URL) ↓

// PRIORITY 2: Try Gemini Nano (if available)
↓ window.ai.languageModel.create() ↓

// PRIORITY 3: Fall back to cloud (reliable)
↓ HuggingFace API ↓

// Result or error
```

**Example Call:**
```javascript
const response = await callHuggingFace(
  [{ role: 'user', content: 'Summarize this article...' }],
  { max_tokens: 150 }
);
```

### 4. **background.js** - Service Worker (LLM Relay)

**Runs constantly; processes all AI requests.**

Handles these actions:
- `translateWithAI` → Multi-language translation
- `summarizeContent` → Page summarization
- `proofreadText` → Grammar & clarity fixes
- `rewriteText` → Style & tone improvement
- `chatMessage` → Multi-turn chat with history

**Message Flow:**
```
Popup → background.js → huggingface.js → LLM → Response
```

**Context Menu Integration:**
Right-click any text → "Translate with ChromeMind" → Auto-translate to Spanish

### 5. **content.js** - Page Integration

Injects UI elements into webpages:
- Highlights key phrases (yellow box)
- Shows floating tooltips
- Extracts page text (article, main, body fallback)
- Handles text selection for translation

**Key Functions:**
```javascript
extractPageContent()      // Smart content extraction
highlightText()           // Wrap text in yellow highlight
showBubbleTooltip()       // Floating feedback tooltip
```

### 6. **popup.html / popup.js** - UI Hub

**5-Tab Interface:**

| Tab | Function | Input | Output |
|-----|----------|-------|--------|
| **Summarize** | Extract key points | Page (auto-loaded) | 2-3 sentence summary |
| **Translate** | Multi-language | Text + language | Translated text |
| **Improve** | Proofread/Rewrite | Text | Corrected/rewritten |
| **Chat** | Conversational | Free text | AI response (multi-turn) |
| **Settings** | Config & API | API key, preferences | Saved to chrome.storage |

**Stats Tracking:**
```
Summaries created: X
Translations made: Y
Texts improved: Z
Chat messages: W
```

### 7. **CSS Files** - Styling

**popup.css:**
- 500×700px popup window
- Purple gradient theme (#667eea → #764ba2)
- Dark mode support
- Smooth animations

**content.css:**
- Highlight styling (.chromemind-highlight)
- Tooltip animations
- Floating bubble (.chromemind-bubble)
- Modal overlays
- Accessibility: reduced-motion, high-contrast

---

## Usage Guide

### Summarizing a Webpage

1. Open any article/blog
2. Click ChromeMind icon → **Summarize** tab
3. Click **🔍 Summarize This Page**
4. 📝 AI extracts main points in 2-3 sentences

**Behind the scenes:**
```
content.js extracts page → background.js → huggingface.js → LLM processes → Summary returned
```

### Translating Text

1. Open the **Translate** tab
2. Paste or type text
3. Select target language (Spanish, French, German, etc.)
4. Click **🌍 Translate**
5. 🌐 Translated text appears

**Or use context menu:**
- Right-click any text on page
- Select "Translate with ChromeMind"
- Auto-highlights + translates to Spanish

### Proofreading & Rewriting

1. Go to **Improve** tab
2. Paste text to check
3. Click **✏️ Fix Grammar** (proofread)
   - OR **✨ Rewrite** (improve style)
4. ✅ Corrected version appears

### Chat with AI

1. Open **Chat** tab
2. Type a question about the current page
3. Press **Send** (or Enter key)
4. 💬 AI responds with context awareness
5. **Multi-turn**: Previous messages are remembered!

**Clear history:** Click **🗑️ Clear Chat**

### Configuring Backend

1. Click **Settings** tab
2. **Optional:** Set API key for cloud fallback
   - Get from: https://huggingface.co/settings/tokens
   - Paste in "HuggingFace API Key" field
3. Customize:
   - AI Name (e.g., "Claude", "ChatGPT")
   - AI Tone (e.g., "Professional", "Casual")
4. Click **💾 Save Settings**
5. Status should show 🟢 **AI Ready (Cloud)**

---

## Troubleshooting

### Issue: "AI Unavailable (No API Key)"

**Solution:**
1. Get API key from HuggingFace (free): https://huggingface.co/settings/tokens
2. Paste into Settings tab
3. Click Save
4. Refresh popup

**Alternative:** Run local LLM (no API needed)

### Issue: Local Model Hangs / Times Out

**Check:**
1. Is GPT4All server running?
   ```bash
   curl http://localhost:4891/v1/completions
   ```
   Should return error (not "Connection refused")

2. Port conflict? Try different port:
   ```bash
   gpt4all-server --port 5000
   ```
   Then update config.js:
   ```javascript
   LOCAL_SERVER_URL: 'http://localhost:5000/v1/completions'
   ```

3. Model too slow? Switch to faster model:
   ```javascript
   LOCAL_MODEL: 'mistral-7b-openorca'  // Faster than Llama-3
   ```

### Issue: "summarizeContent failed / Translation failed"

**Debug steps:**
1. Open Chrome DevTools (Ctrl+Shift+I)
2. Go to **Service Workers** tab
3. Check for errors in console
4. Likely causes:
   - **No API key + local server down** → Set API key
   - **CORS error** → Try different local model
   - **Rate limit (cloud)** → Wait 1 minute, retry

### Issue: Extension Won't Load

**Solution:**
1. Check manifest.json syntax (valid JSON?)
2. Ensure all files in correct folders
3. Hard-refresh: Ctrl+Shift+R
4. Disable → Re-enable extension

### Issue: Text Not Extracting / "No content found"

**Fix:**
- content.js looks for: `article`, `main`, `[role="main"]`, `.content`, etc.
- Some sites use custom selectors
- Fallback to `<body>` text
- Try copying text manually into "Chat" tab as workaround

---

## Switching & Optimizing LLM Models

### Changing Local Model

1. Stop current server:
   ```bash
   pkill gpt4all-server
   ```

2. Edit config.js:
   ```javascript
   LOCAL_MODEL: 'mistral-7b-openorca'  // or llama-2-13b, etc.
   ```

3. Restart server:
   ```bash
   gpt4all-server --model mistral-7b-openorca --listen 127.0.0.1:4891
   ```

4. Test in popup (click Summarize)

### Changing Cloud Model

1. Go to Settings tab
2. Choose different HuggingFace model URL:
   ```
   https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b
   https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1
   https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct
   ```
3. Update config.js:
   ```javascript
   HF_API_URL: 'https://api-inference.huggingface.co/models/...'
   ```
4. Save → Test

### Performance Tuning

**For faster responses:**
- **Local:** Use Mistral-7B (smaller = faster)
- **Cloud:** Increase MAX_RETRIES to 3
- **Timeout:** Increase TIMEOUT to 45000ms for slow networks

**For better quality:**
- Use Llama-3-8B or larger
- Increase max_tokens in huggingface.js (currently 300)
- Reduce noise with better prompts

---

## Known Limitations & Future Improvements

### Current Limitations

1. **Gemini Nano Not Integrated**
   - Chrome/Chromium API unstable at development time
   - Code supports it (Priority 2) but disabled (`USE_GEMINI_NANO: false`)
   - Will enable when APIs stable in production Chrome

2. **Local LLM Speed in Extension**
   - Local models fast in GPT4All desktop app
   - Extension async pipeline needs optimization for token streaming
   - Current: Wait for full response; future: stream tokens realtime

3. **Context Window**
   - Page summary limited to 5,000 chars
   - Large documents may lose detail
   - Workaround: Copy-paste key sections

4. **Multi-Language Limitations**
   - Supports 9 languages for translation
   - Easy to add more in background.js `getLanguageName()`

### Future Roadmap

- ✅ **Phase 1 (Done):** Hybrid fallback chain
- 🔜 **Phase 2:** Gemini Nano when Chrome APIs stable
- 🔜 **Phase 3:** Token streaming for realtime responses
- 🔜 **Phase 4:** Custom model fine-tuning
- 🔜 **Phase 5:** RAG (Retrieval-Augmented Generation) for better context

---

## Development & Debugging

### Enable Debug Logs

Open Chrome DevTools:
1. Right-click ChromeMind icon → **Inspect**
2. Click **Service Workers** tab
3. See background.js logs:
   ```
   [AI] 🟢 Trying LOCAL (GPT4All) model...
   [AI] ✅ LOCAL (GPT4All) responded!
   [HF API] ✅ Cloud response received
   ```

### Testing Locally

```bash
# Test local API directly
curl -X POST http://localhost:4891/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3-8b-instruct",
    "prompt": "Summarize this: The sky is blue.",
    "max_tokens": 50,
    "temperature": 0.7
  }'

# Expected response:
{
  "choices": [
    {
      "text": "The statement indicates that the color of the sky is blue..."
    }
  ]
}
```

### Building for Distribution

Currently a development extension. To release:

1. Remove debug logs (optional)
2. Minify JS/CSS (optional)
3. Sign with Chrome Web Store Developer Account
4. Upload to Chrome Web Store
5. Pay one-time $5 developer fee

---

## Security & Privacy Notes

### Data Handling

- ✅ **API Key:** Stored securely in `chrome.storage.local` (encrypted by browser)
- ✅ **Chat History:** Stored locally (not sent to cloud unless using cloud backend)
- ✅ **Page Content:** Only sent to LLM for processing (not logged)
- ✅ **Local LLM:** 100% private—data never leaves your machine

### Permissions Rationale

- `activeTab` → Extract current page content
- `storage` → Save API key + chat history
- `contextMenus` → Right-click translation
- `tabs` → Identify current tab for context

No unnecessary permissions. No tracking. No ads.

---

## Support & Contributing

### Report Issues

1. Check troubleshooting section above
2. Enable debug logs (see above)
3. Open GitHub issue with:
   - Steps to reproduce
   - Console logs
   - Model/OS info

### Contribute

Contributions welcome! Areas for improvement:
- Token streaming for local LLM
- Gemini Nano integration
- More language support
- Better prompts
- Performance optimization

---

## License & Credits

**ChromeMind v1.0.0**

Built with:
- Chrome Extensions API
- GPT4All / Ollama (local LLM)
- HuggingFace Inference API (cloud)
- Qwen LLM models
- Llama / Mistral models

---

## Quick Command Reference

| Task | Command |
|------|---------|
| Start local LLM | `gpt4all-server --model llama-3-8b-instruct` |
| Stop local LLM | `pkill gpt4all-server` |
| Test local API | `curl -X POST http://localhost:4891/v1/completions` |
| Load extension | Chrome: Settings → Extensions → Load Unpacked |
| Debug logs | Right-click extension → Inspect → Service Workers |
| Get HF API key | https://huggingface.co/settings/tokens |
| Modify config | Edit `src/config.js` |
| View storage | DevTools → Application → Storage → Local Storage |

---

**Happy coding, Ayush! Your extension is 🔥 and ready to roll.** ✨

*ChromeMind: Think browser, think AI.*