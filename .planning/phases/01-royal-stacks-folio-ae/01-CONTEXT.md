# Phase 01 Context: Royal Stacks Folio AE Project Generation

## 1. Domain & Background
The client project is **Royal Stacks Franchise** (`royalstacksfranchise.com.au`), an Australian gourmet smash burger franchise. The creative agency (Digital Anthropology x Design Drop) created an award-winning franchise digital experience, website design system, campaigns, and brand identity assets.
The current portfolio presentation deck in Figma is being reworked into a high-end, editorial, art-directed motion case study inspired by Creatik's folio benchmark.
The user specifically requested an editable Adobe After Effects (`.aep`) file containing **Slides 3, 5, 7, 9, and 10**, divided by individual compositions per slide, with **all text strictly editable**, and saved to the Desktop.

## 2. Key Decisions
1. **Tooling & Automation Engine:**
   - Use Adobe After Effects 2026 ExtendScript (`.jsx`) executed via AppleScript or AE command runner.
   - ExtendScript creates native `TextLayer` items with `applyToSourceTextItemDocument` / `sourceText.setValue(TextDocument)`, ensuring all typography is 100% editable inside After Effects.
2. **Composition Architecture:**
   - Single master `.aep` file placed at `/Users/admin/Desktop/Royal_Stacks_Folio_Slides.aep`.
   - Master composition: `Master_Folio_Presentation` (sequence of all 5 slides).
   - 5 Individual child compositions:
     - `Slide_03_Website_Showcase`
     - `Slide_05_Brand_Colors`
     - `Slide_07_Elements_and_Icons`
     - `Slide_09_Brand_Identity_Cards`
     - `Slide_10_Franchise_Invitation`
   - Composition specs: `2048 x 1447 px` (standard Figma slide canvas), `30.0 fps`, `10.0 seconds` each.
3. **Asset Handling:**
   - Self-contained asset directory at `/Users/admin/Desktop/Links/AE_Assets/` containing all high-res assets:
     - Cutout burger (`burger_cutout.png`)
     - Polaroids (`polaroid_restaurant.png`, `polaroid_toast.png`)
     - Mascots (`cow_running.png`, `burger_running.png`)
     - Illustrations (`fresh_ingredients.png`)
     - Badges (`badge_cult_following.png`, `badge_since_2016.png`)
     - MacBook frame (`macbook_frame.png`)
     - Full landing page scroll (`landing_page_full.png`)
     - Social campaign cards (`ad_card_15b.png`, `ad_card_notyour.png`)
4. **Color Tokens:**
   - Royal Blue: `#002C8C` `[0.0, 0.1725, 0.5490]`
   - Yellow: `#FEC52A` `[0.9961, 0.7725, 0.1647]`
   - Off White / Cream: `#FEF2E2` `[0.9961, 0.9490, 0.8863]`
   - Gold: `#8B7448` `[0.5451, 0.4549, 0.2824]`
   - Pure White: `#FFFFFF` `[1.0, 1.0, 1.0]`

## 3. Canonical References
- Figma File: `https://www.figma.com/design/lJqLBhUEpoJf4cPCmUM9nH/Royal-Stacks-Franchise-Folio-Case-Study?node-id=2021-463`
- Asana Task: `https://app.asana.com/1/1207128727699916/project/1211948520935849/task/1219010040452295`
- Local Assets: `/Users/admin/Desktop/Links/` and `/Users/admin/Desktop/Links/Archive/`
