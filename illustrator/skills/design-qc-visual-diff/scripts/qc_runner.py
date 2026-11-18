#!/usr/bin/env python3
"""
Design QC Runner
Executes Illustrator document audits, parses results, formats reports,
and optionally draws on-canvas visual diff markers.
"""

import os
import sys
import json
import argparse
import subprocess
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent

def run_applescript(script_str: str) -> str:
    cmd = ["osascript", "-e", script_str]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"AppleScript error: {res.stderr.strip()}")
    return res.stdout.strip()

def audit_illustrator_document(draw_markers=False):
    jsx_path = SKILL_DIR / "qc_auditor.jsx"
    as_code = f'''
tell application "Adobe Illustrator"
    set js to read POSIX file "{jsx_path}"
    return do javascript js
end tell
'''
    print("▶ Running Illustrator Document QC Audit...")
    run_applescript(as_code)

    report_file = Path("/tmp/qc_audit_output.json")
    if not report_file.exists():
        print("Error: QC audit output file not found.")
        sys.exit(1)

    with open(report_file, "r", encoding="utf-8", errors="replace") as f:
        data = json.load(f)

    if "error" in data:
        print(f"\n⚠️  {data['error']}")
        return data

    # Format findings
    print("\n" + "=" * 65)
    print(f"DOCUMENT AUDIT REPORT: {data.get('docName', 'Unknown')}")
    stats = data.get("stats", {})
    print(f"Total Artboards: {data.get('artboardsCount', 0)} | Total Objects: {stats.get('totalPageItems', 0)}")
    print("=" * 65)

    issues = data.get("issues", [])
    if not issues:
        print("\n✨ ALL CHECKS PASSED: No critical errors, label mismatches, or typos found!\n")
        return data

    criticals = [i for i in issues if i["severity"] == "CRITICAL"]
    warnings = [i for i in issues if i["severity"] == "WARNING"]
    infos = [i for i in issues if i["severity"] == "INFO"]

    print(f"\nAudit Summary: {len(criticals)} Critical | {len(warnings)} Warnings | {len(infos)} Notices\n")

    if criticals:
        print("🚨 CRITICAL BLOCKS (Must fix before client review):")
        for idx, c in enumerate(criticals, 1):
            ab_str = f"Artboard {c['artboard']}" if c['artboard'] > 0 else "Document-Wide"
            print(f"  [{idx}] [{c['category']}] [{ab_str}] {c['title']}")
            print(f"      ↳ {c['details']}")

    if warnings:
        print("\n⚠️ WARNINGS & INCONSISTENCIES:")
        for idx, w in enumerate(warnings, 1):
            ab_str = f"Artboard {w['artboard']}" if w['artboard'] > 0 else "Document-Wide"
            print(f"  [{idx}] [{w['category']}] [{ab_str}] {w['title']}")
            print(f"      ↳ {w['details']}")

    if infos:
        print(f"\nℹ️ CLEANLINESS NOTICES: {len(infos)} unpainted/empty items detected.")

    # Draw markers if requested
    if draw_markers:
        markers_data = [i for i in issues if i.get("bounds")]
        if markers_data:
            with open("/tmp/qc_markers_to_draw.json", "w") as mf:
                json.dump(markers_data, mf)
            marker_jsx = SKILL_DIR / "mark_diff_in_illustrator.jsx"
            as_mark = f'''
tell application "Adobe Illustrator"
    set js to read POSIX file "{marker_jsx}"
    return do javascript js
end tell
'''
            print("\n🎨 Injected [QC_DIFF_MARKERS] layer into Illustrator with highlight pins!")
            run_applescript(as_mark)

    return data

def main():
    parser = argparse.ArgumentParser(description="Design QC Runner")
    parser.add_argument("--active", action="store_true", default=True, help="Audit active open Illustrator document")
    parser.add_argument("--markers", action="store_true", help="Draw on-canvas visual diff markers in Illustrator")
    args = parser.parse_args()

    audit_illustrator_document(draw_markers=args.markers)

if __name__ == "__main__":
    main()
