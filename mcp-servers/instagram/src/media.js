import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".mkv",
  ".avi",
]);

/**
 * Validate that a media file path exists and is a regular file.
 * Expands leading '~' to the user's home directory and returns an absolute path.
 */
export function validateMediaFile(filePath) {
  if (!filePath || typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("A non-empty media file path is required.");
  }
  let expanded = filePath.trim();
  if (expanded === "~") {
    expanded = os.homedir();
  } else if (expanded.startsWith("~/") || expanded.startsWith("~\\")) {
    expanded = path.join(os.homedir(), expanded.slice(2));
  }

  const resolved = path.resolve(expanded);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Media file does not exist: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`Media path is not a regular file: ${resolved}`);
  }
  return resolved;
}

/**
 * Return true if the file path has a supported video extension.
 */
export function isVideoFile(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }
  const ext = path.extname(filePath.trim()).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

/**
 * Normalize an image for Instagram Feed / Carousel posts.
 * Converts to baseline JPEG, enforces max width 1080px, and pads out-of-range
 * aspect ratios into Instagram's [0.8, 1.91] (4:5 to 1.91:1) window.
 */
export async function prepareFeedImage(inputPath) {
  const resolved = validateMediaFile(inputPath);
  const rotated = sharp(resolved).rotate();
  const metadata = await rotated.metadata();
  const isTransposed = metadata.orientation && metadata.orientation >= 5;
  const width = (isTransposed ? metadata.height : metadata.width) || 1080;
  const height = (isTransposed ? metadata.width : metadata.height) || 1080;
  const ratio = width / height;

  if (ratio >= 0.8 && ratio <= 1.91) {
    if (
      metadata.format === "jpeg" &&
      width <= 1080 &&
      (!metadata.orientation || metadata.orientation === 1)
    ) {
      return fs.readFileSync(resolved);
    }
    return await sharp(resolved)
      .rotate()
      .resize({ width: Math.min(width, 1080), withoutEnlargement: true })
      .flatten({ background: "#000000" })
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  const clampedRatio = Math.min(Math.max(ratio, 0.8), 1.91);
  const targetWidth = 1080;
  const targetHeight = Math.round(1080 / clampedRatio);

  return await sharp(resolved)
    .rotate()
    .resize(targetWidth, targetHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .flatten({ background: "#000000" })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Normalize an image for Instagram Story (Status) posts into 1080x1920 (9:16) baseline JPEG.
 */
export async function prepareStoryImage(inputPath) {
  const resolved = validateMediaFile(inputPath);
  const meta = await sharp(resolved).metadata();
  if (
    meta.format === "jpeg" &&
    meta.width === 1080 &&
    meta.height === 1920 &&
    (!meta.orientation || meta.orientation === 1)
  ) {
    return fs.readFileSync(resolved);
  }
  return await sharp(resolved)
    .rotate()
    .resize(1080, 1920, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .flatten({ background: "#000000" })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Probe whether a video file contains an audio stream using ffmpeg-static.
 */
export async function probeHasAudio(videoPath) {
  const resolved = validateMediaFile(videoPath);
  try {
    await execFileAsync(ffmpegPath, ["-hide_banner", "-i", resolved]);
    return false;
  } catch (err) {
    const stderr = String(err?.stderr || "");
    return /Stream #\d+:\d+.*Audio:/i.test(stderr);
  }
}

/**
 * Extract a cover frame from a video file and format it as a compliant JPEG Buffer.
 */
export async function extractVideoCover(
  videoPath,
  { isStory = false, timestamp = "00:00:00.500" } = {}
) {
  const resolved = validateMediaFile(videoPath);
  const id = crypto.randomBytes(6).toString("hex");
  const tempFramePath = path.join(os.tmpdir(), `ig_cover_${id}.jpg`);

  try {
    await execFileAsync(ffmpegPath, [
      "-y",
      "-ss",
      timestamp,
      "-i",
      resolved,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      tempFramePath,
    ]).catch(() => {});

    if (!fs.existsSync(tempFramePath) || fs.statSync(tempFramePath).size === 0) {
      await execFileAsync(ffmpegPath, [
        "-y",
        "-ss",
        "00:00:00.000",
        "-i",
        resolved,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        tempFramePath,
      ]);
    }

    return isStory
      ? await prepareStoryImage(tempFramePath)
      : await prepareFeedImage(tempFramePath);
  } finally {
    if (fs.existsSync(tempFramePath)) {
      fs.rmSync(tempFramePath, { force: true });
    }
  }
}

/**
 * Transcode a local video file via ffmpeg-static into an Instagram-compliant
 * H.264 (avc1) + AAC MP4 Buffer with +faststart moov atoms.
 */
export async function transcodeVideoForInstagram(
  videoPath,
  { isStory = false } = {}
) {
  const resolved = validateMediaFile(videoPath);
  const hasAudio = await probeHasAudio(resolved);
  const id = crypto.randomBytes(6).toString("hex");
  const tempVideoPath = path.join(os.tmpdir(), `ig_video_${id}.mp4`);

  const vfFilter = isStory
    ? "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p"
    : "scale='min(1080,iw)':-2,setsar=1,format=yuv420p";

  const args = [
    "-y",
    "-i",
    resolved,
    ...(hasAudio
      ? []
      : [
          "-f",
          "lavfi",
          "-i",
          "anullsrc=channel_layout=stereo:sample_rate=44100",
        ]),
    "-vf",
    vfFilter,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-profile:v",
    "high",
    "-level:v",
    "4.0",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "44100",
    "-ac",
    "2",
    ...(hasAudio ? [] : ["-shortest"]),
    "-movflags",
    "+faststart",
    tempVideoPath,
  ];

  try {
    await execFileAsync(ffmpegPath, args, { maxBuffer: 50 * 1024 * 1024 });
    return fs.readFileSync(tempVideoPath);
  } finally {
    if (fs.existsSync(tempVideoPath)) {
      fs.rmSync(tempVideoPath, { force: true });
    }
  }
}

/**
 * Transcode a video and prepare its JPEG cover image (either from custom coverPath or auto-extracted).
 */
export async function prepareVideoAndCover(
  videoPath,
  coverPath = null,
  { isStory = false } = {}
) {
  const videoBuffer = await transcodeVideoForInstagram(videoPath, { isStory });
  let coverBuffer;
  if (coverPath) {
    coverBuffer = isStory
      ? await prepareStoryImage(coverPath)
      : await prepareFeedImage(coverPath);
  } else {
    coverBuffer = await extractVideoCover(videoPath, { isStory });
  }
  return { videoBuffer, coverBuffer };
}
