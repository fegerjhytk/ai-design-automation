import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import sharp from "sharp";
import {
  validateMediaFile,
  isVideoFile,
  prepareFeedImage,
  prepareStoryImage,
  prepareVideoAndCover,
} from "./media.js";
import { extractWebSessionCookies, WEB_USER_AGENT } from "./auth.js";

const require = createRequire(import.meta.url);
const { PublishService } = require(
  "instagram-private-api/dist/services/publish.service.js"
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USER_CACHE_PATH = path.join(path.dirname(__dirname), "auth_info", "user_cache.json");

const memoryUserCache = new Map([
  [
    "daremedeepans",
    {
      pk: "6874901719",
      threadId: "340282366841710301244260555073576518223",
    },
  ],
]);

function loadUserCache() {
  try {
    if (fs.existsSync(USER_CACHE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(USER_CACHE_PATH, "utf-8"));
      for (const [k, v] of Object.entries(parsed)) {
        if (k && v) memoryUserCache.set(k.toLowerCase(), v);
      }
    }
  } catch {
    // Ignore cache read errors
  }
}
loadUserCache();

function updateUserCache(username, updates) {
  const key = String(username || "").trim().replace(/^@+/, "").toLowerCase();
  if (!key) return;
  const prev = memoryUserCache.get(key) || {};
  const next = { ...prev, ...updates, updatedAt: Date.now() };
  memoryUserCache.set(key, next);
  try {
    const dir = path.dirname(USER_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const obj = Object.fromEntries(memoryUserCache.entries());
    fs.writeFileSync(USER_CACHE_PATH, JSON.stringify(obj, null, 2), { mode: 0o600 });
  } catch {
    // Non-fatal
  }
}

export async function resolveCachedUserId(ig, username) {
  const key = String(username || "").trim().replace(/^@+/, "").toLowerCase();
  if (!key) return null;
  const cached = memoryUserCache.get(key);
  if (cached?.pk) {
    return String(cached.pk);
  }
  let userId;
  try {
    userId = await ig.user.getIdByUsername(key);
  } catch {
    const searchUser = await ig.user.searchExact(key);
    userId = searchUser?.pk;
  }
  if (userId) {
    updateUserCache(key, { pk: String(userId) });
  }
  return userId ? String(userId) : null;
}

/**
 * Clamp a coordinate into [0.01, 0.99] for Instagram usertag positioning.
 */
function clampCoord(val, fallback = 0.5) {
  const num = Number(val);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(Math.max(num, 0.01), 0.99);
}

/**
 * Resolve an array of usertags (strings like "@alice" or objects { username, user_id, x, y, position })
 * into Instagram Private API usertag entries: [{ user_id: Number, position: [x, y] }].
 */
export async function resolveUsertags(ig, usertags = []) {
  if (!Array.isArray(usertags) || usertags.length === 0) {
    return [];
  }

  const resolved = [];
  for (const item of usertags) {
    if (!item) continue;

    const isObj = typeof item === "object" && !Array.isArray(item);
    const rawUsername = isObj ? item.username : item;
    const cleanedUsername = rawUsername
      ? String(rawUsername).trim().replace(/^@/, "")
      : "";

    let userId = isObj ? item.user_id : undefined;
    if (!userId) {
      if (!cleanedUsername) {
        continue;
      }
      userId = await ig.user.getIdByUsername(cleanedUsername);
      if (userId) {
        updateUserCache(cleanedUsername, { pk: String(userId) });
      }
    }

    const rawPos =
      isObj && Array.isArray(item.position) && item.position.length >= 2
        ? item.position
        : [isObj ? item.x ?? 0.5 : 0.5, isObj ? item.y ?? 0.5 : 0.5];

    const x = clampCoord(rawPos[0], 0.5);
    const y = clampCoord(rawPos[1], 0.5);

    resolved.push({
      user_id: Number(userId),
      position: [x, y],
    });
  }

  return resolved;
}

/**
 * Normalize an Instagram API media response into a structured tool result.
 */
export function formatMediaResult(media, type, extra = {}) {
  const id = String(media?.id || media?.pk || "");
  const pk = String(media?.pk || media?.id || "");
  const code = media?.code || null;
  const url = code ? `https://www.instagram.com/p/${code}/` : null;

  return {
    status: "published",
    type,
    media_id: id,
    pk,
    code,
    url,
    taken_at: media?.taken_at || null,
    ...extra,
  };
}

function buildWebHeaders(cookies, extra = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return {
    "User-Agent": WEB_USER_AGENT,
    "X-IG-App-ID": "936619743392459",
    "X-CSRFToken": cookies.csrftoken || "missing",
    "X-Requested-With": "XMLHttpRequest",
    "X-ASBD-ID": "129477",
    Origin: "https://www.instagram.com",
    Referer: "https://www.instagram.com/",
    Cookie: cookieHeader,
    ...extra,
  };
}

async function webUploadPhotoBuffer(cookies, uploadId, fileBuffer, mediaType = 1) {
  const meta = await sharp(fileBuffer).metadata();
  const width = meta.width || 1080;
  const height = meta.height || 1080;
  const entityName = `fb_uploader_${uploadId}`;
  const ruploadParams = {
    media_type: mediaType,
    upload_id: String(uploadId),
    upload_media_height: height,
    upload_media_width: width,
  };

  const res = await fetch(
    `https://i.instagram.com/rupload_igphoto/${entityName}`,
    {
      method: "POST",
      headers: buildWebHeaders(cookies, {
        "Content-Type": "image/jpeg",
        Offset: "0",
        "X-Entity-Name": entityName,
        "X-Entity-Length": String(fileBuffer.length),
        "X-Entity-Type": "image/jpeg",
        "X-Instagram-Rupload-Params": JSON.stringify(ruploadParams),
      }),
      body: fileBuffer,
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Web photo upload failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function webUploadVideoBuffer(cookies, uploadId, videoBuffer) {
  const { duration, width, height } = PublishService.getVideoInfo(videoBuffer);
  const entityName = `fb_uploader_${uploadId}`;
  const ruploadParams = {
    "client-passthrough": "1",
    is_clips_video: "1",
    is_sidecar: "0",
    media_type: 2,
    for_album: false,
    upload_id: String(uploadId),
    upload_media_duration_ms: duration,
    upload_media_height: height,
    upload_media_width: width,
    video_transform: null,
  };

  const res = await fetch(
    `https://i.instagram.com/rupload_igvideo/${entityName}`,
    {
      method: "POST",
      headers: buildWebHeaders(cookies, {
        "Content-Type": "application/octet-stream",
        Offset: "0",
        "X-Entity-Name": entityName,
        "X-Entity-Length": String(videoBuffer.length),
        "X-Entity-Type": "video/mp4",
        "X-Instagram-Rupload-Params": JSON.stringify(ruploadParams),
      }),
      body: videoBuffer,
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Web video upload failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

/**
 * Publish a single-photo feed post with caption, optional usertags, and optional location (POST-01).
 */
export async function publishPhoto(
  ig,
  { imagePath, caption = "", usertags = [], location = null } = {}
) {
  const validImagePath = validateMediaFile(imagePath);
  const fileBuffer = await prepareFeedImage(validImagePath);
  const resolvedTags = await resolveUsertags(ig, usertags);

  const webCookies = extractWebSessionCookies(ig);
  if (webCookies) {
    const uploadId = String(Date.now());
    await webUploadPhotoBuffer(webCookies, uploadId, fileBuffer, 1);
    const form = new URLSearchParams({
      source_type: "library",
      caption: String(caption || ""),
      upload_id: uploadId,
      disable_comments: "0",
      like_and_view_counts_disabled: "0",
    });
    if (resolvedTags.length > 0) {
      form.set("usertags", JSON.stringify({ in: resolvedTags }));
    }
    const confRes = await fetch(
      "https://www.instagram.com/api/v1/media/configure/",
      {
        method: "POST",
        headers: buildWebHeaders(webCookies, {
          "Content-Type": "application/x-www-form-urlencoded",
        }),
        body: form.toString(),
      }
    );
    const data = await confRes.json();
    if (!confRes.ok || data.status !== "ok") {
      throw new Error(
        data.message || `Web photo configure failed (${confRes.status})`
      );
    }
    return formatMediaResult(data.media || data, "photo");
  }

  const res = await ig.publish.photo({
    file: fileBuffer,
    caption: String(caption || ""),
    ...(resolvedTags.length > 0 ? { usertags: { in: resolvedTags } } : {}),
    ...(location ? { location } : {}),
  });

  return formatMediaResult(res?.media || res, "photo");
}

/**
 * Publish a multi-item carousel/album feed post containing 2 to 10 photos and/or videos (POST-02).
 */
export async function publishCarousel(
  ig,
  { items, caption = "", location = null } = {}
) {
  if (!Array.isArray(items) || items.length < 2 || items.length > 10) {
    throw new Error("Carousel requires between 2 and 10 media items.");
  }

  const preparedItems = [];
  for (const entry of items) {
    const isEntryObj = typeof entry === "object" && entry !== null;
    const itemPath = typeof entry === "string" ? entry : entry?.path;
    const validItemPath = validateMediaFile(itemPath);

    const isVideo =
      (isEntryObj && entry.type === "video") || isVideoFile(validItemPath);
    const entryTags =
      isEntryObj && Array.isArray(entry.usertags) && entry.usertags.length > 0
        ? await resolveUsertags(ig, entry.usertags)
        : [];

    if (isVideo) {
      const rawCoverPath = isEntryObj
        ? entry.coverPath || entry.cover_path || null
        : null;
      const validCoverPath = rawCoverPath
        ? validateMediaFile(rawCoverPath)
        : null;
      const { videoBuffer, coverBuffer } = await prepareVideoAndCover(
        validItemPath,
        validCoverPath,
        { isStory: false }
      );
      preparedItems.push({
        video: videoBuffer,
        coverImage: coverBuffer,
        ...(entryTags.length > 0 ? { usertags: { in: entryTags } } : {}),
      });
    } else {
      const fileBuffer = await prepareFeedImage(validItemPath);
      preparedItems.push({
        file: fileBuffer,
        ...(entryTags.length > 0 ? { usertags: { in: entryTags } } : {}),
      });
    }
  }

  const res = await ig.publish.album({
    caption: String(caption || ""),
    items: preparedItems,
    ...(location ? { location } : {}),
  });

  return formatMediaResult(res?.media || res, "carousel", {
    item_count: preparedItems.length,
  });
}

/**
 * Publish a Video / Reel post to the feed with caption, custom or auto-extracted cover frame, and optional usertags (POST-03).
 */
export async function publishVideo(
  ig,
  {
    videoPath,
    caption = "",
    coverPath = null,
    usertags = [],
    location = null,
  } = {}
) {
  const validVideoPath = validateMediaFile(videoPath);
  const validCoverPath = coverPath ? validateMediaFile(coverPath) : null;

  const { videoBuffer, coverBuffer } = await prepareVideoAndCover(
    validVideoPath,
    validCoverPath,
    { isStory: false }
  );
  const resolvedTags = await resolveUsertags(ig, usertags);

  const webCookies = extractWebSessionCookies(ig);
  if (webCookies) {
    const uploadId = String(Date.now());
    await webUploadVideoBuffer(webCookies, uploadId, videoBuffer);
    await webUploadPhotoBuffer(webCookies, uploadId, coverBuffer, 2);

    const form = new URLSearchParams({
      upload_id: uploadId,
      caption: String(caption || ""),
      source_type: "library",
      clips_share_preview_to_feed: "1",
      disable_comments: "0",
      like_and_view_counts_disabled: "0",
    });
    if (resolvedTags.length > 0) {
      form.set("usertags", JSON.stringify({ in: resolvedTags }));
    }

    const endpoints = [
      "https://www.instagram.com/api/v1/media/configure_to_clips/",
      "https://www.instagram.com/api/v1/media/configure/?video=1",
    ];

    let lastData = null;
    for (const endpoint of endpoints) {
      for (let attempt = 0; attempt < 6; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
        const confRes = await fetch(endpoint, {
          method: "POST",
          headers: buildWebHeaders(webCookies, {
            "Content-Type": "application/x-www-form-urlencoded",
          }),
          body: form.toString(),
        });
        const data = await confRes.json().catch(() => ({}));
        lastData = data;
        if (confRes.ok && (data.status === "ok" || data.media)) {
          return formatMediaResult(data.media || data, "video");
        }
        const isTranscoding =
          confRes.status === 202 ||
          /transcode|not finished|processing/i.test(
            `${data.message || ""} ${data.error_type || ""}`
          );
        if (!isTranscoding) {
          break;
        }
      }
    }

    throw new Error(
      lastData?.message || "Instagram Web video configure failed."
    );
  }

  const res = await ig.publish.video({
    video: videoBuffer,
    coverImage: coverBuffer,
    caption: String(caption || ""),
    ...(resolvedTags.length > 0 ? { usertags: { in: resolvedTags } } : {}),
    ...(location ? { location } : {}),
  });

  return formatMediaResult(res?.media || res, "video");
}

/**
 * Publish a Photo or Video Story (Status) automatically formatted to 1080x1920 (9:16)
 * with optional caption and link sticker URL (STORY-01).
 */
export async function publishStory(
  ig,
  { mediaPath, caption = "", link = null, coverPath = null } = {}
) {
  const validMediaPath = validateMediaFile(mediaPath);
  const validCoverPath = coverPath ? validateMediaFile(coverPath) : null;
  const isVideo = isVideoFile(validMediaPath);

  const webCookies = extractWebSessionCookies(ig);
  if (webCookies && !isVideo) {
    const fileBuffer = await prepareStoryImage(validMediaPath);
    const uploadId = String(Date.now());
    await webUploadPhotoBuffer(webCookies, uploadId, fileBuffer, 1);
    const form = new URLSearchParams({
      upload_id: uploadId,
      caption: String(caption || ""),
    });
    const confRes = await fetch(
      "https://www.instagram.com/api/v1/web/create/configure_to_story/",
      {
        method: "POST",
        headers: buildWebHeaders(webCookies, {
          "Content-Type": "application/x-www-form-urlencoded",
        }),
        body: form.toString(),
      }
    );
    const data = await confRes.json().catch(() => ({}));
    if (confRes.ok && (data.status === "ok" || data.media)) {
      return formatMediaResult(data.media || data, "story", {
        media_kind: "photo",
        link: link || null,
      });
    }
  }

  const storyOptions = {
    ...(caption ? { caption: String(caption) } : {}),
    ...(link ? { link: String(link) } : {}),
  };

  let res;
  if (isVideo) {
    const { videoBuffer, coverBuffer } = await prepareVideoAndCover(
      validMediaPath,
      validCoverPath,
      { isStory: true }
    );
    res = await ig.publish.story({
      ...storyOptions,
      video: videoBuffer,
      coverImage: coverBuffer,
    });
  } else {
    const fileBuffer = await prepareStoryImage(validMediaPath);
    res = await ig.publish.story({
      ...storyOptions,
      file: fileBuffer,
    });
  }

  return formatMediaResult(res?.media || res, "story", {
    media_kind: isVideo ? "video" : "photo",
    link: link || null,
  });
}

/**
 * Send a Direct Message (text and/or photo) to a target Instagram username.
 */
export async function sendDirectMessage(
  ig,
  { recipient, text = "", imagePath = null } = {}
) {
  const cleanRecipient = String(recipient || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
  if (!cleanRecipient) {
    throw new Error("Recipient Instagram username is required (`recipient`).");
  }
  if (!text && !imagePath) {
    throw new Error("Either `text` or `image_path` is required to send a DM.");
  }

  const cachedEntry = memoryUserCache.get(cleanRecipient);
  let recipientId = cachedEntry?.pk || null;
  if (!recipientId) {
    recipientId = await resolveCachedUserId(ig, cleanRecipient);
  }
  if (!recipientId) {
    throw new Error(`Could not resolve Instagram user @${cleanRecipient}`);
  }

  const thread = cachedEntry?.threadId
    ? ig.entity.directThread(String(cachedEntry.threadId))
    : ig.entity.directThread([String(recipientId)]);
  let responseData = null;

  if (imagePath) {
    const validImg = validateMediaFile(imagePath);
    const fileBuffer = await prepareFeedImage(validImg);
    responseData = await thread.broadcastPhoto({ file: fileBuffer });
  }
  if (text) {
    responseData = await thread.broadcastText(String(text));
  }

  const resolvedThreadId =
    responseData?.thread_id || cachedEntry?.threadId || null;
  if (resolvedThreadId) {
    updateUserCache(cleanRecipient, {
      pk: String(recipientId),
      threadId: String(resolvedThreadId),
    });
  }

  return {
    status: "sent",
    recipient: cleanRecipient,
    recipient_id: String(recipientId),
    text: text || null,
    thread_id: resolvedThreadId,
    item_id: responseData?.item_id || null,
    timestamp: responseData?.timestamp || null,
  };
}


