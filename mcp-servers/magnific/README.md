# Magnific AI Plugin for Antigravity

This plugin provides a comprehensive integration with [Magnific AI](https://docs.magnific.com) for Antigravity.

## Features

- **Mystic Image Generation**: Ultra-realistic 1k, 2k, and 4k AI image generation from natural language prompts.
- **Image Upscaling**: Creative and precision upscaling (2x, 4x, 8x, 16x) with prompt-guided detailing.
- **Background Removal**: Clean alpha cutout for portraits and objects.
- **Local Asset Downloading**: All generated and upscaled assets are automatically saved to your system Downloads folder (`~/Downloads`).
- **Zero OAuth Hassle**: Uses your Magnific API key directly without browser sign-in popups.

## Plugin Contents

```
~/.gemini/config/plugins/magnific/
├── plugin.json                 # Plugin manifest & suggested prompts
├── mcp_config.json             # Bundled MCP server configuration
├── server.py                   # MCP server implementation
├── magnific_client.py          # Magnific API client
├── skills/
│   └── magnific/
│       └── SKILL.md            # Magnific workflow skill
├── rules/
│   └── AGENTS.md               # Guidelines for image generation & downloads
└── README.md                   # Plugin documentation
```

## Configuration

Your credentials are pre-configured in `mcp_config.json`:
- `MAGNIFIC_API_KEY`: Configured
- `MAGNIFIC_WEBHOOK_SECRET`: Configured
- `MAGNIFIC_DOWNLOAD_DIR`: `/Users/admin/Downloads`
