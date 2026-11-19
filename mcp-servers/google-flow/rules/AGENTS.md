# Google Flow MCP Guidelines

When working with Google Flow (`flow.google`), generating cinematic videos (Veo / Omni), images (Nano Banana), or animating references via the `google-flow` MCP server:

- **Check Browser & Session First**: Use `flow_status` to verify whether the Chrome session is attached (`browserType: "cdp" | "persistent_context"`) and authenticated. If unauthenticated, run `flow_login` to open a visible Chrome window so the user can complete sign-in without sharing or exposing Google credentials.

- **STRICT MANDATORY RULE — ALWAYS ASK FOR SIZE / ASPECT RATIO EVERY SINGLE TIME**:
  - **NEVER** silently assume, guess, or default the aspect ratio unless explicitly pre-specified by the user.
  - Before calling `flow_generate_image`, `flow_generate_video`, or `flow_animate_image`, **ALWAYS explicitly prompt the user** (using `ask_question` or in conversation) to choose their target size / aspect ratio:
    - **For Images**: Ask the user to choose from: `16:9`, `4:3`, `1:1`, `3:4`, or `9:16`.
    - **For Videos / Animations**: Ask the user to choose from: `16:9` or `9:16`.

- **Integrated Directorial Prompting Skills Architecture (MANDATORY)**:
  All prompt construction for Google Flow MUST route through the dedicated prompting skills:
  1. **Video Generation**: Use `cinema-director-v3` (`~/.gemini/config/skills/cinema-director-v3/SKILL.md`) locked 16-slot spine: shot header, style prefix, no on-screen text, assets, geometry map, first frame, FOV lens locks, camera motion, light & color, atmosphere, timecoded action timing, true physics, acting, proximity audio, and lock chain.
  2. **Cinematic & Environment Stills**: Use `banana-pro-director-30` (`~/.gemini/config/skills/banana-pro-director-30/SKILL.md`) for Nano Banana 2.1 scene plates, theatrical lighting, atmospheric perspective, and optical depth.
  3. **Character Consistency & Turnarounds**: Use `character-builder` (`~/.gemini/config/skills/character-builder/SKILL.md`) for canonical face locks (18% neutral gray backdrop, shadowless light), outfit builder plates, and 3-panel/6-panel character sheets.
  4. **Photorealistic Human Portraits**: Use `realistic-image-prompts` (`~/.gemini/config/skills/realistic-image-prompts/SKILL.md`) for organic human portraits with authentic optical lens focal lengths (35mm/85mm), natural subsurface scattering, real skin pores, and unretouched daylight.

- **Default Image Generation Settings**:
  - **Model**: `Nano Banana 2.1` (`🍌 Nano Banana 2.1`)
  - **Thinking Level**: `High`
  - **Count / Variants**: `x4` (generates 4 image options by default)
  - **Available Aspect Ratios**: `16:9`, `4:3`, `1:1`, `3:4`, `9:16` (confirm with user)

- **Default Video Generation Settings**:
  - **Sub-tab / Mode**: `Ingredients` (default; alternative: `Frames`)
  - **Model**: `Omni 1.2 Flash`
  - **Resolution**: `360p` (default; alternative: `720p`)
  - **Duration**: `15s` (default; alternatives: `5s`, `10s`, `15s`)
  - **Count / Variants**: `x1` (default; alternatives: `x1`, `x2`, `x3`, `x4`)
  - **Available Aspect Ratios**: `16:9`, `9:16` (confirm with user)

- **Camera Motion Controls**: When generating video, set `cameraMotion` (`"pan_left"`, `"pan_right"`, `"tilt_up"`, `"tilt_down"`, `"zoom_in"`, `"zoom_out"`, `"static"`). The server both interacts with UI selectors and conditions prompts to guarantee motion delivery.

- **Image-to-Video Animation**: Use `flow_animate_image` with a local image path (e.g., from Downloads) or image URL to animate still photos or concept art into moving video sequences. Ask user for aspect ratio (`16:9` or `9:16`) first.

- **Local Asset Downloads**: All generated media should be downloaded via `flow_download_media` to `/Users/admin/Downloads`. Always provide the clickable local path (`file:///Users/admin/Downloads/...`) in your response.
