# Canva MCP (Multi-Account) Guidelines

When working with Canva designs, brand kits, assets, or automations via the `canva` MCP server:

- **Multi-Account Architecture (`~/.mcp-auth/accounts/`)**:
  - The Canva MCP plugin supports multiple Canva accounts (Personal and Company) with isolated session storage.
  - Active account selection is persisted in `~/.mcp-auth/accounts/active.json`.
  - Use `canva-account status` to inspect active account and session validity, and `canva-account switch <personal|company>` to switch between accounts.
  - Re-authentication can be triggered via `canva-account login <personal|company>`.

- **Design Creation & Generation**:
  - Use `generate-design` to create presentations, social media graphics, posters, and documents from natural language prompts.
  - Use `create-design-from-brand-template` when adhering to specific brand kits, and populate with `autofill-design` using datasets.

- **Asset & Image Workflows**:
  - Use `remove-background` for clean product cutouts and portraits.
  - Use `separate-image-layers` to break down flattened graphics into editable foreground/background layers.
  - Use `generate-image` for generating custom Canva AI illustrations or photographic elements.

- **Exporting & Output**:
  - Use `export-design` with target formats (PDF, PNG, JPG, PPTX, SVG, MP4) and provide user-accessible download links.
