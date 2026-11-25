# Zigma Commercial Video Expressions Reference

This document provides ready-to-copy ExtendScript expressions optimized for Adobe After Effects 2026+.

---

## 1. 3D Badge / Container Buoyant Floating Wave (`Position`)

* **Target**: Any badge graphic (PNG pill, 3D bubble, sticker container).
* **Behavior**: Gentle organic vertical and horizontal drift with unique layer seeding.

```javascript
var t = Math.max(0, time - inPoint);
var blend = Math.min(1.0, t / 0.4);
var seed = index * 1.37;
var xW = Math.sin(t * 2.1 + seed) * 4.0 * blend;
var yW = Math.cos(t * 1.6 + seed) * 6.0 * blend;
value + [xW, yW, 0];
```

---

## 2. 3D Badge Liquid Sway Tilt (`Rotation`)

* **Target**: Badge graphic.
* **Behavior**: Subtle $\pm 2.5^\circ$ organic rotation simulating air/water suspension.

```javascript
var t = Math.max(0, time - inPoint);
var blend = Math.min(1.0, t / 0.4);
var seed = index * 0.95;
value + Math.sin(t * 1.8 + seed) * 2.5 * blend;
```

---

## 3. 3D Badge Volume Breathing (`Scale` — 2D Safe)

* **Target**: Badge graphic.
* **Behavior**: Subtle $2\%$ volume breathing that strictly maintains 2D negative flip scale (`[-8%, -8%]`).

```javascript
var t = Math.max(0, time - inPoint);
var blend = Math.min(1.0, t / 0.4);
var seed = index * 1.1;
var s = Math.sin(t * 2.3 + seed) * 0.02 * blend;
[value[0] * (1 + s), value[1] * (1 + s)];
```

---

## 4. Text Callout Floating Wave (`Position`)

* **Target**: Parent feature callout text layer.
* **Behavior**: Smooth drift with $0.4	ext{s}$ ease-in. Generates natural parallax motion between parent text and child badge.

```javascript
var t = Math.max(0, time - inPoint);
var blend = Math.min(1.0, t / 0.4);
var seed = index * 1.45;
var xW = Math.cos(t * 1.4 + seed) * 2.5 * blend;
var yW = Math.sin(t * 1.9 + seed) * 4.0 * blend;
value + [xW, yW, 0];
```

---

## 5. CTA Button Rhythmic Pulse (`Scale`)

* **Target**: `ORDER NOW` text layer and `CTA_BUTTON_STROKE` shape layer.
* **Behavior**: Synchronized $1.8\%$ breathing pulse that draws focus to the final action.

```javascript
var t = Math.max(0, time - inPoint);
var blend = Math.min(1.0, t / 0.5);
var s = Math.sin(t * 3.2) * 1.8 * blend;
[value[0] + s, value[1] + s];
```
