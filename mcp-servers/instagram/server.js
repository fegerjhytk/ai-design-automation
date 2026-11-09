#!/usr/bin/env node
/**
 * Multi-Account Instagram Model Context Protocol (MCP) Server
 *
 * Implements the Model Context Protocol (MCP) over newline-delimited JSON-RPC 2.0 stdio.
 * Supports multiple Instagram accounts (saved sessions in auth_info/ or inline username + password)
 * for publishing Feed Photos, Carousels, Videos/Reels, Stories (Status), and Instagram Live streams.
 */

// Strictly reserve process.stdout for JSON-RPC 2.0 frames (T-01-05)
console.log = (...args) => console.error(...args);
console.info = (...args) => console.error(...args);

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { authManager, normalizeUsername } from "./src/auth.js";
import {
  publishPhoto,
  publishCarousel,
  publishVideo,
  publishStory,
  sendDirectMessage,
} from "./src/publish.js";
import {
  createLiveBroadcast,
  startLiveBroadcast,
  stopLiveBroadcast,
  streamFileToLive,
  getLiveBroadcastInfo,
  handleLiveComment,
} from "./src/live.js";
import {
  postReelViaBrowser,
  postPhotoViaBrowser,
  isChromeInstagramOpen,
} from "./src/browser_poster.js";

export function log(msg) {
  process.stderr.write(`[instagram-mcp] ${msg}\n`);
}

export const ACCOUNT_CREDENTIALS_SCHEMA_PROPS = {
  account: {
    type: "string",
    description:
      "Optional Instagram username/account alias to use (if you have 2-3+ accounts saved). Defaults to the active default account.",
  },
  username: {
    type: "string",
    description:
      "Optional Instagram username (alias for account; can be paired with password to log in and post directly in one call).",
  },
  password: {
    type: "string",
    description:
      "Optional Instagram password. If provided alongside username/account, the server automatically logs into that account (and saves the session) before executing the action.",
  },
};

export const TOOLS = [
  {
    name: "instagram_status",
    description:
      "Check Instagram authentication status, active user profile details, and all saved accounts.",
    inputSchema: {
      type: "object",
      properties: {
        account: {
          type: "string",
          description: "Optional specific account username to check",
        },
        username: {
          type: "string",
          description: "Optional specific account username to check (alias for account)",
        },
      },
    },
  },
  {
    name: "instagram_login",
    description:
      "Authenticate an Instagram account (Personal, Creator, or Business) using username & password, or complete a pending 2FA (TOTP/SMS) / Checkpoint challenge with verification_code.",
    inputSchema: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "Instagram username",
        },
        password: {
          type: "string",
          description: "Instagram password",
        },
        verification_code: {
          type: "string",
          description:
            "6-digit 2FA (TOTP/SMS) or checkpoint verification code if prompted",
        },
        verification_method: {
          type: "string",
          enum: ["0", "1"],
          description: "'0' for TOTP Authenticator app, '1' for SMS",
        },
        set_default: {
          type: "boolean",
          default: true,
          description: "Set this account as the default Instagram account",
        },
        save_credentials: {
          type: "boolean",
          default: true,
          description:
            "Save credentials locally in 0600 auth_info/accounts.json for seamless re-login",
        },
      },
    },
  },
  {
    name: "instagram_save_session",
    description:
      "Save active Instagram session cookies (sessionid, csrftoken) to enable fast (3-second) headless uploads and private API access without requiring an open browser tab.",
    inputSchema: {
      type: "object",
      properties: {
        sessionid: {
          type: "string",
          description:
            "The 'sessionid' cookie value from Instagram web (e.g. from Chrome DevTools Application > Cookies or network request headers).",
        },
        account: {
          type: "string",
          description:
            "Instagram username/account to associate these cookies with. Defaults to the active account.",
        },
        username: {
          type: "string",
          description: "Alias for account.",
        },
        csrftoken: {
          type: "string",
          description: "Optional 'csrftoken' cookie value.",
        },
        ds_user_id: {
          type: "string",
          description:
            "Optional Instagram User ID ('ds_user_id'). Automatically extracted from sessionid if omitted.",
        },
        set_default: {
          type: "boolean",
          default: true,
          description: "Set this account as the default account.",
        },
      },
      required: ["sessionid"],
    },
  },
  {
    name: "instagram_accounts",
    description:
      "Manage multiple saved Instagram accounts: list all configured accounts, switch the active default account, or remove an account.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "set_default", "remove"],
          default: "list",
          description:
            "List all saved Instagram accounts, switch the default account, or remove an account",
        },
        username: {
          type: "string",
          description:
            "Target Instagram username when action is 'set_default' or 'remove'",
        },
      },
    },
  },
  {
    name: "instagram_post_photo",
    description:
      "Publish a single-photo post to the Instagram feed with caption and optional user tags. Automatically converts PNG/WebP/JPEG and normalizes aspect ratio.",
    inputSchema: {
      type: "object",
      properties: {
        image_path: {
          type: "string",
          description:
            "Absolute or local path to the image file (JPEG, PNG, WebP)",
        },
        caption: {
          type: "string",
          description: "Post caption (supports hashtags and @mentions)",
        },
        aspect: {
          type: "string",
          enum: ["Original", "1:1", "4:5", "16:9"],
          default: "Original",
          description:
            "Aspect ratio to enforce when posting photo (defaults to Original).",
        },
        method: {
          type: "string",
          enum: ["auto", "api", "browser"],
          default: "auto",
          description:
            "Upload method: 'auto' (attempts headless API and seamlessly falls back to active Chrome tab on auth/needs_upgrade errors), 'browser' (direct active Chrome tab automation), or 'api' (headless API only).",
        },
        usertags: {
          type: "array",
          description:
            "Optional user tags [{ username: 'alice', position: [0.5, 0.5] }]",
          items: {
            type: "object",
            properties: {
              username: { type: "string" },
              position: { type: "array", items: { type: "number" } },
            },
          },
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
      required: ["image_path"],
    },
  },
  {
    name: "instagram_post_carousel",
    description:
      "Publish a multi-item carousel/album post (2 to 10 photos and/or videos) to the Instagram feed with caption.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description:
            "2 to 10 local file paths or objects { path, type, cover_path } for photos and/or videos",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  path: { type: "string" },
                  type: { type: "string", enum: ["photo", "video"] },
                  cover_path: { type: "string" },
                },
                required: ["path"],
              },
            ],
          },
        },
        caption: {
          type: "string",
          description: "Carousel post caption",
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
      required: ["items"],
    },
  },
  {
    name: "instagram_post_video",
    description:
      "Publish a video or Reel post to the Instagram feed with caption and optional custom cover image (auto-transcoded to H.264/AAC MP4 and auto-extracts cover frame if omitted).",
    inputSchema: {
      type: "object",
      properties: {
        video_path: {
          type: "string",
          description:
            "Absolute or local path to the video file (.mp4, .mov)",
        },
        caption: {
          type: "string",
          description: "Video / Reel caption",
        },
        cover_path: {
          type: "string",
          description:
            "Optional path to a custom cover image (auto-extracted from video if omitted)",
        },
        aspect: {
          type: "string",
          enum: ["9:16", "Original", "1:1", "4:5", "16:9"],
          default: "9:16",
          description:
            "Aspect ratio to enforce when posting video/Reel (defaults to 9:16 vertical).",
        },
        method: {
          type: "string",
          enum: ["auto", "api", "browser"],
          default: "auto",
          description:
            "Upload method: 'auto' (attempts headless API and seamlessly falls back to active Chrome tab on auth/needs_upgrade errors), 'browser' (direct active Chrome tab automation), or 'api' (headless API only).",
        },
        usertags: {
          type: "array",
          items: { type: "object" },
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
      required: ["video_path"],
    },
  },
  {
    name: "instagram_post_story",
    description:
      "Publish a photo or video to Instagram Story (Status), automatically formatted to 1080x1920 (9:16), with optional caption and swipe-up/link sticker URL.",
    inputSchema: {
      type: "object",
      properties: {
        media_path: {
          type: "string",
          description:
            "Absolute or local path to the photo or video file for the Story (Status)",
        },
        caption: {
          type: "string",
          description: "Optional caption text",
        },
        link: {
          type: "string",
          description: "Optional swipe-up / link sticker URL",
        },
        cover_path: {
          type: "string",
          description: "Optional custom cover image path for video stories",
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
      required: ["media_path"],
    },
  },
  {
    name: "instagram_live_create",
    description:
      "Create an Instagram Live broadcast session and return broadcast_id, rtmp_url (OBS Server), and stream_key (OBS Stream Key).",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Optional title/message for the live broadcast",
        },
        preview_width: {
          type: "integer",
          default: 720,
        },
        preview_height: {
          type: "integer",
          default: 1280,
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
    },
  },
  {
    name: "instagram_live_start",
    description:
      "Start a created Instagram Live broadcast (e.g., after connecting OBS or external RTMPS encoder) and optionally notify followers.",
    inputSchema: {
      type: "object",
      properties: {
        broadcast_id: {
          type: "string",
          description:
            "Broadcast ID returned by instagram_live_create (defaults to most recent broadcast)",
        },
        send_notifications: {
          type: "boolean",
          default: true,
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
    },
  },
  {
    name: "instagram_live_stop",
    description:
      "Stop an active Instagram Live broadcast and cleanly terminate any background FFmpeg video stream process.",
    inputSchema: {
      type: "object",
      properties: {
        broadcast_id: {
          type: "string",
          description:
            "Broadcast ID to stop (defaults to active broadcast)",
        },
        add_to_post_live: {
          type: "boolean",
          default: false,
          description:
            "Whether to share the finished live replay to post-live/archive",
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
    },
  },
  {
    name: "instagram_live_stream_file",
    description:
      "Create and start an Instagram Live broadcast and stream a local video file directly to Instagram's RTMPS ingest server in the background using FFmpeg.",
    inputSchema: {
      type: "object",
      properties: {
        video_path: {
          type: "string",
          description:
            "Absolute or local path to the video file to stream to Instagram Live",
        },
        title: {
          type: "string",
          description: "Optional broadcast title",
        },
        loop: {
          type: "boolean",
          default: false,
          description:
            "Loop the video file continuously until instagram_live_stop is called",
        },
        send_notifications: {
          type: "boolean",
          default: true,
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
      required: ["video_path"],
    },
  },
  {
    name: "instagram_live_info",
    description:
      "Get live broadcast status, heartbeat viewer count, total unique viewers, and current viewer list for an active Instagram Live stream.",
    inputSchema: {
      type: "object",
      properties: {
        broadcast_id: {
          type: "string",
          description: "Broadcast ID (defaults to active broadcast)",
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
    },
  },
  {
    name: "instagram_live_comment",
    description:
      "Manage comments on an active Instagram Live broadcast: fetch recent comments ('get'), post a comment ('post'), pin/unpin a comment ('pin'/'unpin'), or mute/unmute live comments ('mute'/'unmute').",
    inputSchema: {
      type: "object",
      properties: {
        broadcast_id: {
          type: "string",
          description: "Broadcast ID (defaults to active broadcast)",
        },
        action: {
          type: "string",
          enum: ["get", "post", "pin", "unpin", "mute", "unmute"],
          default: "get",
        },
        text: {
          type: "string",
          description: "Comment text when action='post'",
        },
        comment_id: {
          type: "string",
          description: "Target comment ID when action='pin' or 'unpin'",
        },
        comments_requested: {
          type: "integer",
          default: 10,
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
    },
  },
  {
    name: "instagram_send_dm",
    description:
      "Send a Direct Message (text and/or image) to an Instagram user by username.",
    inputSchema: {
      type: "object",
      properties: {
        recipient: {
          type: "string",
          description:
            "Target Instagram username to message (e.g., 'daremedeepans')",
        },
        text: {
          type: "string",
          description: "Text message to send",
        },
        image_path: {
          type: "string",
          description: "Optional local image path to send in the DM thread",
        },
        ...ACCOUNT_CREDENTIALS_SCHEMA_PROPS,
      },
      required: ["recipient"],
    },
  },
];

function formatToolResponse(result) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
    isError: false,
  };
}

/**
 * Execute an MCP tool call with multi-account and inline credential resolution.
 */
export async function handleToolCall(
  name,
  args = {},
  { manager = authManager } = {}
) {
  const safeTarget = normalizeUsername(args.account || args.username || "");
  log(
    `Tool call: ${name}${safeTarget ? ` (account=@${safeTarget})` : ""}`
  );

  if (name === "instagram_status") {
    const result = await manager.getStatus({
      account: args.account,
      username: args.username,
    });
    return formatToolResponse(result);
  }

  if (name === "instagram_login") {
    const result = await manager.login({
      username: args.username || args.account,
      password: args.password,
      verificationCode: args.verification_code,
      verificationMethod: args.verification_method,
      setDefault: args.set_default ?? true,
      saveCredentials: args.save_credentials ?? true,
    });
    return formatToolResponse(result);
  }

  if (name === "instagram_accounts") {
    const action = String(args.action || "list").trim().toLowerCase();
    const targetUsername = args.username || args.account;
    let result;
    if (action === "list") {
      result = manager.listAccounts();
    } else if (action === "set_default") {
      result = manager.setDefaultAccount(targetUsername);
    } else if (action === "remove") {
      result = manager.removeAccount(targetUsername);
    } else {
      throw new Error(
        `Unsupported instagram_accounts action "${action}". Use "list", "set_default", or "remove".`
      );
    }
    return formatToolResponse(result);
  }

  if (name === "instagram_save_session") {
    const result = await manager.saveSessionFromCookies({
      sessionId: args.sessionid || args.sessionId,
      username: args.username || args.account,
      csrfToken: args.csrftoken || args.csrfToken,
      dsUserId: args.ds_user_id || args.dsUserId,
      setDefault: args.set_default ?? true,
    });
    return formatToolResponse(result);
  }

  if (name === "instagram_post_photo") {
    const imagePath = args.image_path || args.imagePath;
    const caption = args.caption || "";
    const method = String(args.method || "auto").toLowerCase();
    const aspect = args.aspect || "Original";
    const targetAccount = args.account || args.username;

    if (method === "browser") {
      log("Publishing photo via direct Chrome browser automation...");
      const browserRes = await postPhotoViaBrowser({
        imagePath,
        caption,
        aspect,
        account: targetAccount,
      });
      return formatToolResponse(browserRes);
    }

    try {
      const ig = await manager.getClient({
        account: args.account,
        username: args.username,
        password: args.password,
        requireAuth: true,
      });

      const result = await publishPhoto(ig, {
        imagePath,
        caption,
        usertags: args.usertags,
        location: args.location,
      });
      return formatToolResponse(result);
    } catch (err) {
      if (method === "api") {
        throw err;
      }
      if (isChromeInstagramOpen()) {
        log(`Headless API photo publish failed (${err.message}). Seamlessly falling back to active Chrome browser session...`);
        const browserRes = await postPhotoViaBrowser({
          imagePath,
          caption,
          aspect,
          account: targetAccount,
        });
        return formatToolResponse({
          ...browserRes,
          api_fallback_reason: err.message,
        });
      }
      throw err;
    }
  }

  if (name === "instagram_post_video") {
    const videoPath = args.video_path || args.videoPath;
    const caption = args.caption || "";
    const coverPath = args.cover_path || args.coverPath;
    const method = String(args.method || "auto").toLowerCase();
    const aspect = args.aspect || "9:16";
    const targetAccount = args.account || args.username;

    if (method === "browser") {
      log("Publishing Reel via direct Chrome browser automation...");
      const browserRes = await postReelViaBrowser({
        videoPath,
        caption,
        coverPath,
        aspect,
        account: targetAccount,
      });
      return formatToolResponse(browserRes);
    }

    try {
      const ig = await manager.getClient({
        account: args.account,
        username: args.username,
        password: args.password,
        requireAuth: true,
      });

      const result = await publishVideo(ig, {
        videoPath,
        caption,
        coverPath,
        usertags: args.usertags,
        location: args.location,
      });
      return formatToolResponse(result);
    } catch (err) {
      if (method === "api") {
        throw err;
      }
      if (isChromeInstagramOpen()) {
        log(`Headless API video publish failed (${err.message}). Seamlessly falling back to active Chrome browser session...`);
        const browserRes = await postReelViaBrowser({
          videoPath,
          caption,
          coverPath,
          aspect,
          account: targetAccount,
        });
        return formatToolResponse({
          ...browserRes,
          api_fallback_reason: err.message,
        });
      }
      throw err;
    }
  }

  // All remaining publishing and Live tools resolve the authenticated client via manager.getClient
  const ig = await manager.getClient({
    account: args.account,
    username: args.username,
    password: args.password,
    requireAuth: true,
  });

  const resolvedAccount =
    ig?._accountUsername ||
    normalizeUsername(args.account || args.username || "") ||
    null;

  let result;
  switch (name) {
    case "instagram_post_carousel":
      result = await publishCarousel(ig, {
        items: args.items,
        caption: args.caption,
        location: args.location,
      });
      break;

    case "instagram_post_story":
      result = await publishStory(ig, {
        mediaPath: args.media_path || args.mediaPath,
        caption: args.caption,
        link: args.link,
        coverPath: args.cover_path || args.coverPath,
      });
      break;

    case "instagram_live_create":
      result = await createLiveBroadcast(ig, {
        title: args.title,
        previewWidth: args.preview_width ?? args.previewWidth ?? 720,
        previewHeight: args.preview_height ?? args.previewHeight ?? 1280,
      });
      break;

    case "instagram_live_start":
      result = await startLiveBroadcast(ig, {
        broadcastId: args.broadcast_id || args.broadcastId,
        sendNotifications:
          args.send_notifications ?? args.sendNotifications ?? true,
      });
      break;

    case "instagram_live_stop":
      result = await stopLiveBroadcast(ig, {
        broadcastId: args.broadcast_id || args.broadcastId,
        addToPostLive:
          args.add_to_post_live ?? args.addToPostLive ?? false,
      });
      break;

    case "instagram_live_stream_file":
      result = await streamFileToLive(ig, {
        videoPath: args.video_path || args.videoPath,
        title: args.title,
        loop: args.loop ?? false,
        sendNotifications:
          args.send_notifications ?? args.sendNotifications ?? true,
      });
      break;

    case "instagram_live_info":
      result = await getLiveBroadcastInfo(ig, {
        broadcastId: args.broadcast_id || args.broadcastId,
      });
      break;

    case "instagram_live_comment":
      result = await handleLiveComment(ig, {
        broadcastId: args.broadcast_id || args.broadcastId,
        action: args.action || "get",
        text: args.text,
        commentId: args.comment_id || args.commentId,
        commentsRequested:
          args.comments_requested ?? args.commentsRequested ?? 10,
        lastCommentTs: args.last_comment_ts ?? args.lastCommentTs ?? 0,
      });
      break;

    case "instagram_send_dm":
      result = await sendDirectMessage(ig, {
        recipient: args.recipient,
        text: args.text || "",
        imagePath: args.image_path || args.imagePath || null,
      });
      break;

    default:
      throw new Error(`Unknown tool: ${name}`);
  }

  return formatToolResponse({
    ...result,
    account: resolvedAccount,
  });
}

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

export function processMessage(msg) {
  const { id, method, params } = msg || {};

  if (method === "initialize") {
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "instagram", version: "1.0.0" },
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
      .catch((err) => {
        log(`Tool error (${params?.name}): ${err.message}`);
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { status: "error", error: err.message },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          },
        });
      });
  } else if (id !== undefined) {
    sendResponse({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }
}

export function startStdioServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: false,
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      processMessage(msg);
    } catch (e) {
      log(`Failed to parse JSON-RPC line: ${e.message}`);
    }
  });

  log("Instagram Multi-Account MCP server started on stdio.");
  return rl;
}

const __filename = fileURLToPath(import.meta.url);
function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(__filename);
  } catch {
    return path.resolve(process.argv[1]) === path.resolve(__filename);
  }
}

if (isDirectExecution()) {
  startStdioServer();
}
