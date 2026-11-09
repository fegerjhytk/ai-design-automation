---
name: google-flow
description: Generate cinematic videos (Omni 1.1 Flash / Veo) and images (Nano Banana 2.1) using Google Flow (flow.google) via MCP. Always prompts user for aspect ratio/size before generation. Saves generated media directly to ~/Downloads.
---

# Google Flow MCP Skill

Use this skill when the user asks to create, generate, animate, or download images or cinematic video clips using **Google Flow** (`flow.google`).

> [!IMPORTANT]
> **MANDATORY RULE**: You MUST ALWAYS prompt the user to choose their target size / aspect ratio before triggering any generation! Never guess or silently default the aspect ratio.

---

## Default Generation Settings

### Image Generation Defaults (from Google Flow UI)
- **Model**: `Nano Banana 2.1` (`🍌 Nano Banana 2.1`)
- **Variant Count**: `x4` (default in UI)
- **Allowed Sizes / Aspect Ratios**: `16:9`, `4:3`, `1:1`, `3:4`, `9:16` (**Agent must ask user every time**)

### Video Generation Defaults (from Google Flow UI)
- **Sub-tab / Mode**: `Ingredients` (default; option: `Frames`)
- **Model**: `Omni 1.1 Flash`
- **Resolution**: `360p` (default; option: `720p`)
- **Duration**: `10s` (default; options: `4s`, `6s`, `8s`, `10s`)
- **Variant Count**: `x1` (default; options: `x1`, `x2`, `x3`, `x4`)
- **Allowed Sizes / Aspect Ratios**: `16:9`, `9:16` (**Agent must ask user every time**)

---

## Available Tools (10 Tools)

### Session & Setup
- `flow_status`: Check browser connection, session state, current page URL, and server health.
  - `verbose` (boolean, optional): Include environment and configuration paths.
  - `checkBrowser` (boolean, optional): Actively probe CDP port or local browser.
- `flow_login`: Open a visible Chrome window to assist the user in logging into Google Flow securely (zero-trust; passwords are never handled by the agent).
  - `timeoutSeconds` (number, default: 120): Maximum wait duration.

### Workspace & Projects
- `flow_list_projects`: List all existing projects in the user's Google Flow library.
- `flow_open_project`: Open an existing project by ID or title, or create a new studio workspace.
  - `projectId` (string, optional): ID, title, or `"new"` to create fresh project.
- `flow_get_credits`: Check available generation credits and active subscription plan.

### Generation & Animation
- `flow_generate_image`: Generate images using Google Flow (`Nano Banana 2.1`, default `x4`).
  - `prompt` (string, required): Detailed prompt describing the scene, lighting, and composition.
  - `aspectRatio` (enum: `"16:9"`, `"4:3"`, `"1:1"`, `"3:4"`, `"9:16"`, required): **MANDATORY: Ask user every time**.
  - `model` (string, default: `"Nano Banana 2.1"`).
  - `count` (enum: `"x1"`, `"x2"`, `"x3"`, `"x4"`, default: `"x4"`).
  - `style` (string, optional): Visual style descriptors (e.g. `"cinematic, 35mm film"`).
  - `waitForCompletion` (boolean, default: true): Wait for output to complete.
- `flow_generate_video`: Generate cinematic video clips using Google Flow (`Omni 1.1 Flash`, `360p`, `10s`, `Ingredients`, default `x1`).
  - `prompt` (string, required): Scene actions, subject movements, atmosphere, and pacing.
  - `aspectRatio` (enum: `"16:9"`, `"9:16"`, required): **MANDATORY: Ask user every time**.
  - `mode` (enum: `"Ingredients"`, `"Frames"`, default: `"Ingredients"`).
  - `model` (string, default: `"Omni 1.1 Flash"`).
  - `resolution` (enum: `"360p"`, `"720p"`, default: `"360p"`).
  - `duration` (enum: `"4s"`, `"6s"`, `"8s"`, `"10s"`, default: `"10s"`).
  - `count` (enum: `"x1"`, `"x2"`, `"x3"`, `"x4"`, default: `"x1"`).
  - `cameraMotion` (enum: `"static"`, `"pan_left"`, `"pan_right"`, `"tilt_up"`, `"tilt_down"`, `"zoom_in"`, `"zoom_out"`, optional).
  - `waitForCompletion` (boolean, default: true).
- `flow_animate_image`: Animate a reference photo or generated image into a video.
  - `imagePathOrUrl` (string, required): Local file path or URL to animate.
  - `prompt` (string, required): Animation dynamics and movement progression.
  - `aspectRatio` (enum: `"16:9"`, `"9:16"`, required): **MANDATORY: Ask user every time**.
  - `mode` (enum: `"Ingredients"`, `"Frames"`, default: `"Ingredients"`).
  - `model` (string, default: `"Omni 1.1 Flash"`).
  - `resolution` (enum: `"360p"`, `"720p"`, default: `"360p"`).
  - `duration` (enum: `"4s"`, `"6s"`, `"8s"`, `"10s"`, default: `"10s"`).
  - `count` (enum: `"x1"`, `"x2"`, `"x3"`, `"x4"`, default: `"x1"`).
  - `cameraMotion` (enum, optional): Desired camera motion.
  - `waitForCompletion` (boolean, default: true).

### Job Tracking & Downloads
- `flow_get_job_status`: Check generation progress percentage (`0-100%`) or status of active tasks.
- `flow_download_media`: Download generated videos or images to disk with magic-byte format validation.
  - `mediaUrl` (string, required): HTTP, blob, or data URL of the media.
  - `outputDir` (string, optional, defaults to `~/Downloads`).
  - `fileName` (string, optional): Custom filename.
  - `assetType` (enum: `"image"`, `"video"`, optional).

---

## Best Practices & Workflows

1. **Session Pre-flight**:
   - Always run `flow_status` first.
   - If not authenticated, invoke `flow_login` and instruct the user to complete Google account login in the open Chrome window.
2. **Aspect Ratio Inquiry (MANDATORY)**:
   - When the user asks to generate an image or video, ask for the aspect ratio using `ask_question` or in conversation before invoking generation tools.
3. **Video Camera Controls**:
   - For establishing shots or sweeping landscapes, use `cameraMotion: "pan_right"` or `"pan_left"`.
   - For dramatic focus on a character or object, use `cameraMotion: "zoom_in"`.
   - For stable documentary shots, use `cameraMotion: "static"`.
4. **Downloading & Presentation**:
   - Once generation completes, call `flow_download_media` with the media URL to save it to `/Users/admin/Downloads`.
   - Return the clickable Markdown link to the user (e.g. `[flow_video_123.mp4](file:///Users/admin/Downloads/flow_video_123.mp4)`).
