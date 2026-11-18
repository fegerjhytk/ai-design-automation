# Case Study: Air France / KLM NDC Aggregator Publication Audit

This reference documents the foundational case study for the `indesign-doc-diff` skill, based on the comparative analysis between `EN_NDC_Aggregator_Aaron Group.indd` and `EN_NDC_Aggregator_template-NOV26.indd`.

---

## 1. Document Comparison (Excluding Copy Content & Dots Color)

When comparing localized client files (e.g. `Aaron Group.indd`) against master publication templates (`template-NOV26.indd`), the auditor checks 7 critical structural and technical dimensions:

### 1.1 Page Count & Structural Layout Shifts
* **Master Template:** 8 pages
* **Client Document:** 9 pages
* **Root Cause:**
  * The NDC functionality status matrix in `Aaron Group` spans **3 full pages** (Pages 2, 3, and 4) with 109 rows across 5 threaded text frames.
  * In the `Template`, the matrix spans only **2 pages** (Pages 2 and 3) with 97 rows across 4 threaded text frames (12 fewer rows).
* **Downstream Ripple Effect:**
  * Because the table requires 3 pages instead of 2, all subsequent sections in `Aaron Group` are offset by **+1 page**:
    * *Description of NDC functionalities*: **Page 5** in Aaron Group vs. **Page 4** in Template.
    * *Description tables*: **Pages 6–8** in Aaron Group vs. **Pages 5–7** in Template.
    * *Back cover*: **Page 9** in Aaron Group vs. **Page 8** in Template.

### 1.2 Table Row Counts & Threading
* **Table 1 (Matrix Table):**
  * Client: **109 rows** threaded across 5 frames (P2 → P2 → P3 → P3 → P4).
  * Template: **97 rows** threaded across 4 frames (P2 → P2 → P3 → P3).
* **Table 4 (Final Description Table):**
  * Client (Page 8): **43 rows**.
  * Template (Page 7): **31 rows**.
* **Tables 2 & 3:** Identical row counts (40 rows and 25 rows respectively in both files).

### 1.3 Legend Object Hierarchy & Grouping
* **Template (Pages 2 & 3):**
  * The bottom status legend (`Available`, `Work in progress`, `Unavailable`) is consolidated into a single **Group** of 6 elements (3 vector circle dots + 3 text labels).
* **Client Document (Pages 2, 3 & 4):**
  * The legend is **ungrouped** into separate individual objects on each page (3 standalone oval shapes + 3 standalone text frames).
  * This inflates the story count to **59 stories** compared to **17 stories** in the template.

### 1.4 Footnote & Frame Differences
* **Client Document (Page 7):**
  * Contains a separate footnote text frame at `[Y: 809 pt, X: 51 pt]` for `*SAF stands for 'Sustainable Aviation Fuel'…`.
* **Template (Page 6):**
  * Does not have this separate frame (the page consists of a single primary text frame).
* **Back Cover Text Frame Height:**
  * Client (Page 9): Frame extends down to `746.8 pt`.
  * Template (Page 8): Frame stops at `695.2 pt`.

### 1.5 Links & Asset Resolution
* **Client Document:**
  * All 4 linked assets (`New RGB.ai` on master spreads, `GettyImages-1168008283 (2).jpg` on the cover) are **NORMAL / Active** in Google Drive.
* **Template:**
  * All 4 links are in a **`LINK_MISSING` (Broken Links)** state, mapped to the original author's local OneDrive path (`/Users/tomboergonje/.../OneDrive-AirFranceKLM/...`).

### 1.6 Fonts & Typeface Engine
* **Template:**
  * Uses TrueType/system **`Montserrat`** (`Regular`, `SemiBold`, `Medium`, `Bold`, `Light`) + `Minion Pro Regular`. All fonts are **`INSTALLED`** (zero missing font alerts).
* **Client Document:**
  * Uses PostScript OpenType references **`Montserrat (OTF)`** (`ExtraLight`, `SemiBold`), which are marked **`NOT_AVAILABLE`** (triggers missing font alert dialogs on open).

### 1.7 Swatches Palette
* **Template:** Clean, minimal document palette with **13 swatches**.
* **Client Document:** Contains **30 swatches**, retaining unused spot colors (`PANTONE 186 C`, `PANTONE 202 C`, `PANTONE 654 C`) and default/legacy RGB swatches (`RGB Blue`, `RGB Cyan`, `RGB Green`, `RGB Magenta`, `RGB Red`, `RGB Yellow`, `Raspberry red RGB`, `r184g214b238 kopie`).

---

## 2. Complete Typography & Spacing Hierarchy Specification

| Hierarchy Level | Applied Font & Weight | Point Size | Leading | Tracking | Alignment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cover Title** | `Montserrat SemiBold` | **22 pt** | Auto (120% / ~26.4 pt) | 0 | Left |
| **Cover Subtitle** | `Montserrat SemiBold` | **11 pt** | Auto (120% / ~13.2 pt) | 0 | Left |
| **Section Heading** | `Montserrat SemiBold` | **11 pt** | Auto (120% / ~13.2 pt) | 0 | Left |
| **Back Cover Tagline** | `Montserrat SemiBold` | **12.5 pt** | Auto (120% / ~15 pt) | 0 | Left |
| **Table Category Banners** | `Montserrat Bold` | **0.1 pt** *(inset header)* | **5 pt** | 0 | Left |
| **Table Column Headers** | `Montserrat Bold` | **7 pt** | Auto | 0 | Center/Left |
| **Table Feature Names** | `Montserrat Medium` | **7 pt** | **Auto** *(Pages 2–3)* / **11 pt** *(Pages 4–7)* | 0 | Left |
| **Table Descriptions** | `Montserrat Regular` | **7 pt** | **9 pt** *(fixed line height)* | 0 | Left |
| **Status Legend Labels** | `Montserrat Regular` | **7 pt** | Auto (~8.4 pt) | 0 | Left |
| **Cover Date Text** | `Montserrat Regular` | **7 pt** | Auto (~8.4 pt) | 0 | Left |
| **Legal / Footnotes / SAF note**| `Montserrat Regular` | **5.5 pt** | Auto (120% / ~6.6 pt) | 0 | Left |

### 2.1 Table Cell Inset Spacing
* **All Cells Across All Tables:**
  * **Top Inset:** **4 pt**
  * **Bottom Inset:** **4 pt**
  * **Left Inset:** **4 pt**
  * **Right Inset:** **4 pt**

### 2.2 Table Column Dimensions
* **Matrix / Status Tables (3 Columns):**
  * Col 1 (Feature Name): **151 pt** (~53.3 mm)
  * Col 2 (AFKL Status): **40.39 pt** (~14.25 mm)
  * Col 3 ([Aggregator] Status): **50.04 pt** (~17.65 mm)
* **Description Tables (2 Columns):**
  * Col 1 (Feature Name): **165.03 pt** (~58.2 mm)
  * Col 2 (Detailed Description): **341.03 pt** (~120.3 mm)

### 2.3 Page Layout & Margins
* **Document Format:** Standard **A4 Portrait** (**595.28 pt × 841.89 pt** / 210 × 297 mm)
* **Cover (Page 1):** Full-bleed margins (**0 pt** all edges; 12 columns with 12 pt gutters)
* **Content Pages (Pages 2–8):**
  * Top Margin: **36 pt** (0.5 in / 12.7 mm)
  * Bottom Margin: **36 pt**
  * Left Margin: **36 pt**
  * Right Margin: **36 pt**
  * Columns: 1 column (gutter: 12 pt)
* **Bleed:** **0 pt** all edges.
