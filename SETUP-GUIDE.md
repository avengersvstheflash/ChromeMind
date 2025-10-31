# ChromeMind Setup & Installation Guide

**Quick reference for getting ChromeMind up and running in 5 minutes.**

---

## Prerequisites

- ✅ Chrome (any version with Manifest V3 support)
- ✅ One of: GPT4All, Ollama, or HuggingFace account
- ✅ Node/npm (optional, only if building/bundling)

---

## Step 1: Install ChromeMind Extension

### A. Load Unpacked (Development)

1. **Download/Clone ChromeMind**
   ```bash
   git clone https://github.com/yourusername/chromemind.git
   cd chromemind
   ```

2. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode** (top-right toggle)

4. **Click "Load Unpacked"**
   - Select the `chromemind` folder
   - ✅ Extension appears in toolbar

5. **Pin the extension** (optional)
   - Click the puzzle icon → Pin ChromeMind

---

## Step 2: Choose Your AI Backend

### Option A: Local LLM (RECOMMENDED for Privacy)

No internet required. 100% offline.

#### Install GPT4All

**macOS:**
```bash
brew install gpt4all
```

**Windows (Chocolatey):**
```bash
choco install gpt4all
```

**Windows/Linux (Manual):**
- Download: https://www.gpt4all.io/index.html
- Install normally

#### Download a Model

**Method 1: Via GPT4All GUI**
1. Launch GPT4All app
2. Click "Download Model"
3. Select: Llama-3-8B-Instruct (recommended) or Mistral-7B
4. Wait for download (~4-7 GB)

**Method 2: Via Terminal**
```bash
# List available models
gpt4all list

# Download a model
gpt4all download llama-3-8b-instruct
gpt4all download mistral-7b-openorca
```

#### Start the Server

```bash
gpt4all-server \
  --model llama-3-8b-instruct \
  --listen 127.0.0.1:4891
```

**Output should show:**
```
Server started on: http://127.0.0.1:4891/v1/completions
✅ Ready to accept requests
```

**Test the connection:**
```bash
curl -X POST http://localhost:4891/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3-8b-instruct",
    "prompt": "Hello, how are you?",
    "max_tokens": 50
  }'
```

**Expected Response:**
```json
{
  "choices": [{
    "text": "I'm doing well, thank you for asking..."
  }]
}
```

✅ **Local setup complete!** Extension will auto-detect the server.

---

### Option B: Cloud Fallback (HuggingFace)

For when local isn't available, or as backup.

#### Get API Key

1. **Sign up** (free): https://huggingface.co/signup
2. **Go to Settings** → Access Tokens
3. **Create new token**:
   - Name: "ChromeMind"
   - Type: "Read"
4. **Copy the token** (save it!)

#### Add Key to Extension

1. **Open ChromeMind popup** (click extension icon)
2. **Go to Settings tab** (⚙️)
3. **Paste API key** in "HuggingFace API Key" field
4. **Click "💾 Save Settings"**
5. Status should show: **🟢 AI Ready (Cloud)**

#### Test Cloud Connection

1. Go to **Chat** tab
2. Type: "Hello!"
3. Click Send
4. Should respond within 5-10 seconds

✅ **Cloud setup complete!**

---

## Step 3: Verify Installation

### Quick Verification Checklist

- [ ] ChromeMind icon visible in toolbar
- [ ] Click icon → popup opens (5 tabs visible)
- [ ] Settings tab accessible
- [ ] Either:
  - [ ] **Local**: Status shows 🟢 "AI Ready (Local)"
  - [ ] **Cloud**: API key configured, status shows 🟢 "AI Ready (Cloud)"
- [ ] Test functionality:
  - [ ] Open a Wikipedia article
  - [ ] Click Summarize → Gets summary
  - [ ] Go to Chat → Ask a question → Gets response

✅ **All checks passed? You're ready to use ChromeMind!**

---

## Step 4: First Use - Tutorial

### Summarize a Webpage

1. Open: https://en.wikipedia.org/wiki/Artificial_intelligence
2. Click ChromeMind → **Summarize** tab
3. Click **🔍 Summarize This Page**
4. ⏳ Loading... (5-10 seconds)
5. 📝 Get a 2-3 sentence summary of the article

### Translate Text

1. Go to **Translate** tab
2. Paste: "Hello, how are you doing today?"
3. Select language: **Spanish**
4. Click **🌍 Translate**
5. 🌐 Get: "Hola, ¿cómo estás hoy?"

### Chat with AI

1. Go to **Chat** tab
2. Ask: "What is machine learning?"
3. Click Send
4. 💬 AI responds with an explanation
5. **Ask follow-up questions** (conversation continues!)

### Proofread Text

1. Go to **Improve** tab
2. Paste: "Their going to the store tomarrow."
3. Click **✏️ Fix Grammar**
4. ✅ Get: "They're going to the store tomorrow."

---

## Configuration

### Changing Local Model

Edit `src/config.js`:

```javascript
// Current:
LOCAL_MODEL: 'llama-3-8b-instruct'

// Change to faster model:
LOCAL_MODEL: 'mistral-7b-openorca'

// Or larger model:
LOCAL_MODEL: 'llama-2-13b'
```

Then restart GPT4All server with new model:
```bash
pkill gpt4all-server
gpt4all-server --model mistral-7b-openorca --listen 127.0.0.1:4891
```

### Changing Cloud Model

Edit `src/config.js`:

```javascript
// Current:
HF_API_URL: 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct'

// Try other models:
HF_API_URL: 'https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b'
HF_API_URL: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1'
```

Then reload extension (Ctrl+R on extensions page).

### Changing Local Server Port

If port 4891 conflicts:

```bash
# Start on different port (e.g., 5000):
gpt4all-server --model llama-3-8b-instruct --listen 127.0.0.1:5000
```

Then edit `src/config.js`:
```javascript
LOCAL_SERVER_URL: 'http://localhost:5000/v1/completions'
```

Reload extension.

---

## Troubleshooting

### Problem: "AI Unavailable (No API Key)"

**Solution 1: Use Local LLM**
```bash
# Make sure GPT4All server is running:
gpt4all-server --model llama-3-8b-instruct --listen 127.0.0.1:4891

# Restart browser
# Reload extension (Ctrl+R on chrome://extensions/)
```

**Solution 2: Add Cloud API Key**
1. Get free API key: https://huggingface.co/settings/tokens
2. Open ChromeMind → Settings
3. Paste key → Save
4. Reload popup

### Problem: "Summarization failed / Translation failed"

**Check local server:**
```bash
curl http://localhost:4891/v1/completions
```

If "Connection refused":
- Start GPT4All server (see Step 2)

If timeout (30s):
- Model is too slow
- Try Mistral-7B (faster)
- Or use cloud backend with API key

### Problem: Requests Timeout

**Increase timeout in config.js:**
```javascript
TIMEOUT: 45000  // was 30000 (45 seconds)
```

Reload extension.

### Problem: "High memory usage" / "Freezing"

**Your computer might be too slow for local LLM.**

Solution:
1. Use Mistral-7B (smaller than Llama-3)
   ```bash
   gpt4all-server --model mistral-7b-openorca --listen 127.0.0.1:4891
   ```

2. OR use cloud backend (let HuggingFace do the work)
   - Add API key in Settings

### Problem: Extension won't load

**Check console errors:**
1. Open `chrome://extensions/`
2. Click "Details" on ChromeMind
3. Look for red error messages
4. Common issues:
   - Typo in manifest.json
   - Missing files
   - Syntax error in .js

**Fix:**
- Verify JSON syntax (use jsonlint.com)
- Check all files exist in correct folders
- Reload extension (Ctrl+R)

---

## Performance Tips

### Fastest Setup
```bash
# Use fast local model + fallback to cloud
gpt4all-server --model mistral-7b-openorca --listen 127.0.0.1:4891
# Also add cloud API key as backup
```

### Best Quality
```bash
# Use high-quality model
gpt4all-server --model llama-3-8b-instruct --listen 127.0.0.1:4891
# Or set up cloud backend with premium model
```

### Most Private
```bash
# Local only, no cloud
# Don't set API key
# Data never leaves your machine
```

---

## File Structure Check

Verify your ChromeMind folder looks like this:

```
ChromeMind/
├── manifest.json              ✅
├── src/
│   ├── config.js             ✅
│   ├── huggingface.js        ✅
│   ├── assets/
│   │   ├── icon16.png        ✅
│   │   ├── icon32.png        ✅
│   │   ├── icon48.png        ✅
│   │   └── icon128.png       ✅
│   ├── background/
│   │   └── background.js     ✅
│   ├── content/
│   │   ├── content.js        ✅
│   │   └── content.css       ✅
│   └── popup/
│       ├── popup.html        ✅
│       ├── popup.js          ✅
│       └── popup.css         ✅
```

Missing any? Your setup won't work!

---

## Next Steps

1. ✅ **Done installing?** Read the main README.md
2. ✅ **Want to customize?** Edit config.js
3. ✅ **Found a bug?** Check Troubleshooting section
4. ✅ **Ready to code?** See Development section in README

---

## Support

### Check These First
1. Troubleshooting section above
2. Main README.md for detailed docs
3. Chrome DevTools console for error logs

### Enable Debug Logs
1. Right-click ChromeMind icon → **Inspect**
2. Click **Service Workers** tab
3. Check console for `[AI]` and `[HF API]` logs

### Common Commands Reference

| Task | Command |
|------|---------|
| Start GPT4All | `gpt4all-server --model llama-3-8b-instruct` |
| Stop GPT4All | `pkill gpt4all-server` |
| Test API | `curl http://localhost:4891/v1/completions` |
| List models | `gpt4all list` |
| Download model | `gpt4all download mistral-7b-openorca` |
| Reload extension | Ctrl+R on `chrome://extensions/` |
| Open DevTools | Right-click extension → Inspect |

---

**🎉 That's it! ChromeMind is now ready to supercharge your browsing experience!**

*Questions? Check the README or GitHub issues.*