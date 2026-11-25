# AI Design Workflow — Chrome Extension & Local Bridge

Connects a Chrome Manifest V3 Side Panel extension to your local **AI Design Workflow** (`ai-design-workflow/lib/*`) and **Antigravity** (`/Users/admin/.gemini/antigravity/bin/agentapi`) through a token-secured `127.0.0.1` Node bridge.

---

## 1. Start the Local Bridge

```bash
bash /Users/admin/Documents/AI-Design-Automation/chrome-bridge/start_bridge.sh
```

This prints your **Bridge URL** (`http://127.0.0.1:4815`) and **Bridge Token** (stored at `~/.gemini/config/ai-design-bridge.token` with `0600` permissions) and starts the local server.

To print only your token at any time:
```bash
/Users/admin/.gemini/antigravity/bin/node /Users/admin/Documents/AI-Design-Automation/chrome-bridge/bridge_server.js --print-token
```

*(Optional auto-start on macOS login: customize [com.antigravity.designbridge.plist.example](com.antigravity.designbridge.plist.example) and load it into `~/Library/LaunchAgents/`.)*

---

## 2. Load the Chrome Extension

1. Open Google Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select:
   `/Users/admin/Documents/AI-Design-Automation/chrome-bridge/extension`
4. Click the **AI Design Workflow Bridge** toolbar icon to open the Side Panel.
5. Open the **Settings** tab inside the Side Panel, paste your Bridge Token, and click **Save & Test**.

---

## 3. Security Model

- Binds strictly to `127.0.0.1` (not exposed on your LAN).
- Rejects any browser `Origin` other than `chrome-extension://*` with `403 Forbidden`.
- Requires `X-Bridge-Token` (verified with `crypto.timingSafeEqual`) on `/status`, `/tool`, and `/antigravity`.
- Executes `agentapi` and `pipeline_runner.js` using argument arrays (`execFile`), never shell string interpolation.
