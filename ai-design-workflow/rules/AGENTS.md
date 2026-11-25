# AI Design Workflow Guidelines

When working with brand identity, advertising creatives, print/editorial layouts, or motion animation via `ai-design-workflow` (combining the Design Automation Pipeline and Brand & Motion Engine tools):

1. **Category Deconstruction First (`brand_anti_sameness_audit`)**:
   - Always run `brand_anti_sameness_audit` before creating color swatches or image generation prompts.
   - Use the returned `negative_prompt_injection` to prevent AI image models from collapsing into category clichés.

2. **Typographic Wordmark Sovereignty (`audit_typographic_kerning` & `illustrator_build_identity`)**:
   - Primary logos must be 100% typographic wordmarks. Never attach an icon or badge directly to the wordmark.
   - The conceptual symbol (e.g. bonsai, crest, seal) must strictly reside on the isolated `Secondary Seals` layer (The Bonsai Rule).
   - Audit letter pairs (like `R-A` or `A-V`) using `audit_typographic_kerning` to apply optical tracking offsets.

3. **Environmental Staging (`stage_environmental_mockup`)**:
   - Always test packaging across retail shelf or real-world lighting environments via Google Flow (`Nano Banana 2.1`) before finalizing print artwork. Always confirm the aspect ratio with the user first.

4. **Kinetic Motion Choreography (`motion_sync_timeline`)**:
   - Use `motion_sync_timeline` for BPM-based word timing. It returns GSAP code for HyperFrames and JSX with native keyframes for After Effects.

5. **Asset Organization — `Footage` / `Fotage` Folder Protocol**:
   - When unpacking, splitting, or preparing an Adobe Illustrator (`.ai`) file for After Effects animation, ALWAYS place the unpacked `.ai` file inside a real physical `Footage` (or `Fotage`) folder within the project directory (e.g. `<Project>/Footage/<Filename>_Unpacked.ai`), never loose in the project root and never as a symlink/alias folder.
   - All After Effects layer imports and footage references must point directly to the files inside that dedicated folder.

6. **Multi-Software Lifecycle Management**:
   - **Adobe Illustrator & After Effects**: Keep active applications and native `.ai`/`.aep` documents open during multi-app work and upon completion so the user can inspect, scrub, and edit live. Never overwrite manual user edits.
   - **Adobe Photoshop**: Close and quit Photoshop immediately once image expansion, cutouts, or conditioning tasks finish.
   - **Helper Documents**: Once cross-app synchronization is verified, close secondary temporary documents cleanly without dialog prompts.

7. **No Unsolicited Video Renders / Gated Production Exports**:
   - Do not render final `.mp4`/`.mov` video exports or final production PNG/JPG/PDF deliverables unless explicitly requested by the user. Save native `.ai`, `.aep`, or `.indd` project files and keep the active composition/artboard open.

8. **Verbatim Content & Pre-Flight Integrity**:
   - Preserve all client copy character-for-character and run automated QC / preflight checks (`design_workflow_preflight` / `design-qc-visual-diff`) before finalizing deliverables.
