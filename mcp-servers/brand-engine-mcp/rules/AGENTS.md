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

5. **Asset Organization — `Footage` / `Fotage` Folder Protocol**:
   - When unpacking, splitting, or preparing an Adobe Illustrator (`.ai`) file for After Effects animation, ALWAYS place the unpacked `.ai` file inside a dedicated `Footage` (or `Fotage`) folder within the project directory (e.g. `<Project>/Footage/<Filename>_Unpacked.ai` or `<Project>/Fotage/<Filename>_Unpacked.ai`).
   - Never leave unpacked `.ai` files loose in the project root directory or overwrite the original master artwork.
   - All After Effects layer imports and footage references must point directly to the files residing in this dedicated `Footage` / `Fotage` folder.

6. **Multi-Software Lifecycle Management**:
   - When using 2 or more creative software applications simultaneously (e.g. Adobe Illustrator, Adobe After Effects, Photoshop):
     - **Keep Open During Work**: Keep all active applications open and responsive throughout the entire pipeline until the work is completely verified and finished. Do not prematurely close, restart, or quit applications while coordinating multi-app workflows.
     - **Close Cleanly Once Complete**: After all cross-application synchronization, layer linking, and saving are fully complete, close any secondary helper background documents cleanly without saving unwanted dialog states.

7. **No Output Video Needed / Keep Project Open**:
   - You do NOT need to produce, render, or export final output video files (`.mp4`, `.mov`, `.gif`, render queue exports) upon completion unless explicitly requested by the user.
   - When complete, simply save all native project files (`.aep`, `.ai`, `.psd`) and **keep the project open in the software** (After Effects / Illustrator) so the user can immediately preview, scrub, edit, and inspect the live composition directly.
