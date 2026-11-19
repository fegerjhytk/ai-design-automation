# Brand & Motion Engine MCP Guidelines

When working with brand identity design, packaging, and kinetic motion animation via `brand-engine-mcp`:

1. **Category Deconstruction First (`brand_anti_sameness_audit`)**:
   - Always run `brand_anti_sameness_audit` before creating color swatches or image generation prompts.
   - Use the returned `negative_prompt_injection` to prevent AI image models from collapsing into category clichés.

2. **Typographic Wordmark Sovereignty (`audit_typographic_kerning` & `illustrator_build_identity`)**:
   - Primary logos must be 100% typographic wordmarks. Never attach an icon or badge directly to the wordmark.
   - The conceptual symbol (e.g. bonsai, crest, seal) must strictly reside on the isolated `Secondary Seals` layer (The Bonsai Rule).
   - Audit letter pairs (like `R-A` or `A-V`) using `audit_typographic_kerning` to apply optical tracking offsets.

3. **Environmental Staging (`stage_environmental_mockup`)**:
   - Always test packaging across retail shelf or real-world lighting environments via Google Flow before finalizing print artwork. Always confirm aspect ratio with the user.

4. **Kinetic Motion Choreography (`motion_sync_timeline`)**:
   - Use `motion_sync_timeline` for BPM-based word timing. It returns GSAP for HyperFrames and JSX with native keyframes for After Effects.
