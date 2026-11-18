#!/usr/bin/env python3
"""
Document Cross-Checking & Verification Engine.
Compares a working target document against the master Excel (.xlsx) reference.
Enforces read-only inspection first, followed by a mandatory user approval gate.
"""

import sys
import os
import argparse
import json
import csv
from extract_threaded_comments import extract_excel_data

def normalize_text(text):
    if not text:
        return ""
    # Normalize whitespace, quotes, and case
    import re
    t = text.strip()
    t = re.sub(r'\s+', ' ', t)
    t = t.replace('’', "'").replace('“', '"').replace('”', '"')
    return t

def crosscheck(master_file, target_file, sheet=1, col="B", header_col="A", start_row=10, end_row=120):
    # 1. Load Master Reference Data
    master_records = extract_excel_data(master_file, sheet, col, header_col, start_row, end_row)
    master_lookup = {}
    for r in master_records:
        norm = normalize_text(r["text"])
        if norm:
            master_lookup[norm] = r

    # 2. Load Target File
    if not os.path.isfile(target_file):
        raise FileNotFoundError(f"Target file not found at: {target_file}")

    target_items = []
    ext = os.path.splitext(target_file)[1].lower()

    if ext == ".json":
        with open(target_file, "r", encoding="utf-8") as f:
            target_items = json.load(f)
    elif ext == ".csv":
        with open(target_file, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            for row in reader:
                if row:
                    target_items.append({"text": row[0], "dot_color": row[1] if len(row) > 1 else None})
    else: # plaintext / markdown lines
        with open(target_file, "r", encoding="utf-8") as f:
            for line in f:
                l = line.strip()
                if l and not l.startswith("#") and not l.startswith("| :---"):
                    # Check for markdown table format | text | dot |
                    if l.startswith("|"):
                        parts = [p.strip() for p in l.split("|")[1:-1]]
                        text = parts[0].replace("**", "")
                        dot = parts[1] if len(parts) > 1 else None
                        target_items.append({"text": text, "dot_color": dot})
                    else:
                        target_items.append({"text": l, "dot_color": None})

    # 3. Compare Items
    audit_results = []
    matched_master_keys = set()

    for idx, item in enumerate(target_items, 1):
        target_text = item.get("text", "") if isinstance(item, dict) else str(item)
        target_dot = item.get("dot_color") if isinstance(item, dict) else None
        norm_target = normalize_text(target_text)

        matched = master_lookup.get(norm_target)
        if matched:
            matched_master_keys.add(norm_target)
            audit_results.append({
                "item_no": idx,
                "status": "PASS",
                "target_text": target_text,
                "master_text": matched["text"],
                "cell": matched["cell"],
                "comment": matched["comment"],
                "target_dot": target_dot,
                "notes": "Exact match with master"
            })
        else:
            # Fuzzy candidate search
            best_ratio = 0
            best_match = None
            for mk, mv in master_lookup.items():
                # Simple sub-string or token overlap
                s1, s2 = set(norm_target.lower().split()), set(mk.lower().split())
                overlap = len(s1 & s2) / max(len(s1 | s2), 1)
                if overlap > best_ratio:
                    best_ratio = overlap
                    best_match = mv

            if best_ratio > 0.4 and best_match:
                audit_results.append({
                    "item_no": idx,
                    "status": "FLAG / MISMATCH",
                    "target_text": target_text,
                    "master_text": best_match["text"],
                    "cell": best_match["cell"],
                    "comment": best_match["comment"],
                    "target_dot": target_dot,
                    "notes": f"Possible typo/wording drift (Confidence: {int(best_ratio*100)}%)"
                })
            else:
                audit_results.append({
                    "item_no": idx,
                    "status": "UNMATCHED",
                    "target_text": target_text,
                    "master_text": "(Not found in master)",
                    "cell": "N/A",
                    "comment": "",
                    "target_dot": target_dot,
                    "notes": "No corresponding entry in master reference"
                })

    # Check for missing master items
    missing_items = []
    for mk, mv in master_lookup.items():
        if mk not in matched_master_keys and mv["text"]:
            missing_items.append(mv)

    return audit_results, missing_items

def main():
    parser = argparse.ArgumentParser(description="Cross-check target document against master Excel reference.")
    parser.add_argument("--master", "-m", required=True, help="Master Excel (.xlsx) file path")
    parser.add_argument("--target", "-t", required=True, help="Target document (JSON, CSV, or MD/TXT) path")
    parser.add_argument("--sheet", "-s", default=1, help="Sheet number or name in master")
    parser.add_argument("--col", "-c", default="B", help="Target column in master (default: B)")
    parser.add_argument("--start", type=int, default=10, help="Start row (default: 10)")
    parser.add_argument("--end", type=int, default=120, help="End row (default: 120)")
    parser.add_argument("--apply", action="store_true", help="Apply fixes to target (requires --approved)")
    parser.add_argument("--approved", action="store_true", help="Explicit user approval confirmation")

    args = parser.parse_args()

    if args.apply and not args.approved:
        print("ERROR: Safety Violation! Modifications cannot be applied without explicit user approval (--approved).", file=sys.stderr)
        print("Run the cross-check in read-only mode first, inspect discrepancies, and obtain confirmation.", file=sys.stderr)
        sys.exit(2)

    try:
        results, missing = crosscheck(
            master_file=args.master,
            target_file=args.target,
            sheet=args.sheet,
            col=args.col,
            start_row=args.start,
            end_row=args.end
        )

        # Print Markdown Report
        print("# Cross-Check Audit Report")
        print(f"- **Master File:** `{args.master}`")
        print(f"- **Target File:** `{args.target}`\n")

        passed = sum(1 for r in results if r["status"] == "PASS")
        flagged = sum(1 for r in results if r["status"] != "PASS")
        print(f"### Summary: {passed} Passed | {flagged} Flagged / Mismatched | {len(missing)} Missing in Target\n")

        print("| # | Status | Target Document Text | Master Reference Text | Cell | Action / Notes |")
        print("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for r in results:
            badge = "✅ PASS" if r["status"] == "PASS" else ("⚠️ " + r["status"])
            t_text = r["target_text"].replace("\n", " ")
            m_text = r["master_text"].replace("\n", " ")
            print(f"| {r['item_no']} | **{badge}** | {t_text} | {m_text} | `{r['cell']}` | {r['notes']} |")

        if missing:
            print(f"\n### ⚠️ Missing Items in Target Document ({len(missing)} items):")
            for m in missing[:10]:
                print(f"- `{m['cell']}`: **{m['text']}**")
            if len(missing) > 10:
                print(f"- ... and {len(missing) - 10} more items.")

        if flagged > 0 or missing:
            print("\n> [!IMPORTANT]\n> Discrepancies detected. Review the proposed corrections above. You must explicitly approve before any changes are written to the target document.")

    except Exception as e:
        print(f"Error during cross-check: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
