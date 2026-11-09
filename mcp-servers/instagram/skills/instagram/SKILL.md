---
name: instagram
description: Manage multiple Instagram accounts and publish feed photos, multi-item carousels, videos/Reels, Stories (status updates), and create/stream/control Instagram Live broadcasts using the local Instagram MCP server.
---

# Instagram Multi-Account MCP Skill

Use the `instagram` MCP server tools to authenticate and manage multiple Instagram accounts, publish Feed Photos, Carousels, Videos/Reels, and 9:16 Stories (status updates), and run Instagram Live broadcasts (either streaming local video files directly via FFmpeg or generating RTMPS Stream URLs/Keys for OBS).

## 1. Multi-Account Management, Saved Sessions & Inline Credentials

All sessions and account metadata are persisted with `0600` permissions inside `/Users/admin/.gemini/config/plugins/instagram/auth_info/`:
- `auth_info/accounts.json` — Registry of all saved accounts and `defaultAccount`
- `auth_info/sessions/<username>.json` — Per-account serialized cookies and device fingerprint

### Authentication & Account Tools
- **`instagram_save_session`**: Save an active Instagram session directly by providing the `sessionid` cookie value (e.g. copied from Chrome DevTools or network headers). Enables instant, 3-second headless API uploads without needing Chrome open.
  - Parameters: `sessionid` (required), optional `account` / `username`, `csrftoken`, `ds_user_id` (auto-extracted from `sessionid`), `set_default`.
- **`instagram_status`**: Check whether the default account (or a specific `account` / `username`) is authenticated and list all saved accounts.
- **`instagram_login`**: Log in an Instagram account with `username` and `password`.
  - If Instagram requests Two-Factor Authentication (TOTP or SMS) or a Checkpoint challenge, `instagram_login` saves pending challenge state and returns `status: "two_factor_required"` or `"checkpoint_required"`. Call `instagram_login` again with `username` and `verification_code` to complete login.
  - Set `set_default: true` to make this account the default.
- **`instagram_accounts`**:
  - `action: "list"` — List all saved accounts, which one is default, and whether a session file exists.
  - `action: "set_default"` (`username: "<account>"`) — Switch the active default Instagram account.
  - `action: "remove"` (`username: "<account>"`) — Remove an account and delete its saved session file.

### Inline `account` / `username` + `password` on Every Tool
Every publishing and Live tool accepts optional:
- `account` (or `username`): Target any of your 2, 3, or more saved Instagram accounts for that single post/stream.
- `password`: Pass `username` + `password` directly inside publishing or Live tools to authenticate on the fly and publish in one step.

---

## 2. Content Publishing (Feed, Carousel, Video/Reel, Story)

All local media paths are automatically preprocessed before upload using `sharp` and `ffmpeg-static`:
- **Feed Photos**: Converted to MozJPEG and padded if outside Instagram's `[0.8, 1.91]` (`4:5` to `1.91:1`) aspect ratio range.
- **Stories (Status)**: Automatically formatted onto a `1080x1920` (`9:16`) canvas.
- **Videos / Reels**: Transcoded to H.264 (`avc1`) + 44.1kHz stereo AAC `.mp4` with `+faststart` headers (synthesizing a silent stereo AAC track automatically if the source video has no audio) and an auto-extracted JPEG cover frame if `cover_path` is omitted.

### Dual-Engine Upload & Native Chrome Fallback
Both `instagram_post_video` and `instagram_post_photo` support the `method` parameter:
- **`method: "auto"` (Default)**: Attempts fast headless API upload first. If Meta returns authentication errors (e.g., `needs_upgrade` or challenge) and Google Chrome has an active Instagram tab open, it **seamlessly falls back to Chrome browser automation in seconds** without user intervention.
- **`method: "browser"`**: Directly automates the user's active Chrome browser tab via AppleScript and native DOM interactions.
- **`method: "api"`**: Enforces headless API upload only.

### Aspect Ratio & Rich Caption Delivery
- **Aspect Ratio Control (`aspect`)**:
  - `instagram_post_video`: Defaults to `"9:16"` vertical video, explicitly selecting `9:16` / `Original` on Instagram web to prevent defaulting to a `4:5` crop.
  - `instagram_post_photo`: Defaults to `"Original"` (also supports `"1:1"`, `"4:5"`, `"16:9"`).
- **Guaranteed Lexical Editor Caption Delivery**:
  - Meta's Lexical rich-text editor enforces `isTrusted: true` on input events (synthetic JS events are ignored by React state).
  - The browser automation copies the caption to the macOS clipboard via `pbcopy` (UTF-8) and dispatches native `Cmd+V` keystrokes via AppleScript, ensuring 100% reliable caption and hashtag delivery with updated character counters.

### Publishing Tool Reference
- **`instagram_post_video`**:
  - Required: `video_path` (local path to `.mp4`, `.mov`, `.m4v`)
  - Optional: `caption`, `cover_path`, `aspect` (`"9:16"`, `"Original"`, `"1:1"`, `"4:5"`, `"16:9"`, default `"9:16"`), `method` (`"auto"`, `"browser"`, `"api"`, default `"auto"`), `usertags`, `account`, `username`, `password`
- **`instagram_post_photo`**:
  - Required: `image_path` (local path to `.jpg`, `.png`, `.webp`)
  - Optional: `caption`, `aspect` (`"Original"`, `"1:1"`, `"4:5"`, `"16:9"`, default `"Original"`), `method` (`"auto"`, `"browser"`, `"api"`, default `"auto"`), `usertags`, `account`, `username`, `password`
- **`instagram_post_carousel`**:
  - Required: `items` (array of 2–10 local file paths or `{ path, type: "photo"|"video", cover_path }` objects)
  - Optional: `caption`, `account`, `username`, `password`
- **`instagram_post_story`**:
  - Required: `media_path` (local photo or video path)
  - Optional: `caption`, `link` (swipe-up / link sticker URL), `cover_path`, `account`, `username`, `password`

---

## 3. Dual-Mode Instagram Live Broadcasting

### Mode A: Direct Local Video File Streaming (`instagram_live_stream_file`)
1. Call **`instagram_live_stream_file`** with `video_path`, optional `title`, `loop` (`true` to loop continuously), and optional `account` / `username` + `password`.
2. The server creates the broadcast, starts it, and spawns `ffmpeg-static` in the background pushing `720x1280` H.264/AAC over RTMPS (`-f flv`).
3. Monitor viewers or interact with comments via **`instagram_live_info`** and **`instagram_live_comment`**.
4. Call **`instagram_live_stop`** to cleanly terminate the background FFmpeg process (`SIGTERM`) and end the Instagram Live broadcast.

### Mode B: OBS / External RTMPS Encoder (`instagram_live_create` → `instagram_live_start` → `instagram_live_stop`)
1. Call **`instagram_live_create`** (`title`, `preview_width`, `preview_height`) to receive `broadcast_id`, `rtmp_url` (OBS Server), and `stream_key` (OBS Stream Key).
2. Start streaming from OBS using `rtmp_url` and `stream_key`, then call **`instagram_live_start`** (`broadcast_id`, `send_notifications: true`).
3. Call **`instagram_live_stop`** (`broadcast_id`, `add_to_post_live: false`) when finished.

---

## 4. Live Monitoring & Comment Moderation

- **`instagram_live_info`**: Returns `broadcast_status`, `viewer_count`, `total_unique_viewer_count`, `ffmpeg_streaming`, `ffmpeg_pid`, and active `viewers` list.
- **`instagram_live_comment`**:
  - `action: "get"` — Fetch recent live comments (`comments_requested: 10`).
  - `action: "post"` — Post a comment (`text: "Welcome to the stream!"`).
  - `action: "pin"` / `"unpin"` — Pin or unpin a comment by `comment_id`.
  - `action: "mute"` / `"unmute"` — Mute or unmute comments on the active broadcast.
