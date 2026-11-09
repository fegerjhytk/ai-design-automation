# Roadmap: AI Design Automation Engine

## Overview

A comprehensive five-phase automation system bringing GSD's disciplined spec-driven development to Adobe Illustrator creative production, batch ads, and multi-format exports.

## Phases

- [x] **Phase 1: Creative Brief & Multi-Ratio Specs** - Lock down copy matrix, aspect ratios (1:1, 9:16, 16:9), and style tokens. (completed 2026-11-08)
- [ ] **Phase 2: Asset Pipeline & Vector Sourcing** - Automated asset acquisition via Magnific vectors and cutout layers.
- [ ] **Phase 3: Illustrator ExtendScript Automation** - Programmatic artboard population via TypeFlow and layout scripts.
- [ ] **Phase 4: Visual QA & Bounds Verification** - Automated linting of artboard bounds, font overflow, and color contrast.
- [ ] **Phase 5: Production Export & Packaging** - Batch rendering via Image Export v2, PDF print plates, and Canva upload.

## Phase Details

### Phase 1: Creative Brief & Multi-Ratio Specs

**Goal**: Establish parameterized copy matrices and design contracts for all creative variants.
**Depends on**: Nothing
**Requirements**: REQ-01, REQ-02
**Success Criteria** (what must be TRUE):

  1. Multi-ratio layout contract (1:1, 9:16, 16:9) is formally defined in JSON/markdown.
  2. Headline, body copy, and CTA length limits are validated against artboard bounding limits.
  3. Brand color palette swatches and font families are mapped to valid system fonts.

**Plans**: 1 plan

Plans:

- [x] 01-01: Create copy parameter matrix and layout constraint definitions

### Phase 2: Asset Pipeline & Vector Sourcing

**Goal**: Source and validate all vector icons, background cutouts, and logos.
**Depends on**: Phase 1
**Requirements**: REQ-03, REQ-04
**Success Criteria** (what must be TRUE):

  1. Vector icons are formatted as editable Illustrator GroupItems.
  2. Background cutouts have clean alphas and matching aspect ratio padding.

**Plans**: 1 plan

Plans:

- [ ] 02-01: Build asset resolution and vector normalization pipeline

### Phase 3: Illustrator ExtendScript Automation

**Goal**: Run headless or live Illustrator layout generation through ExtendScript.
**Depends on**: Phase 2
**Requirements**: REQ-05, REQ-06
**Success Criteria** (what must be TRUE):

  1. Artboards are populated with zero manual positioning.
  2. Dynamic text wrapping handles varying copy lengths without clip.

**Plans**: 1 plan

Plans:

- [ ] 03-01: Implement TypeFlow ExtendScript integration wrapper

### Phase 4: Visual QA & Bounds Verification

**Goal**: Run automated visual sanity checks on all generated artboards.
**Depends on**: Phase 3
**Requirements**: REQ-07, REQ-08
**Success Criteria** (what must be TRUE):

  1. Stray vector points and unpainted paths are eliminated.
  2. Contrast ratios for CTA buttons meet accessibility and visibility benchmarks.

**Plans**: 1 plan

Plans:

- [ ] 04-01: Create automated visual linting script

### Phase 5: Production Export & Packaging

**Goal**: Batch export final creatives into production formats.
**Depends on**: Phase 4
**Requirements**: REQ-09, REQ-10
**Success Criteria** (what must be TRUE):

  1. WebP and PNG 300 DPI exports generated for all active ratios.
  2. Print PDF plates comply with CMYK bleed standards.

**Plans**: 1 plan

Plans:

- [ ] 05-01: Execute batch export and packaging pipeline
