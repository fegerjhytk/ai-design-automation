---
name: canva
description: >-
  Multi-account Canva integration for Antigravity. Create, generate, inspect, edit,
  autofill, and export Canva designs, manage brand kits and assets, remove backgrounds,
  separate image layers, and switch between Personal and Company accounts.
---

# Canva MCP Skill Guide

Use this skill whenever the user asks to create, modify, inspect, or automate designs, presentations, social media posts, brand templates, or visual assets in Canva, or switch between their Personal and Company Canva accounts.

## Account Management

The Canva MCP plugin uses an isolated multi-account store in `~/.mcp-auth/accounts/`:
- **Check Account Status**: Run `canva-account status` via `run_command`.
- **Switch Account**: Run `canva-account switch personal` or `canva-account switch company`.
- **Login/Re-auth**: Run `canva-account login <personal|company>` if a session expires.

## Core Capabilities & Tool Mapping

### 1. Searching & Inspecting Designs
- `search-designs`: Locate existing documents, presentations, and graphics by keyword or date.
- `get-design`: Retrieve design metadata and edit URL.
- `get-design-pages`: Inspect pages and individual slide structure.
- `get-design-content`: Read text and element contents from a design.
- `get-design-thumbnail`: Get visual preview URLs for designs.

### 2. Creating & Generating Designs
- `generate-design`: Generate complete presentations, social graphics, and documents from a text prompt.
- `create-design`: Create an empty canvas with specified dimensions or doc types.
- `create-design-from-brand-template`: Spin up designs adhering to brand guidelines.
- `create-design-from-candidate`: Select and finalize candidate design generations.

### 3. Editing & Automation
- `start-editing-transaction`: Begin atomic editing session on a design.
- `perform-editing-operations`: Apply batch modifications (text, shapes, positions).
- `commit-editing-transaction` / `cancel-editing-transaction`: Finalize or discard edits.
- `autofill-design`: Automatically populate brand template fields with structured tabular data.
- `resize-design`: Adapt designs to new aspect ratios (e.g., 16:9 to 9:16).
- `merge-designs`: Combine multiple designs or append slides.

### 4. AI & Media Processing
- `generate-image`: Create visual assets with Canva's text-to-image AI.
- `remove-background`: Erase backgrounds from photos and product shots.
- `separate-image-layers`: Extract foreground subjects and background plates into separate layers.
- `upload-asset-from-url`: Import external assets directly into Canva's asset library.

### 5. Exporting & Sharing
- `export-design`: Export finished designs to PDF, PNG, JPG, PPTX, or MP4.
- `get-export-formats`: Check supported export types for a design.
- `list-comments` & `comment-on-design`: Collaborate on team review workflows.
