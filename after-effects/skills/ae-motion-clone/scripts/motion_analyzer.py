#!/usr/bin/env python3
"""
General Motion Profile & Choreography Analyzer
Translates reference video motion characteristics into physical keyframe curves,
archetypes, and recipe JSON for Adobe After Effects.
"""

import os
import sys
import json
import argparse
from pathlib import Path

def generate_motion_recipe(reference_path=None, archetype="cascade_drop", target_duration=5.0, 
                           elements_only=True, stagger_delay=0.12, layout="as-is", hold_duration=1.9):
    """
    Generates a motion recipe with exact physics parameters, easing curves,
    and layer type assignments.
    """
    recipe = {
        "archetype": archetype,
        "target_duration": target_duration,
        "elements_only": elements_only,
        "layout": layout,
        "stagger_delay": stagger_delay,
        "hold_duration": hold_duration,
        "physics": {},
        "layer_assignments": {}
    }

    if archetype == "cascade_drop":
        # The Arôme Bakery style: 4-Phase Lifecycle
        # Phase 1: Cascading Drop-In with gravity & air wobble
        # Phase 2: Rest / Hold in presentation layout
        # Phase 3: Cascading Drop-Out through bottom
        # Phase 4: Clean Canvas / Seamless Loop Reset
        recipe["physics"] = {
            "top_y": -600.0,                 # Off-screen starting position above canvas
            "bottom_y": 2100.0,              # Off-screen exit position below canvas
            "fall_duration": 0.65,           # Duration of drop to impact
            "overshoot_px": 30.0,            # Downward compression bounce on impact
            "rebound_px": -8.0,              # Elastic rebound
            "rebound_duration": 0.17,        # Time to rebound
            "settle_duration": 0.14,         # Time to settle to resting position
            "exit_duration": 0.68,           # Downward exit drop duration
            "tilt_angles": [-15.0, 18.0, -20.0, 16.0, -22.0, 20.0, -16.0, 15.0, -14.0], # Dynamic wobble
            "wobble_overshoot_mult": -0.40,  # Rotational counter-wobble on bounce
            "wobble_rebound_mult": 0.15,     # Rotational damping on rebound
            "wobble_exit_mult": -1.60        # Rotational tumble during exit drop
        }
        recipe["layer_behaviors"] = {
            "background": "locked_static",
            "typography": "locked_static" if elements_only else "subtle_slide_up",
            "graphic_elements": "cascade_drop_4phase"
        }

    elif archetype == "carousel_scroll":
        # The Slide 10 style: Infinite Seamless Repeating Marquee / Card Feed
        recipe["physics"] = {
            "direction": "up",               # "up", "down", "left", "right"
            "interpolation": "linear",
            "loop_expression": 'loopOut("cycle");',
            "duplicate_repeats": 2,          # Duplicate sets to ensure stream never empties
            "velocity_mode": "constant"
        }
        recipe["layer_behaviors"] = {
            "background": "locked_static",
            "root_controller": "linear_continuous_scroll",
            "cards": "parented_repeating_stream"
        }

    elif archetype == "elastic_pop":
        recipe["physics"] = {
            "scale_keyframes": [
                {"time": 0.0, "scale": [0, 0]},
                {"time": 0.50, "scale": [115, 115]},
                {"time": 0.68, "scale": [96, 96]},
                {"time": 0.85, "scale": [100, 100]}
            ],
            "rotation_kick": [-12.0, 15.0, -8.0, 10.0]
        }
        recipe["layer_behaviors"] = {
            "background": "locked_static",
            "typography": "locked_static" if elements_only else "scale_fade",
            "graphic_elements": "elastic_spring_pop"
        }

    elif archetype == "stagger_slide":
        recipe["physics"] = {
            "slide_offset_x": 0.0,
            "slide_offset_y": 400.0,
            "ease_in_influence": 85.0,
            "ease_out_influence": 75.0
        }
        recipe["layer_behaviors"] = {
            "background": "locked_static",
            "typography": "locked_static" if elements_only else "stagger_slide",
            "graphic_elements": "stagger_slide"
        }

    return recipe

def main():
    parser = argparse.ArgumentParser(description="Analyze reference animation and generate general motion recipe JSON.")
    parser.add_argument("--ref", "-r", default=None, help="Path to reference video/GIF or web URL")
    parser.add_argument("--archetype", "-a", default="cascade_drop", 
                        choices=["cascade_drop", "carousel_scroll", "elastic_pop", "stagger_slide"])
    parser.add_argument("--duration", "-d", type=float, default=5.0, help="Target composition duration in seconds")
    parser.add_argument("--elements-only", action="store_true", default=True, help="Don't animate text layers, only graphic elements")
    parser.add_argument("--include-text", action="store_true", help="Include text layers in animation")
    parser.add_argument("--layout", "-l", default="as-is", choices=["as-is", "stacked"], 
                        help="'as-is' preserves existing layer positions; 'stacked' arranges elements in an overlapping cluster filling middle/bottom")
    parser.add_argument("--stagger", "-s", type=float, default=0.12, help="Stagger delay between cascading layers in seconds")
    parser.add_argument("--hold", type=float, default=1.9, help="Hold duration at resting layout in seconds")
    parser.add_argument("--output", "-o", default="/tmp/motion_recipe.json", help="Path to output recipe JSON")
    args = parser.parse_args()

    elements_only = False if args.include_text else True

    recipe = generate_motion_recipe(
        reference_path=args.ref,
        archetype=args.archetype,
        target_duration=args.duration,
        elements_only=elements_only,
        stagger_delay=args.stagger,
        layout=args.layout,
        hold_duration=args.hold
    )

    with open(args.output, "w") as f:
        json.dump(recipe, f, indent=2)

    print(f"✓ Motion recipe generated: {args.output}")
    print(f"   Archetype: {recipe['archetype']} | Duration: {recipe['target_duration']}s | Elements Only: {recipe['elements_only']} | Layout: {recipe['layout']}")

if __name__ == "__main__":
    main()
