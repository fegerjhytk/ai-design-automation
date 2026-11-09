import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import open from "open";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, "auth_info");

const logger = pino({ level: "silent" });

console.log("==================================================");
console.log("      WhatsApp MCP Pair & Setup Utility           ");
console.log("==================================================\n");
console.log("Initializing secure WhatsApp connection...\n");

async function startPairing() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: ["Antigravity", "macOS", "1.0.0"],
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("👉 SCAN THIS QR CODE WITH YOUR PHONE:\n");
      qrcode.generate(qr, { small: true });

      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qr)}`;
      console.log("\nIf the terminal QR code is hard to scan, view it in your browser:");
      console.log(`🔗 ${qrImageUrl}\n`);

      // Write a local HTML page that displays the QR code
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Link WhatsApp to Antigravity</title>
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
    <div class="badge">WhatsApp MCP Setup</div>
    <h1>Link Your Account</h1>
    <p>Scan this QR code from your mobile WhatsApp app to connect with Antigravity.</p>
    <img src="${qrImageUrl}" alt="WhatsApp QR Code" width="280" height="280" />
    <ol>
      <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
      <li>Tap <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
      <li>Tap <strong>Link a Device</strong></li>
      <li>Point your camera at this QR code</li>
    </ol>
  </div>
</body>
</html>`;
      const htmlPath = path.join(__dirname, "pair_qr.html");
      import("node:fs").then(({ default: fs }) => {
        fs.writeFileSync(htmlPath, htmlContent, "utf-8");
        import("node:child_process").then(({ exec }) => {
          exec(`open "${htmlPath}"`);
        });
      });

      try {
        await open(qrImageUrl);
      } catch (err) {
        // Browser opening is optional
      }

      console.log("--------------------------------------------------");
      console.log("1. Open WhatsApp on your phone");
      console.log("2. Go to Settings > Linked Devices > Link a Device");
      console.log("3. Scan the QR code above");
      console.log("--------------------------------------------------\n");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("Connection closed, reconnecting...");
        startPairing();
      } else {
        console.log("❌ Logged out or pairing rejected. Please re-run: npm run pair");
        process.exit(1);
      }
    } else if (connection === "open") {
      console.log("\n✅ SUCCESS: Connected to WhatsApp!");
      console.log(`📁 Credentials stored in: ${authDir}`);
      console.log("\nAntigravity is now connected and ready to use WhatsApp.");
      setTimeout(() => process.exit(0), 2000);
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

startPairing().catch((err) => {
  console.error("Failed to start pairing:", err);
  process.exit(1);
});
