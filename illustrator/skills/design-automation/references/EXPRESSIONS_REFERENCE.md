# Design Automation: After Effects Expressions Reference (Zero-Keyframe Architecture)

This document catalogs the production-verified, zero-keyframe ExtendScript expressions for Adobe After Effects 2026.
All animations are driven by math and layer inPoints, completely eliminating keyframe clutter on the timeline while remaining 100% human-editable via Slider Controls or simple variable tweaks.

---

## 1. Kinetic Pop & Inertial Bounce (`Scale` — Zero Keyframes)
*Apply to Scale property (`Alt + Click` on stopwatch):*
```javascript
// Kinetic Pop with Zero Keyframes
var t = time - inPoint;
var dur = 0.35; // duration of initial scale pop
var amp = 10.0; // bounce amplitude
var freq = 3.5; // bounce speed / frequency

if (t < 0) {
    [0, 0];
} else if (t < dur) {
    var s = easeOut(t, 0, dur, 0, 100);
    [s, s];
} else {
    var decay = Math.exp(-5.0 * (t - dur));
    var bounce = Math.sin((t - dur) * freq * Math.PI * 2) * amp * decay;
    [100 + bounce, 100 + bounce];
}
```

---

## 2. Organic Floating Wave Buoyancy (`Position` — Zero Keyframes)
*Apply to Position property (`Alt + Click` on stopwatch):*
```javascript
// Smooth ambient floating drift
var t = Math.max(0, time - inPoint);
var blend = Math.min(1.0, t / 0.4);
var ctrl = null;
try { ctrl = thisComp.layer("[MOTION_CONTROLLER]"); } catch(e) {}
var amp = ctrl ? ctrl.effect("Buoyancy Amplitude")("Slider") : 6.0;
var spd = ctrl ? ctrl.effect("Buoyancy Speed")("Slider") : 1.4;
var seed = index * 1.37;
var yOffset = Math.sin(t * spd * Math.PI * 2 + seed) * amp * blend;
[value[0], value[1] + yOffset];
```

---

## 3. Kinetic Word/Card Slide-In (`Position` — Zero Keyframes)
*Apply to Position property:*
```javascript
// Smooth slide from left or bottom with elastic settle
var t = time - inPoint;
var dur = 0.4;
var startOffset = [0, 80]; // Slide up from +80px
if (t <= 0) {
    value + startOffset;
} else if (t < dur) {
    var p = easeOut(t, 0, dur, 1, 0);
    value + [startOffset[0] * p, startOffset[1] * p];
} else {
    value;
}
```

---

## 4. Pulsing Call-To-Action Attention Grabber (`Scale`)
*Apply to CTA text or button:*
```javascript
// Rhythmic 2% heartbeat pulse
var t = Math.max(0, time - inPoint);
var s = Math.sin(t * 3.2) * 2.2;
[value[0] + s, value[1] + s];
```

---

## 5. Marker-Driven Auto Fade Out (`Opacity`)
*Apply to Opacity property:*
```javascript
// Automatically fades in at inPoint and fades out before outPoint
var fadeIn = 0.25;
var fadeOut = 0.3;
if (time < inPoint + fadeIn) {
    linear(time, inPoint, inPoint + fadeIn, 0, 100);
} else if (time > outPoint - fadeOut) {
    linear(time, outPoint - fadeOut, outPoint, 100, 0);
} else {
    100;
}
```
