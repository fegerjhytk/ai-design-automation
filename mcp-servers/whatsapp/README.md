# WhatsApp Personal Account MCP Server for Antigravity

This MCP server connects your personal WhatsApp account with Antigravity using WhatsApp's multi-device web protocol.

## Features

- **Read & Search Chats**: Retrieve recent message previews and conversation history.
- **Send Messages**: Direct message individuals or group chats with phone numbers or JIDs.
- **Local & Private**: All authentication credentials and message caches remain on your machine in `./auth_info/` and `./data/`.

---

## 🚀 Setup & Pairing (One-Time)

### Step 1: Install dependencies
Open your terminal in this directory:
```bash
cd /Users/admin/.gemini/antigravity/scratch/whatsapp-mcp
npm install
```

### Step 2: Link your phone (Scan QR Code)
Run the pairing tool:
```bash
npm run pair
```
1. A QR code will display in your terminal and automatically open in your default browser.
2. Open **WhatsApp on your phone**.
3. Tap **Settings ➔ Linked Devices ➔ Link a Device**.
4. Point your phone camera at the QR code.
5. Within seconds, it will authenticate and save your session in `./auth_info/`.

---

## 🛠️ MCP Configuration

This server is registered in your Antigravity global MCP configuration (`~/.gemini/config/mcp_config.json`):

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "node",
      "args": [
        "/Users/admin/.gemini/antigravity/scratch/whatsapp-mcp/server.js"
      ]
    }
  }
}
```

---

## 💬 Available Tools in Antigravity

- **`whatsapp_status`**: Check if WhatsApp is currently authenticated and connected.
- **`whatsapp_send_message`**: Send a message to any phone number (`to: "+1234567890"`, `message: "Hello!"`).
- **`whatsapp_list_recent_chats`**: Get recent active chats with timestamps and previews.
- **`whatsapp_get_chat_history`**: Read conversation history for a specific contact or phone number.
