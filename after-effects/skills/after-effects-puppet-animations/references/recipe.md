# Reading-flow recipes, schema 3

Use recipes to preserve an explicitly reviewed reveal order across artwork with the same prepared unit names. They do not modify Illustrator appearances or replace the target's resting scale/opacity.

```json
{
  "schemaVersion": 3,
  "units": {
    "Left_Logo": {"stage": 0},
    "Left_Christmas": {"stage": 0.1},
    "Left_Day": {"stage": 0.2},
    "Left_Body": {"stage": 1},
    "Right_Container": {"stage": 2},
    "Right_Heading": {"stage": 3},
    "Right_Price_A": {"stage": 4},
    "Right_Price_B": {"stage": 4},
    "Bottom_Ribbon": {"stage": 5},
    "Bottom_Details": {"stage": 6},
    "BG_Base": {"stage": 0, "background": true}
  }
}
```

Use the actual prepared names from the cache manifest. Every target unit must appear exactly once and no stale recipe names may remain. Stages sort numerically; cards within stage 4 sort by horizontal position. Footer details read top-to-bottom within a column, then left-to-right. Geometry is normalized to the actual artboard; no output dimensions are hardcoded.

`--duration` controls total composition time. `--hold-seconds` optionally controls the final static hold. Entrance spacing fills the active interval and limits overlap to neighboring units. Background/ornament breathing continues until the hold boundary and returns to the original scale.

A `background` flag changes the whole-unit AE animation only. It never grants permission to split a clipping group, alter opacity, remove a mask or change a live effect. Use fractional stages when a specific logo → Christmas → Day order must remain explicit.

Legacy v1/v2 property-track recipes and the old extraction script are not replayed by the current ordered-unit runtime. Deliberately migrate them using the target manifest, rather than silently mixing animation engines.
