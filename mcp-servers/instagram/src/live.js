import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { LiveEntity } from "./auth.js";
import { validateMediaFile, probeHasAudio } from "./media.js";

const activeStreams = new Map();
let lastBroadcastId = null;

/**
 * Clean up any active background FFmpeg processes when the Node.js process exits.
 */
process.on("exit", () => {
  for (const entry of activeStreams.values()) {
    if (
      entry?.ffmpegProcess &&
      entry.ffmpegProcess.exitCode === null &&
      entry.ffmpegProcess.signalCode === null
    ) {
      try {
        entry.ffmpegProcess.kill("SIGTERM");
      } catch {
        // Ignore cleanup errors on exit
      }
    }
  }
});

/**
 * Return the internal Map of active streams for inspection/testing.
 */
export function getActiveStreams() {
  return activeStreams;
}

/**
 * Mask secret stream key tokens in Instagram RTMPS ingest URLs so credentials
 * are never leaked into stderr diagnostic logs.
 */
export function redactRtmpsUrl(url) {
  if (!url || typeof url !== "string") {
    return "";
  }
  return url.replace(/(\/rtmp\/\d*)([^\s"']+)/g, "$1***REDACTED***");
}

/**
 * Build the FFmpeg CLI arguments array for streaming a local video file to Instagram Live RTMPS.
 */
export function buildFfmpegLiveArgs({
  videoPath,
  uploadUrl,
  loop = false,
  hasAudio = true,
} = {}) {
  return [
    "-re",
    ...(loop ? ["-stream_loop", "-1"] : []),
    "-i",
    videoPath,
    ...(hasAudio
      ? []
      : [
          "-f",
          "lavfi",
          "-i",
          "anullsrc=channel_layout=stereo:sample_rate=44100",
        ]),
    "-vf",
    "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-profile:v",
    "baseline",
    "-b:v",
    "2500k",
    "-maxrate",
    "2500k",
    "-bufsize",
    "5000k",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    "-g",
    "60",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "44100",
    "-ac",
    "2",
    ...(hasAudio ? [] : ["-shortest"]),
    "-f",
    "flv",
    uploadUrl,
  ];
}

/**
 * Gracefully terminate a spawned FFmpeg child process with SIGTERM and SIGKILL fallback.
 */
async function terminateChildProcess(child) {
  if (!child) {
    return false;
  }

  const isExited = () =>
    child.exitCode !== null || child.signalCode !== null;

  if (isExited()) {
    return true;
  }

  try {
    child.stdin?.write("q\n");
    child.stdin?.end();
  } catch {
    // Ignore stdin write errors
  }

  try {
    child.kill("SIGTERM");
  } catch {
    // Ignore kill errors
  }

  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    };

    const timer = setTimeout(() => {
      try {
        if (!isExited()) {
          child.kill("SIGKILL");
        }
      } catch {
        // Ignore kill errors
      }
      finish();
    }, 1500);
    timer.unref?.();

    if (typeof child.once === "function") {
      child.once("close", finish);
      child.once("exit", finish);
    } else {
      finish();
    }

    if (isExited()) {
      finish();
    }
  });

  return true;
}

/**
 * Create an Instagram Live broadcast session and return OBS-compatible rtmp_url and stream_key.
 */
export async function createLiveBroadcast(
  ig,
  { title = "", previewWidth = 720, previewHeight = 1280 } = {}
) {
  const broadcast = await ig.live.create({
    previewWidth: Number(previewWidth) || 720,
    previewHeight: Number(previewHeight) || 1280,
    message: String(title || ""),
  });

  const { stream_url, stream_key } = LiveEntity.getUrlAndKey(broadcast);
  const broadcastId = String(broadcast.broadcast_id);
  lastBroadcastId = broadcastId;

  activeStreams.set(broadcastId, {
    broadcastId,
    status: "created",
    uploadUrl: broadcast.upload_url,
    rtmpUrl: stream_url,
    title: String(title || ""),
    createdAt: new Date().toISOString(),
    ffmpegProcess: null,
    pid: null,
  });

  return {
    status: "created",
    broadcast_id: broadcastId,
    upload_url: broadcast.upload_url,
    rtmp_url: stream_url,
    stream_key,
    max_time_in_seconds: broadcast.max_time_in_seconds ?? 3600,
    instructions:
      "Configure OBS with rtmp_url (Server) and stream_key (Stream Key), start streaming from OBS, then call instagram_live_start.",
  };
}

/**
 * Start a created Instagram Live broadcast.
 */
export async function startLiveBroadcast(
  ig,
  { broadcastId = null, sendNotifications = true } = {}
) {
  const id = String(broadcastId || lastBroadcastId || "").trim();
  if (!id) {
    throw new Error("broadcast_id is required (no active broadcast found).");
  }

  const res = await ig.live.start(id, Boolean(sendNotifications));
  lastBroadcastId = id;

  const existing = activeStreams.get(id) || { broadcastId: id };
  activeStreams.set(id, {
    ...existing,
    status: "live",
    startedAt: existing.startedAt || new Date().toISOString(),
  });

  return {
    status: "live",
    broadcast_id: id,
    send_notifications: Boolean(sendNotifications),
    response: res,
  };
}

/**
 * Stop an active Instagram Live broadcast and cleanly terminate any associated FFmpeg process.
 */
export async function stopLiveBroadcast(
  ig,
  { broadcastId = null, addToPostLive = false } = {}
) {
  const id = String(broadcastId || lastBroadcastId || "").trim();
  if (!id) {
    throw new Error("broadcast_id is required (no active broadcast found).");
  }

  const entry = activeStreams.get(id);
  const hadFfmpeg = Boolean(entry?.ffmpegProcess);
  const ffmpegPid = entry?.pid || null;

  if (entry?.ffmpegProcess) {
    await terminateChildProcess(entry.ffmpegProcess);
  }

  await ig.live.endBroadcast(id);
  if (addToPostLive && typeof ig.live.addToPostLive === "function") {
    await ig.live.addToPostLive(id);
  }

  activeStreams.delete(id);
  if (lastBroadcastId === id) {
    const remainingKeys = Array.from(activeStreams.keys());
    lastBroadcastId =
      remainingKeys.length > 0 ? remainingKeys[remainingKeys.length - 1] : null;
  }

  return {
    status: "stopped",
    broadcast_id: id,
    ffmpeg_stopped: hadFfmpeg,
    ffmpeg_pid: ffmpegPid,
  };
}

/**
 * Create and start an Instagram Live broadcast, then stream a local video file
 * directly to Instagram's RTMPS ingest server in the background using ffmpeg-static.
 */
export async function streamFileToLive(
  ig,
  {
    videoPath,
    title = "",
    loop = false,
    sendNotifications = true,
    spawnFn = spawn,
  } = {}
) {
  const resolvedPath = validateMediaFile(videoPath);

  // Stop any existing background FFmpeg live stream first so no orphan process remains
  for (const [existingId, existingEntry] of activeStreams.entries()) {
    if (existingEntry?.ffmpegProcess) {
      await terminateChildProcess(existingEntry.ffmpegProcess);
      if (typeof ig?.live?.endBroadcast === "function") {
        await ig.live.endBroadcast(existingId).catch(() => {});
      }
      activeStreams.delete(existingId);
    }
  }

  const hasAudio = await probeHasAudio(resolvedPath);
  const created = await createLiveBroadcast(ig, { title });
  await startLiveBroadcast(ig, {
    broadcastId: created.broadcast_id,
    sendNotifications,
  });

  const args = buildFfmpegLiveArgs({
    videoPath: resolvedPath,
    uploadUrl: created.upload_url,
    loop: Boolean(loop),
    hasAudio,
  });

  const child = spawnFn(ffmpegPath, args, {
    shell: false,
    stdio: ["pipe", "ignore", "pipe"],
  });

  const stderrLines = [];
  child.stderr?.on("data", (chunk) => {
    const sanitized = redactRtmpsUrl(String(chunk));
    const lines = sanitized
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      stderrLines.push(line);
      if (stderrLines.length > 20) {
        stderrLines.shift();
      }
    }
  });

  child.on?.("error", (err) => {
    process.stderr.write(
      `[instagram-mcp] FFmpeg live process error (${created.broadcast_id}): ${redactRtmpsUrl(err.message)}\n`
    );
  });

  activeStreams.set(created.broadcast_id, {
    broadcastId: created.broadcast_id,
    status: "streaming",
    ffmpegProcess: child,
    pid: child?.pid ?? null,
    videoPath: resolvedPath,
    loop: Boolean(loop),
    startedAt: new Date().toISOString(),
    stderrLines,
  });

  return {
    status: "streaming",
    broadcast_id: created.broadcast_id,
    ffmpeg_pid: child?.pid ?? null,
    video_path: resolvedPath,
    loop: Boolean(loop),
    message:
      "Instagram Live started and streaming local video file in background. Call instagram_live_stop to end the broadcast.",
  };
}

/**
 * Query active Instagram Live broadcast status, viewer count, and viewer list.
 */
export async function getLiveBroadcastInfo(
  ig,
  { broadcastId = null } = {}
) {
  const id = String(broadcastId || lastBroadcastId || "").trim();
  if (!id) {
    throw new Error("broadcast_id is required.");
  }

  const [info, heartbeat, viewers] = await Promise.all([
    ig.live.info(id),
    ig.live.heartbeatAndGetViewerCount(id),
    ig.live.getViewerList(id).catch(() => ({ users: [] })),
  ]);

  const entry = activeStreams.get(id);
  const ffmpegStreaming = Boolean(
    entry?.ffmpegProcess &&
      entry.ffmpegProcess.exitCode === null &&
      entry.ffmpegProcess.signalCode === null &&
      !entry.ffmpegProcess.killed
  );

  return {
    broadcast_id: id,
    broadcast_status:
      info?.broadcast_status || heartbeat?.broadcast_status || "active",
    viewer_count: heartbeat?.viewer_count ?? info?.viewer_count ?? 0,
    total_unique_viewer_count: heartbeat?.total_unique_viewer_count ?? 0,
    broadcast_message: info?.broadcast_message || "",
    published_time: info?.published_time || null,
    ffmpeg_streaming: ffmpegStreaming,
    ffmpeg_pid: entry?.pid || null,
    viewers: (viewers?.users || []).map((u) => ({
      pk: String(u.pk),
      username: u.username,
      full_name: u.full_name,
    })),
  };
}

/**
 * Fetch, post, pin, unpin, mute, or unmute comments on an active Instagram Live broadcast.
 */
export async function handleLiveComment(
  ig,
  {
    broadcastId = null,
    action = "get",
    text = "",
    commentId = null,
    commentsRequested = 10,
    lastCommentTs = 0,
  } = {}
) {
  const id = String(broadcastId || lastBroadcastId || "").trim();
  if (!id) {
    throw new Error("broadcast_id is required.");
  }

  const normalizedAction = String(action || "get").trim().toLowerCase();

  switch (normalizedAction) {
    case "get": {
      const res = await ig.live.getComment({
        broadcastId: id,
        commentsRequested: Number(commentsRequested) || 10,
        lastCommentTs: Number(lastCommentTs) || 0,
      });
      return {
        status: "ok",
        action: "get",
        broadcast_id: id,
        comments: (res?.comments || []).map((c) => ({
          pk: String(c.pk),
          text: c.text,
          created_at: c.created_at,
          user: c.user
            ? {
                pk: String(c.user.pk),
                username: c.user.username,
              }
            : null,
        })),
        pinned_comment: res?.pinned_comment || null,
      };
    }

    case "post": {
      const message = String(text || "").trim();
      if (!message) {
        throw new Error("Comment text is required when action is 'post'.");
      }
      const res = await ig.live.comment(id, message);
      return {
        status: "posted",
        action: "post",
        broadcast_id: id,
        comment: res?.comment || res,
      };
    }

    case "pin": {
      if (!commentId) {
        throw new Error("comment_id is required when action is 'pin'.");
      }
      await ig.live.pinComment(id, String(commentId));
      return {
        status: "pinned",
        action: "pin",
        broadcast_id: id,
        comment_id: String(commentId),
      };
    }

    case "unpin": {
      if (!commentId) {
        throw new Error("comment_id is required when action is 'unpin'.");
      }
      await ig.live.unpinComment(id, String(commentId));
      return {
        status: "unpinned",
        action: "unpin",
        broadcast_id: id,
        comment_id: String(commentId),
      };
    }

    case "mute": {
      await ig.live.muteComment(id);
      return {
        status: "muted",
        action: "mute",
        broadcast_id: id,
      };
    }

    case "unmute": {
      await ig.live.unmuteComment(id);
      return {
        status: "unmuted",
        action: "unmute",
        broadcast_id: id,
      };
    }

    default:
      throw new Error(
        `Unsupported live comment action "${action}". Use "get", "post", "pin", "unpin", "mute", or "unmute".`
      );
  }
}
