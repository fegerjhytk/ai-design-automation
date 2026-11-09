# Instagram MCP (Multi-Account) Guidelines

When working with Instagram publishing, Stories (Status), or Instagram Live via the `instagram` MCP server:

- **Multi-Account Support (`auth_info/accounts.json` + `auth_info/sessions/<username>.json`)**:
  - The Instagram MCP server supports 2, 3, or more simultaneous Instagram accounts (Personal, Creator, or Business) with isolated `0600` session cookies and device fingerprints.
  - Use `instagram_accounts` (`action: "list" | "set_default" | "remove"`) to inspect saved accounts or switch the active default account, and `instagram_status` to verify session health.
  - Use `instagram_save_session` (`sessionid: "..."`, optional `account`) to store active session cookies once for instant 3-second headless uploads without requiring an open browser tab.
- **Dual-Engine Upload & Active Chrome Browser Automation**:
  - `instagram_post_video` and `instagram_post_photo` support `method: "auto"` (default), `"browser"`, and `"api"`.
  - When mobile private API login returns `needs_upgrade` or challenge errors, `"auto"` seamlessly falls back to active Google Chrome tabs (`isChromeInstagramOpen()`), automating the upload in seconds.
- **Strict Aspect Ratio & 9:16 Reels**:
  - Instagram Web defaults video uploads to `4:5`. `instagram_post_video` explicitly selects `9:16` (or `Original` for 720x1280/1080x1920 clips) to ensure vertical Reels are never cropped down to 4:5.
- **Guaranteed Lexical Editor Caption Delivery**:
  - Meta's Lexical rich-text editor ignores synthetic JS input events (`event.isTrusted: false`). Browser uploads use `pbcopy` and macOS AppleScript `Cmd+V` keystrokes to ensure captions and hashtags are cleanly injected with updated React state and character counters.
- **Automatic Media Preprocessing**:
  - Local images (`.jpg`, `.jpeg`, `.png`, `.webp`) and videos (`.mp4`, `.mov`, `.m4v`) are automatically validated and normalized via `sharp` and `ffmpeg-static` before upload (feed aspect ratios clamped to `[0.8, 1.91]`, Stories padded to `1080x1920` `9:16`, videos transcoded to H.264 `avc1` + AAC MP4 with auto-extracted cover frames). Always pass local file paths directly.
- **Dual-Mode Instagram Live**:
  - **Direct Video File Streaming**: Use `instagram_live_stream_file` (with `video_path` and optional `loop: true`) to broadcast a pre-recorded video directly to Instagram Live in the background, and stop it with `instagram_live_stop`.
  - **OBS / External Encoder**: Use `instagram_live_create` to obtain `rtmp_url` and `stream_key` for OBS, then `instagram_live_start`, monitor viewers/comments with `instagram_live_info` and `instagram_live_comment`, and finish with `instagram_live_stop`.
