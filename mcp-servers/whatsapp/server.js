#!/usr/bin/env node
/**
 * WhatsApp MCP Server for Antigravity
 *
 * Implements the Model Context Protocol (MCP) over stdio.
 * Allows Antigravity to check status, list chats, read history, and send WhatsApp messages.
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  generateWAMessage,
  generateMessageIDV2,
  proto,
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import NodeCache from "node-cache";

let sharp = null;
try {
  const sharpMod = await import("sharp");
  sharp = sharpMod.default || sharpMod;
} catch (e) {
  // sharp native addon optional
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, "auth_info");
const dataDir = path.join(__dirname, "data");
const storePath = path.join(dataDir, "messages.json");
const messageDir = path.join(dataDir, "retry-messages");

async function optimizeImageForPreview(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    if (meta.width > 2048 || meta.height > 2048 || buffer.length > 1.5 * 1024 * 1024) {
      return await sharp(buffer)
        .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    }
  } catch (e) {
    log("Sharp preview error: " + e.message);
  }
  return buffer;
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(messageDir)) {
  fs.mkdirSync(messageDir, { recursive: true, mode: 0o700 });
}

// In-memory + disk protobuf store for perfect retry resolution
const recentProtoCache = new Map();

function messagePath(id) {
  const name = crypto.createHash("sha256").update(id).digest("hex");
  return path.join(messageDir, `${name}.bin`);
}

async function saveMessage(message) {
  if (!message?.key?.id || !message.message) return;
  try {
    recentProtoCache.set(message.key.id, message.message);
    if (recentProtoCache.size > 1000) {
      const oldest = recentProtoCache.keys().next().value;
      recentProtoCache.delete(oldest);
    }
    const bytes = proto.Message.encode(message.message).finish();
    const destination = messagePath(message.key.id);
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    await fs.promises.writeFile(temporary, bytes, { mode: 0o600 });
    await fs.promises.rename(temporary, destination);
  } catch (err) {
    log(`saveMessage error for ${message.key?.id}: ${err.message}`);
  }
}

async function getMessage(key) {
  if (!key?.id) return undefined;
  if (recentProtoCache.has(key.id)) {
    return recentProtoCache.get(key.id);
  }
  try {
    const filePath = messagePath(key.id);
    if (!fs.existsSync(filePath)) return undefined;
    const buf = await fs.promises.readFile(filePath);
    const content = proto.Message.decode(buf);
    recentProtoCache.set(key.id, content);
    return content;
  } catch (err) {
    return undefined;
  }
}

async function sendStored(sockInstance, jid, content) {
  if (!sockInstance?.user?.id) throw new Error("Socket is not authenticated");

  const message = await generateWAMessage(jid, content, {
    userJid: sockInstance.user.id,
    messageId: generateMessageIDV2(sockInstance.user.id),
    upload: sockInstance.waUploadToServer,
    logger: pino({ level: "silent" }),
  });

  await saveMessage(message);

  await sockInstance.relayMessage(jid, message.message, {
    messageId: message.key.id,
  });

  return message;
}

// In-memory message store backed by messages.json
let store = { chats: {}, messages: {} };
if (fs.existsSync(storePath)) {
  try {
    store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
  } catch (e) {
    store = { chats: {}, messages: {} };
  }
}

function saveStore() {
  try {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    log("Failed to save store: " + e.message);
  }
}

function log(msg) {
  process.stderr.write(`[whatsapp-mcp] ${msg}\n`);
}
console.log = (...args) => console.error(...args);
console.info = (...args) => console.error(...args);

let sock = null;
let isConnected = false;
let latestQr = null;

// Normalize recipient to WhatsApp JID format
function formatJid(target) {
  let cleaned = String(target).trim();
  if (cleaned.includes("@")) {
    return cleaned;
  }
  // Remove non-digit characters
  cleaned = cleaned.replace(/\D/g, "");
  return `${cleaned}@s.whatsapp.net`;
}

function sanitizeCorruptedSessions(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const files = fs.readdirSync(dir).filter((f) => f.startsWith("session-"));
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      // Auto-quarantine dead ghost companion sessions (.80, .81) or bloated session records (>25KB / >20 failed ratchets)
      if (file.endsWith(".80.json") || file.endsWith(".81.json") || stat.size > 25000) {
        const quarantineDir = path.join(dir, "quarantine_corrupted");
        if (!fs.existsSync(quarantineDir)) fs.mkdirSync(quarantineDir, { recursive: true });
        const dest = path.join(quarantineDir, `${file}.${Date.now()}`);
        fs.renameSync(fullPath, dest);
        log(`Auto-quarantined desynced session file: ${file} (${stat.size} bytes)`);
      }
    }
  } catch (e) {
    log(`sanitizeCorruptedSessions error: ${e.message}`);
  }
}

async function initWhatsApp() {
  if (!fs.existsSync(authDir)) {
    log("Auth info directory not found. Please run 'npm run pair' to link your account.");
  }

  sanitizeCorruptedSessions(authDir);

  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.ws?.close();
    } catch (e) {}
    sock = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const msgRetryCounterCache = new NodeCache({ useClones: false });

  sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    msgRetryCounterCache,
    getMessage,
    browser: ["Antigravity", "macOS", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    fireInitQueries: true,
    generateHighQualityLinkPreview: false,
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 15000,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      latestQr = qr;
      log("New QR code generated. Visit http://127.0.0.1:19876/qr to scan.");
      try {
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qr)}`;
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="20">
  <title>Link WhatsApp</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 420px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #25D366; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
    img { border-radius: 0.5rem; margin: 1.5rem 0; background: white; padding: 12px; }
    ol { text-align: left; color: #cbd5e1; font-size: 0.9rem; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 10px; background: rgba(37, 211, 102, 0.15); color: #25D366; border-radius: 999px; font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">WhatsApp Status</div>
    <h1>Link Your WhatsApp</h1>
    <p>Scan this QR code from your phone to connect.</p>
    <img src="${qrImageUrl}" alt="WhatsApp QR Code" width="280" height="280" />
    <ol>
      <li>Open <strong>WhatsApp</strong> on your phone</li>
      <li>Tap <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
      <li>Tap <strong>Link a Device</strong> and point your camera here</li>
    </ol>
  </div>
</body>
</html>`;
        fs.writeFileSync(path.join(__dirname, "pair_qr.html"), htmlContent, "utf-8");
      } catch (err) {}
    }
    if (connection === "open") {
      isConnected = true;
      latestQr = null;
      log("WhatsApp connection established successfully.");
    } else if (connection === "close") {
      isConnected = false;
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        log("Connection closed, reconnecting in 5s...");
        setTimeout(initWhatsApp, 5000);
      } else {
        log("Logged out from WhatsApp. Re-pairing needed. Purging stale auth and requesting new QR...");
        try {
          const files = fs.readdirSync(authDir);
          for (const f of files) {
            fs.rmSync(path.join(authDir, f), { recursive: true, force: true });
          }
          log("Cleared stale auth files. Restarting for fresh QR code in 2s...");
          setTimeout(initWhatsApp, 2000);
        } catch (e) {
          log("Error clearing auth: " + e.message);
        }
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Track incoming/outgoing messages
  sock.ev.on("messages.upsert", ({ messages }) => {
    for (const m of messages) {
      if (!m.message || !m.key?.remoteJid) continue;
      saveMessage(m);
      const jid = m.key.remoteJid;
      const participantJid = m.key.participant || null;
      const id = m.key.id;
      const fromMe = Boolean(m.key.fromMe);
      const pushName = m.pushName || "Unknown";

      // Automatically remember group participant display names -> @lid JIDs
      if (participantJid && !fromMe && pushName && pushName !== "Unknown") {
        if (!store.contacts) store.contacts = {};
        store.contacts[pushName.trim().toLowerCase()] = participantJid;
      }

      let text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        "";

      const time = m.messageTimestamp
        ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      if (!store.chats[jid]) {
        store.chats[jid] = { jid, name: pushName, lastMessage: text, lastTime: time };
      } else {
        store.chats[jid].lastMessage = text;
        store.chats[jid].lastTime = time;
        if (pushName && pushName !== "Unknown") store.chats[jid].name = pushName;
      }

      if (!store.messages[jid]) store.messages[jid] = [];
      store.messages[jid].push({ id, fromMe, sender: pushName, senderJid: participantJid, text, time });

      // Keep last 100 messages per chat
      if (store.messages[jid].length > 100) {
        store.messages[jid].shift();
      }
    }
    saveStore();
  });
}

// Start connection in background
initWhatsApp().catch((e) => log("Init error: " + e.message));

// Local IPC HTTP bridge on 127.0.0.1:19876 so send.js reuses the active MCP socket
// instead of opening competing connections that corrupt Signal sessions
const ipcServer = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      connected: isConnected, 
      authenticated: fs.existsSync(authDir),
      has_qr: Boolean(latestQr)
    }));
    return;
  }

  if (req.method === "GET" && req.url === "/qr") {
    const htmlPath = path.join(__dirname, "pair_qr.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(htmlPath));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#fff;"><h1>${isConnected ? "✅ WhatsApp is Connected!" : "Initializing... Refresh in a few seconds."}</h1><meta http-equiv="refresh" content="3"></body></html>`);
    return;
  }

  if (req.method === "POST" && req.url === "/send") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        if (!isConnected) {
          const waitStart = Date.now();
          while (!isConnected && Date.now() - waitStart < 10000) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        if (!isConnected || !sock) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "WhatsApp MCP socket not connected" }));
          return;
        }
        const targetJid = formatJid(payload.to);
        const filePath = payload.filePath;
        const msgArg = payload.message || "";
        const sendBoth = Boolean(payload.sendBoth);
        const asDoc = Boolean(payload.asDoc);
        const mentions = Array.isArray(payload.mentions)
          ? payload.mentions.map(formatJid)
          : [];
        const t0 = Date.now();
        let sentDetails = {};

        if (filePath) {
          if (!fs.existsSync(filePath)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `File not found on disk: ${filePath}` }));
            return;
          }
          const buffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
          const mimeMap = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".pdf": "application/pdf",
          };
          const mimeType = mimeMap[ext] || "application/octet-stream";

          if (isImage) {
            const previewBuffer = await optimizeImageForPreview(buffer);

            if (sendBoth) {
              const imgPayload = { image: previewBuffer };
              if (msgArg.trim().length > 0) imgPayload.caption = msgArg.trim();
              if (mentions.length > 0) imgPayload.mentions = mentions;
              const imgRes = await sendStored(sock, targetJid, imgPayload);

              await new Promise((r) => setTimeout(r, 600));

              const docRes = await sendStored(sock, targetJid, {
                document: buffer,
                fileName: path.basename(filePath),
                mimetype: mimeType,
              });

              sentDetails = {
                status: "SENT",
                recipient: targetJid,
                messageId: imgRes.key.id,
                docMessageId: docRes.key.id,
                file: filePath,
                modes: ["image", "document"],
              };
            } else if (asDoc) {
              const docPayload = {
                document: buffer,
                fileName: path.basename(filePath),
                mimetype: mimeType,
                caption: msgArg,
              };
              if (mentions.length > 0) docPayload.mentions = mentions;
              const docRes = await sendStored(sock, targetJid, docPayload);
              sentDetails = {
                status: "SENT",
                recipient: targetJid,
                messageId: docRes.key.id,
                file: filePath,
                modes: ["document"],
              };
            } else {
              const imgPayload = { image: previewBuffer };
              if (msgArg.trim().length > 0) imgPayload.caption = msgArg.trim();
              if (mentions.length > 0) imgPayload.mentions = mentions;
              const imgRes = await sendStored(sock, targetJid, imgPayload);
              sentDetails = {
                status: "SENT",
                recipient: targetJid,
                messageId: imgRes.key.id,
                file: filePath,
                modes: ["image"],
              };
            }
          } else {
            const docPayload = {
              document: buffer,
              fileName: path.basename(filePath),
              mimetype: mimeType,
              caption: msgArg,
            };
            if (mentions.length > 0) docPayload.mentions = mentions;
            const docRes = await sendStored(sock, targetJid, docPayload);
            sentDetails = {
              status: "SENT",
              recipient: targetJid,
              messageId: docRes.key.id,
              file: filePath,
              modes: ["document"],
            };
          }
        } else {
          if (!msgArg || msgArg.trim().length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Cannot send empty message without media" }));
            return;
          }
          const txtPayload = { text: msgArg };
          if (mentions.length > 0) txtPayload.mentions = mentions;
          const txtRes = await sendStored(sock, targetJid, txtPayload);
          sentDetails = {
            status: "SENT",
            recipient: targetJid,
            messageId: txtRes.key.id,
            modes: ["text"],
          };
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ...sentDetails, latencyMs: Date.now() - t0, via: "mcp-daemon" }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});
ipcServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    setTimeout(() => {
      try {
        ipcServer.close();
        ipcServer.listen(19876, "127.0.0.1");
      } catch (e) {}
    }, 2000);
  }
});
ipcServer.listen(19876, "127.0.0.1");

// Available Tools
const TOOLS = [
  {
    name: "whatsapp_status",
    description: "Check whether WhatsApp is currently connected and authenticated.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "whatsapp_send_message",
    description: "Send a WhatsApp text message, image, or document to a phone number or contact.",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Phone number with country code (e.g. '+1234567890' or '1234567890') or WhatsApp JID.",
        },
        message: {
          type: "string",
          description: "The text message or caption to send.",
        },
        media_path: {
          type: "string",
          description: "Optional absolute path to an image or file to send (e.g. '/Users/admin/Desktop/photo.png').",
        },
      },
      required: ["to"],
    },
  },
  {
    name: "whatsapp_list_recent_chats",
    description: "List recent WhatsApp chats with last message previews and timestamps.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of chats to return (default: 20).",
          default: 20,
        },
      },
      required: [],
    },
  },
  {
    name: "whatsapp_get_chat_history",
    description: "Retrieve recent message history for a specific WhatsApp chat or contact.",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: {
          type: "string",
          description: "Phone number or WhatsApp JID of the chat.",
        },
        limit: {
          type: "integer",
          description: "Number of recent messages to fetch (default: 20).",
          default: 20,
        },
      },
      required: ["chat_id"],
    },
  },
];

async function handleToolCall(name, args) {
  if (name === "whatsapp_status") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              connected: isConnected,
              authenticated: fs.existsSync(authDir),
              has_qr: Boolean(latestQr),
              message: isConnected
                ? "WhatsApp is connected and ready."
                : fs.existsSync(authDir)
                ? "Connecting to WhatsApp..."
                : "Not paired. Please run 'npm run pair' in the whatsapp-mcp directory.",
            },
            null,
            2
          ),
        },
      ],
      isError: false,
    };
  }

  if (name === "whatsapp_send_message") {
    if (!isConnected) {
      const waitStart = Date.now();
      while (!isConnected && Date.now() - waitStart < 10000) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    if (!isConnected || !sock) {
      throw new Error(
        "WhatsApp is not connected. Make sure you paired your phone by running 'npm run pair'."
      );
    }
    const jid = formatJid(args.to);
    let result;
    if (args.media_path && fs.existsSync(args.media_path)) {
      const buffer = fs.readFileSync(args.media_path);
      const ext = path.extname(args.media_path).toLowerCase();
      const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);

      if (isImage) {
        const previewBuffer = await optimizeImageForPreview(buffer);
        const payload = { image: previewBuffer };
        if (args.message && args.message.trim().length > 0) {
          payload.caption = args.message.trim();
        }
        result = await sendStored(sock, jid, payload);
      } else {
        result = await sendStored(sock, jid, {
          document: buffer,
          fileName: path.basename(args.media_path),
          caption: args.message || "",
        });
      }
    } else {
      result = await sendStored(sock, jid, { text: args.message || "" });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "SENT",
              recipient: jid,
              messageId: result.key.id,
              media: args.media_path || null,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
      isError: false,
    };
  }

  if (name === "whatsapp_list_recent_chats") {
    const limit = args.limit || 20;
    const chatList = Object.values(store.chats)
      .sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
      .slice(0, limit);
    return {
      content: [{ type: "text", text: JSON.stringify(chatList, null, 2) }],
      isError: false,
    };
  }

  if (name === "whatsapp_get_chat_history") {
    const jid = formatJid(args.chat_id);
    const limit = args.limit || 20;
    const history = (store.messages[jid] || []).slice(-limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              chat_id: jid,
              total_messages: history.length,
              messages: history,
            },
            null,
            2
          ),
        },
      ],
      isError: false,
    };
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
}

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

function processMessage(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "whatsapp-mcp", version: "1.0.0" },
      },
    });
  } else if (method === "notifications/initialized") {
    log("Client initialized.");
  } else if (method === "ping") {
    sendResponse({ jsonrpc: "2.0", id, result: {} });
  } else if (method === "tools/list") {
    sendResponse({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  } else if (method === "tools/call") {
    handleToolCall(params?.name, params?.arguments || {})
      .then((res) => sendResponse({ jsonrpc: "2.0", id, result: res }))
      .catch((err) =>
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
          },
        })
      );
  } else {
    if (id !== undefined) {
      sendResponse({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
    }
  }
}

// Read newline-delimited JSON-RPC from stdin (unless running as standalone background daemon)
const isDaemon = process.argv.includes("--daemon") || process.env.STANDALONE_DAEMON === "1";
if (!isDaemon) {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      processMessage(msg);
    } catch (e) {
      log("Failed to parse JSON: " + e.message);
    }
  });
} else {
  log("Running in standalone background daemon mode on port 19876.");
}
