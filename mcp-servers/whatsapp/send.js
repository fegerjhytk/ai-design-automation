import makeWASocket, {
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
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import NodeCache from "node-cache";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, "auth_info");
const dataDir = path.join(__dirname, "data");
const messageDir = path.join(dataDir, "retry-messages");

if (!fs.existsSync(messageDir)) {
  fs.mkdirSync(messageDir, { recursive: true, mode: 0o700 });
}

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
  } catch (err) {}
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

async function optimizeImageForPreview(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    if (meta.width > 2048 || meta.height > 2048 || buffer.length > 1.5 * 1024 * 1024) {
      return await sharp(buffer)
        .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    }
  } catch (e) {}
  return buffer;
}

// Prevent libsignal from polluting stdout with "Closing session..." logs
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
console.log = (...args) => console.error(...args);
console.info = (...args) => console.error(...args);
function printJsonResult(obj) {
  originalStdoutWrite(JSON.stringify(obj) + "\n");
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node send.js <to> [message] [--file <path>] [--both] [--doc]");
  process.exit(1);
}

const toArg = args[0];
let msgArg = "";
let filePath = null;
let sendBoth = false;
let asDoc = false;
const mentions = [];

function formatJid(target) {
  let cleaned = String(target).trim();
  if (cleaned.includes("@")) return cleaned;
  cleaned = cleaned.replace(/\D/g, "");
  return `${cleaned}@s.whatsapp.net`;
}

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--file" && args[i + 1]) {
    filePath = args[i + 1];
    i++;
  } else if (args[i] === "--both") {
    sendBoth = true;
  } else if (args[i] === "--doc" || args[i] === "--as-doc") {
    asDoc = true;
  } else if (args[i] === "--mention" && args[i + 1]) {
    mentions.push(formatJid(args[i + 1]));
    i++;
  } else if (!msgArg) {
    msgArg = args[i];
  } else {
    msgArg += " " + args[i];
  }
}

// 1. Try delegating to the running MCP daemon on 127.0.0.1:19876 to avoid competing sockets
async function trySendViaDaemon() {
  try {
    const statusRes = await fetch("http://127.0.0.1:19876/status", {
      signal: AbortSignal.timeout(600),
    });
    if (!statusRes.ok) return;
  } catch (e) {
    // Daemon is not running, proceed to direct socket connection immediately
    return;
  }

  const start = Date.now();
  while (Date.now() - start < 8000) {
    try {
      const res = await fetch("http://127.0.0.1:19876/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toArg,
          message: msgArg,
          filePath,
          sendBoth,
          asDoc,
          mentions,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === "SENT") {
          printJsonResult(data);
          process.exit(0);
        }
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 400));
  }
}

function sanitizeCorruptedSessions(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const files = fs.readdirSync(dir).filter((f) => f.startsWith("session-"));
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (file.endsWith(".80.json") || file.endsWith(".81.json") || stat.size > 25000) {
        const quarantineDir = path.join(dir, "quarantine_corrupted");
        if (!fs.existsSync(quarantineDir)) fs.mkdirSync(quarantineDir, { recursive: true });
        const dest = path.join(quarantineDir, `${file}.${Date.now()}`);
        fs.renameSync(fullPath, dest);
        console.error(`[WhatsApp] Auto-quarantined desynced session file: ${file} (${stat.size} bytes)`);
      }
    }
  } catch (e) {}
}

async function run() {
  await trySendViaDaemon();

  const t0 = Date.now();
  sanitizeCorruptedSessions(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const msgRetryCounterCache = new NodeCache({ useClones: false });

  const sock = makeWASocket({
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
    keepAliveIntervalMs: 30000,
  });

  sock.ev.on("creds.update", saveCreds);

  let isFinished = false;

  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "close") {
      if (isFinished) return;
      const err = update.lastDisconnect?.error;
      console.error("Connection closed:", err?.message || "Unknown error");
      process.exit(1);
    }
    if (update.connection === "open") {
      const targetJid = formatJid(toArg);
      try {
        let sentDetails = {};
        if (filePath) {
          if (!fs.existsSync(filePath)) {
            throw new Error(`File not found on disk: ${filePath}`);
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
            ".pdf": "application/pdf"
          };
          const mimeType = mimeMap[ext] || "application/octet-stream";

          if (isImage) {
            const previewBuffer = await optimizeImageForPreview(buffer);
            if (sendBoth) {
              // 1. Send normal image preview (clean or with caption if provided)
              const imgPayload = { image: previewBuffer };
              if (msgArg && msgArg.trim().length > 0) {
                imgPayload.caption = msgArg.trim();
              }
              if (mentions.length > 0) imgPayload.mentions = mentions;
              const imgRes = await sendStored(sock, targetJid, imgPayload);

              // Small delay between sends to ensure sequential receipt
              await new Promise((r) => setTimeout(r, 600));

              // 2. Send doc format (uncompressed original document)
              const docPayload = {
                document: buffer,
                fileName: path.basename(filePath),
                mimetype: mimeType
              };
              const docRes = await sendStored(sock, targetJid, docPayload);

              sentDetails = {
                status: "SENT",
                recipient: targetJid,
                messageId: imgRes.key.id,
                docMessageId: docRes.key.id,
                file: filePath,
                modes: ["image", "document"]
              };
            } else if (asDoc) {
              const docPayload = {
                document: buffer,
                fileName: path.basename(filePath),
                mimetype: mimeType,
                caption: msgArg || ""
              };
              if (mentions.length > 0) docPayload.mentions = mentions;
              const res = await sendStored(sock, targetJid, docPayload);
              sentDetails = {
                status: "SENT",
                recipient: targetJid,
                messageId: res.key.id,
                file: filePath,
                modes: ["document"]
              };
            } else {
              const sendPayload = { image: previewBuffer };
              if (msgArg && msgArg.trim().length > 0) {
                sendPayload.caption = msgArg.trim();
              }
              if (mentions.length > 0) sendPayload.mentions = mentions;
              const res = await sendStored(sock, targetJid, sendPayload);
              sentDetails = {
                status: "SENT",
                recipient: targetJid,
                messageId: res.key.id,
                file: filePath,
                modes: ["image"]
              };
            }
          } else {
            // Non-image files (e.g. PDF) always sent as document
            const docPayload = {
              document: buffer,
              fileName: path.basename(filePath),
              mimetype: mimeType,
              caption: msgArg || ""
            };
            if (mentions.length > 0) docPayload.mentions = mentions;
            const res = await sendStored(sock, targetJid, docPayload);
            sentDetails = {
              status: "SENT",
              recipient: targetJid,
              messageId: res.key.id,
              file: filePath,
              modes: ["document"]
            };
          }
        } else {
          if (!msgArg || msgArg.trim().length === 0) {
            throw new Error("Cannot send empty message without media");
          }
          const txtPayload = { text: msgArg };
          if (mentions.length > 0) txtPayload.mentions = mentions;
          const res = await sendStored(sock, targetJid, txtPayload);
          sentDetails = {
            status: "SENT",
            recipient: targetJid,
            messageId: res.key.id,
            modes: ["text"]
          };
        }

        const latency = Date.now() - t0;
        printJsonResult({
          ...sentDetails,
          latencyMs: latency
        });
        // Keep socket alive for 3.5s so companion devices (WhatsApp Web / Phone)
        // can complete retry handshakes and saveCreds flushes updated Signal ratchets
        setTimeout(() => {
          isFinished = true;
          sock.end();
          process.exit(0);
        }, 3500);
      } catch (err) {
        console.error("Send failed:", err.message);
        sock.end();
        process.exit(1);
      }
    }
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
