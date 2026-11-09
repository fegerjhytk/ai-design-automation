---
name: whatsapp
description: Send and read WhatsApp messages, inspect recent chats, check connection status, and interact with WhatsApp contacts using the local WhatsApp MCP server.
---

# WhatsApp Integration Skill

This skill guides interactions with personal WhatsApp via the local WhatsApp MCP server.

## Available Tools

- `whatsapp_status`: Check whether the WhatsApp socket is active, authenticated, and ready to send/receive messages.
- `whatsapp_send_message`: Send a text message, image, or document to a contact or phone number.
  - `to`: Target phone number with country code (e.g. `917982850887`) or WhatsApp JID (`<phone>@s.whatsapp.net`).
  - `message`: Text content or caption for the media.
  - `media_path`: Optional local file path to an image (.png, .jpg) or document (.pdf, .ai, etc.) to attach.
- `whatsapp_list_recent_chats`: List recent active chats with message previews and timestamps.
  - `limit`: Number of chats to return (default: 20).
- `whatsapp_get_chat_history`: Retrieve recent message history from a specific chat.
  - `chat_id`: Phone number or WhatsApp JID.
  - `limit`: Number of messages (default: 20).

## Architecture & Preventing Decryption Failures ("Waiting for this message")

In Baileys multi-device setups, messages can display `🕒 Waiting for this message. This may take a while` or appear blank if Signal pairwise encryption ratchets desynchronize. To ensure permanent reliability, this plugin strictly enforces the following rules:

### 1. Single Active Socket via HTTP IPC Daemon (`127.0.0.1:19876`)
- **Never run multiple competing Node processes** accessing `auth_info/`. Competing processes overwrite keys and close each other's WebSockets, triggering `Bad MAC` and `MessageCounterError`.
- Check daemon status via `curl http://127.0.0.1:19876/status`. All sending scripts (`send.js`, skills, MCP tools) must route through the daemon when active.

### 2. Intact Protobuf Storage for Retry Receipts
- Retries and companion-sync packets require raw binary protobuf data.
- Sent messages are saved directly as compiled protobuf binaries (`proto.Message.encode(msg.message).finish()`) to disk (`data/retry-messages/<hash>.bin`) and kept in an in-memory cache.
- `getMessage(key)` always resolves the native decoded `proto.IMessage` or `undefined` (never JSON strings or placeholder objects which corrupt `mediaKey`, `fileEncSha256`, and IV buffers).

### 3. Pairwise LID Ratchet Health & Auto-Sanitation
- Companion devices (`:82`) track pairwise sessions with the primary phone via its LID (`session-<lid>.0.json`).
- If a session file accumulates desynchronized ratchets (>25 KB or >15 failed attempts), `sanitizeCorruptedSessions` automatically quarantines the bloated record into `quarantine_corrupted/` on startup.
- If re-keying is ever needed, execute:
  ```javascript
  const primaryLid = sock.user?.lid ? sock.user.lid.split(':')[0] + '@lid' : null;
  await sock.assertSessions([primaryLid], true);
  ```
  This forces WhatsApp servers to issue fresh signed PreKeys without requiring the user to re-pair or log out.

### 4. Strict Identity & Addressing Separation
- Never replace `@lid` with `@s.whatsapp.net` or manually rename session files.
- Persist `lid-mapping`, `device-list`, and app state keys with `makeCacheableSignalKeyStore`.

## Safety & Best Practices
- Always verify the destination phone number / contact name before sending messages.
- Format phone numbers with the international country code, stripping dashes, spaces, and leading zeros.
- **Strict Testing Rule**: Automated tests must be directed ONLY to Deepanshu (`917982850887`), NEVER to group chats like Design Drop.
