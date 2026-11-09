# Google Flow MCP Guidelines

When working with Google Flow (`flow.google`), generating cinematic videos (Veo / Omni), images (Nano Banana), or animating references via the `google-flow` MCP server:

- **Check Browser & Session First**: Use `flow_status` to verify whether the Chrome session is attached (`browserType: "cdp" | "persistent_context"`) and authenticated. If unauthenticated, run `flow_login` to open a visible Chrome window so the user can complete sign-in without sharing or exposing Google credentials.

- **STRICT MANDATORY RULE — ALWAYS ASK FOR SIZE / ASPECT RATIO EVERY SINGLE TIME**:
  - **NEVER** silently assume, guess, or default the aspect ratio.
  - Before calling `flow_generate_image`, `flow_generate_video`, or `flow_animate_image`, **ALWAYS explicitly prompt the user** (using `ask_question` or in conversation) to choose their target size / aspect ratio:
    - **For Images**: Ask the user to choose from: `16:9`, `4:3`, `1:1`, `3:4`, or `9:16`.
    - **For Videos / Animations**: Ask the user to choose from: `16:9` or `9:16`.

- **Default Image Generation Settings**:
  - **Model**: `Nano Banana 2.1` (`🍌 Nano Banana 2.1`)
  - **Count / Variants**: `x4` (generates 4 image options by default)
  - **Available Aspect Ratios**: `16:9`, `4:3`, `1:1`, `3:4`, `9:16` (prompt user every time)

- **Default Video Generation Settings**:
  - **Sub-tab / Mode**: `Ingredients` (default; alternative: `Frames`)
  - **Model**: `Omni 1.1 Flash`
  - **Resolution**: `360p` (default; alternative: `720p`)
  - **Duration**: `10s` (default; alternatives: `4s`, `6s`, `8s`, `10s`)
  - **Count / Variants**: `x1` (default; alternatives: `x1`, `x2`, `x3`, `x4`)
  - **Available Aspect Ratios**: `16:9`, `9:16` (prompt user every time)

- **Camera Motion Controls**: When generating video, optionally set `cameraMotion` (`"pan_left"`, `"pan_right"`, `"tilt_up"`, `"tilt_down"`, `"zoom_in"`, `"zoom_out"`, `"static"`). The server both interacts with UI selectors and conditions prompts to guarantee motion delivery.

- **Image-to-Video Animation**: Use `flow_animate_image` with a local image path (e.g., from Downloads) or image URL to animate still photos or concept art into moving video sequences. Ask user for aspect ratio (`16:9` or `9:16`) first.

- **Local Asset Downloads**: All generated media should be downloaded via `flow_download_media` to `/Users/admin/Downloads`. Always provide the clickable local path (`file:///Users/admin/Downloads/...`) in your response.
