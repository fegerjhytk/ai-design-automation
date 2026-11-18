#!/usr/bin/env python3
"""
convert_pipeline.py

Turnkey automated conversion pipeline:
1. Detects active document in Adobe Illustrator.
2. Determines destination path (beside .ai file by default, or user-specified --out).
3. Executes reference rendering and structured artwork extraction into an isolated temp directory.
4. Builds native, editable PowerPoint (.pptx) presentation.
5. Purges all temporary caches and intermediate files immediately.
6. Delivers only the final .pptx presentation.

Usage:
    uv run --with python-pptx --with pillow python3 convert_pipeline.py [--out /path/to/custom.pptx]
"""

import os
import sys
import shutil
import tempfile
import subprocess
import argparse
from pathlib import Path

SKILL_SCRIPTS_DIR = Path("/Users/admin/.gemini/config/skills/illustrator-to-powerpoint/scripts")


def run_osascript(cmd):
    res = subprocess.run(["osascript", "-e", cmd], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"AppleScript error: {res.stderr.strip()}")
    return res.stdout.strip()


def get_active_illustrator_doc():
    script = '''
tell application "Adobe Illustrator"
    if (count of documents) > 0 then
        set docName to name of current document
        try
            set docPath to (POSIX path of (file path of current document as string))
        on error
            set docPath to ""
        end try
        return docName & "|||" & docPath
    else
        return "NO_DOC"
    end if
end tell
'''
    out = run_osascript(script)
    if out == "NO_DOC" or not out:
        raise RuntimeError("No active document found in Adobe Illustrator. Please open a document first.")
    parts = out.split("|||")
    doc_name = parts[0].strip()
    doc_path = parts[1].strip() if len(parts) > 1 else ""
    return doc_name, doc_path


def main():
    parser = argparse.ArgumentParser(description="Convert open Illustrator document to native PowerPoint")
    parser.add_argument("--out", "-o", default=None, help="Custom output .pptx path. Defaults to beside .ai file.")
    parser.add_argument("--keep-cache", action="store_true", help="Keep temporary cache (default: purge all caches).")
    args = parser.parse_args()

    doc_name, doc_path = get_active_illustrator_doc()
    print(f"Active Illustrator document: {doc_name}")
    if doc_path:
        print(f"Source file path: {doc_path}")

    # Determine output destination
    if args.out:
        final_out = Path(args.out).expanduser().resolve()
    elif doc_path and os.path.exists(doc_path):
        source_p = Path(doc_path)
        final_out = source_p.parent / f"{source_p.stem}.pptx"
    else:
        stem = Path(doc_name).stem
        final_out = Path.home() / "Desktop" / f"{stem}.pptx"

    final_out.parent.mkdir(parents=True, exist_ok=True)
    print(f"Target PPTX destination: {final_out}")

    # Create isolated temp workspace
    temp_dir = Path(tempfile.mkdtemp(prefix="ai_to_pptx_"))
    working_dir = temp_dir / "Working"
    ref_dir = temp_dir / "Reference-renders"
    working_dir.mkdir(parents=True, exist_ok=True)
    ref_dir.mkdir(parents=True, exist_ok=True)

    try:
        manifest_path = working_dir / "extracted_artwork.json"
        
        # 1. Run manifest extraction
        extract_jsx = SKILL_SCRIPTS_DIR / "extract_artwork_manifest.jsx"
        print("Extracting structured artwork manifest from Illustrator...")
        res = subprocess.run([
            "osascript", "-e",
            f'tell application "Adobe Illustrator" to do javascript (POSIX file "{extract_jsx}")'
        ], capture_output=True, text=True)
        
        if res.returncode != 0:
            raise RuntimeError(f"Manifest extraction failed: {res.stderr.strip()}")

        # The JSX writes to ~/Desktop/Conversion/Working/extracted_artwork.json by default
        default_manifest = Path.home() / "Desktop" / "Conversion" / "Working" / "extracted_artwork.json"
        if default_manifest.exists():
            shutil.copy(default_manifest, manifest_path)
        else:
            raise FileNotFoundError(f"Extracted manifest not found at {default_manifest}")

        # 2. Build Native PPTX
        build_script = SKILL_SCRIPTS_DIR / "build_native_pptx.py"
        print("Reconstructing native PowerPoint presentation...")
        build_res = subprocess.run([
            sys.executable, str(build_script),
            "--manifest", str(manifest_path),
            "--out", str(final_out)
        ], capture_output=True, text=True)

        if build_res.returncode != 0:
            raise RuntimeError(f"PPTX build failed: {build_res.stderr.strip()}")

        print(build_res.stdout.strip())

    finally:
        # Purge all caches and temporary directories
        if not args.keep_cache:
            print("Purging all conversion caches and temporary files...")
            shutil.rmtree(temp_dir, ignore_errors=True)
            desktop_conversion = Path.home() / "Desktop" / "Conversion"
            if desktop_conversion.exists():
                shutil.rmtree(desktop_conversion, ignore_errors=True)

    print(f"\n[DONE] Native PowerPoint deliverable successfully created at:\n{final_out}")


if __name__ == "__main__":
    main()
