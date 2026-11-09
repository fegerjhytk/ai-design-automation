"""Contrast primitive for a trusted raster-verification adapter; stdlib only.

Feed every background pixel under a slot from a text-hidden, color-managed sRGB
render. Checking the full box is conservative. Do not sample a global average.
For this helper, text must be solid, opaque, and use normal blending. Effects,
gradient text, masks, transparency and blend modes require a composite verifier.
"""
import math


def luminance(rgb):
    if len(rgb) != 3 or any(not isinstance(v, (int, float)) or
                            not math.isfinite(v) or v < 0 or v > 255 for v in rgb):
        raise ValueError("Expected finite sRGB channels in 0..255")
    linear = []
    for channel in rgb:
        channel /= 255.0
        linear.append(channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4)
    return sum(a * b for a, b in zip(linear, (0.2126, 0.7152, 0.0722)))


def contrast(foreground, backgrounds, minimum=4.5):
    if not math.isfinite(minimum) or not 1 <= minimum <= 21:
        raise ValueError("Contrast threshold outside 1..21")
    front = luminance(foreground)
    worst, count = 21.0, 0
    for pixel in backgrounds:
        back = luminance(pixel)
        ratio = (max(front, back) + 0.05) / (min(front, back) + 0.05)
        worst, count = min(worst, ratio), count + 1
    if not count:
        raise ValueError("No background pixels supplied")
    return {"passed": worst >= minimum, "minimum_ratio": worst,
            "threshold": minimum, "pixels_checked": count}
