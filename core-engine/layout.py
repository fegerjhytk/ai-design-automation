"""Template breakpoints and focal-point-aware cover placement; no text rewriting."""
import math

FORMATS = {(1080, 1080): "square-v1", (1080, 1920): "story-v1", (1920, 1080): "landscape-v1"}


def profile_for(width, height):
    try:
        return FORMATS[(width, height)]
    except KeyError:
        raise ValueError("Register a master and policy for this delivery size")


def cover(source_size, box, focal=(0.5, 0.5), target=(0.5, 0.5), subject=None):
    """All layout coordinates use top-left origin. Source/focal/subject normalized.

    subject: optional normalized [x,y,w,h] bounding box that MUST survive cropping.
    The placer converts this top-left result into Illustrator document coordinates.
    """
    width, height = source_size
    x, y, bw, bh = box
    values = [width, height, x, y, bw, bh, *focal, *target]
    if any(not math.isfinite(v) for v in values) or min(width, height, bw, bh) <= 0:
        raise ValueError("Invalid source/placement dimensions")
    if any(not 0 <= v <= 1 for v in (*focal, *target)):
        raise ValueError("Focal and target coordinates must be normalized")
    scale = max(bw / width, bh / height)
    rw, rh = width * scale, height * scale
    left = max(x+bw-rw, min(x, x+bw*target[0]-rw*focal[0]))
    top = max(y+bh-rh, min(y, y+bh*target[1]-rh*focal[1]))
    if subject is not None:
        sx, sy, sw, sh = subject
        if any(not math.isfinite(v) for v in subject) or min(sx, sy) < 0 or min(sw, sh) <= 0 or sx+sw > 1 or sy+sh > 1:
            raise ValueError("Invalid normalized subject box")
        # Shift within cover limits to preserve the entire subject if possible.
        lo_x, hi_x = max(x+bw-rw, x-sx*rw), min(x, x+bw-(sx+sw)*rw)
        lo_y, hi_y = max(y+bh-rh, y-sy*rh), min(y, y+bh-(sy+sh)*rh)
        if lo_x > hi_x+1e-6 or lo_y > hi_y+1e-6:
            return {"needs_expansion": True, "reason": "Cover crop would cut protected subject"}
        left, top = max(lo_x, min(hi_x, left)), max(lo_y, min(hi_y, top))
    return {"needs_expansion": False, "bounds": [left, top, rw, rh], "scale": scale}
