# Typography Contracts & Layout Rules for InDesign Matrix Publishing

When batch-generating corporate feature matrixes (such as Air France–KLM NDC Aggregator Overview documents):

---

## 1. Font Families & PostScript Names

Adobe InDesign references fonts by their compound `Family\tStyle` tab-delimited string:
- **Montserrat Regular:** `app.fonts.itemByName("Montserrat\tRegular")`
- **Montserrat SemiBold:** `app.fonts.itemByName("Montserrat\tSemiBold")`
- **Montserrat Medium:** `app.fonts.itemByName("Montserrat\tMedium")`

Always verify font installation status before applying:
```javascript
var font = app.fonts.itemByName("Montserrat\tRegular");
if (font.isValid && font.status === FontStatus.INSTALLED) {
    targetText.appliedFont = font;
}
```

---

## 2. Point Sizes, Leading, & Kerning Tokens

| Element | Font Style | Point Size | Leading | Tracking | Kerning Method | Justification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Document Cover Title** | Montserrat SemiBold | 22.0 pt | 26.0 pt | 0 | Metrics | Left |
| **Document Subtitle / Date** | Montserrat Medium | 10.0 pt | 14.0 pt | 0 | Metrics | Left |
| **Table Category Banners** | Montserrat SemiBold | 7.0 pt | 9.0 pt | 10 | Metrics | Left |
| **Table Feature Rows (Col 0)**| Montserrat Regular | 6.0 pt | 8.0 pt | 0 | Metrics | Left |
| **Rating Dots (Col 2)** | Embedded Graphic Oval | 8.0 pt diameter | — | — | — | Center |
| **Footnote Line 1** | Montserrat Regular | 5.5 pt | Leading.AUTO | 0 | Metrics | Left |
| **Footnote Line 2** | Montserrat Regular | 5.5 pt | 5.0 pt | 0 | Metrics | Left |
| **Footnote Line 3+** | Montserrat Regular | 5.5 pt | 8.0 pt | 0 | Metrics | Left |

---

## 3. Table Structure Invariants

- **Fixed Matrix Row Count:** 53 rows on Page 2 must remain on Page 2. Any unintended text frame overset (`overflows == true`) will push row 53 to Page 3, breaking the entire 2-page editorial spread.
- **Cell Insets (Padding):**
  - Table 0 Col 0 (Feature descriptions): `topInset: 2 pt`, `bottomInset: 2 pt`, `leftInset: 4 pt`, `rightInset: 4 pt`
  - Table 0 Col 2 (Status dot oval container): `topInset: 1 pt`, `bottomInset: 1 pt`, `leftInset: 0 pt`, `rightInset: 0 pt`
- **Rating Swatch Tokens:**
  - `3` ➔ `"Green RGB"` (`#00A651` / Available)
  - `2` ➔ `"Orange RGB"` (`#F7931E` / Work in Progress)
  - `1`, `x`, empty ➔ `"Grey RGB"` (`#A6A6A6` / Unavailable)
