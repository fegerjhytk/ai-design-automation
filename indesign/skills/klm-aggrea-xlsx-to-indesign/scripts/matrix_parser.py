#!/usr/bin/env python3
"""
matrix_parser.py: Zero-dependency parser for Excel feature matrices (.xlsx) using built-in
zipfile and xml.etree.ElementTree. Generates normalized JSON for InDesign ExtendScript
batch publishing and 100% bi-directional QA auditing.
"""

import argparse
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

NS = {
    'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

def col_str_to_idx(col_str):
    """Convert column string like 'A', 'B', 'AA' to 1-based integer index."""
    idx = 0
    for ch in col_str:
        idx = idx * 26 + (ord(ch.upper()) - ord('A') + 1)
    return idx

def parse_matrix_native(xlsx_path, sheet_name=None, lang="EN", out_path=None):
    if not os.path.exists(xlsx_path):
        print(f"Error: File not found: {xlsx_path}", file=sys.stderr)
        sys.exit(1)

    with zipfile.ZipFile(xlsx_path, "r") as z:
        # 1. Read workbook.xml to map sheet names to sheet files
        sheet_target_file = "xl/worksheets/sheet1.xml"
        if "xl/workbook.xml" in z.namelist():
            wb_tree = ET.fromstring(z.read("xl/workbook.xml"))
            sheets = wb_tree.findall(f".//{{{NS['main']}}}sheet")
            sheet_map = {}
            for s in sheets:
                s_name = s.attrib.get('name')
                s_id = s.attrib.get('sheetId')
                r_id = s.attrib.get(f"{{{NS['r']}}}id", f"rId{s_id}")
                sheet_map[s_name] = s_id

            if sheet_name and sheet_name in sheet_map:
                s_id = sheet_map[sheet_name]
                sheet_target_file = f"xl/worksheets/sheet{s_id}.xml"
                if sheet_target_file not in z.namelist():
                    sheet_target_file = "xl/worksheets/sheet1.xml"

        # 2. Read shared strings
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            sstree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in sstree.findall(f"{{{NS['main']}}}si"):
                text = "".join(t.text for t in si.findall(f".//{{{NS['main']}}}t") if t.text)
                shared_strings.append(text)

        # 3. Read sheet XML
        if sheet_target_file not in z.namelist():
            # Fallback to first sheet in list
            sheet_files = [f for f in z.namelist() if f.startswith("xl/worksheets/sheet") and f.endswith(".xml")]
            sheet_target_file = sheet_files[0] if sheet_files else "xl/worksheets/sheet1.xml"

        stree = ET.fromstring(z.read(sheet_target_file))

        # Extract all rows into grid: row_idx -> {col_idx -> string_value}
        grid = {}
        for r in stree.findall(f".//{{{NS['main']}}}row"):
            r_idx = int(r.attrib['r'])
            grid[r_idx] = {}
            for c in r.findall(f"{{{NS['main']}}}c"):
                ref = c.attrib['r']
                col_match = re.match(r"([A-Za-z]+)([0-9]+)", ref)
                if not col_match:
                    continue
                col_str = col_match.group(1)
                col_idx = col_str_to_idx(col_str)

                val = ""
                v = c.find(f"{{{NS['main']}}}v")
                t_attr = c.attrib.get('t')

                if v is not None and v.text is not None:
                    if t_attr == 's':
                        idx = int(v.text)
                        val = shared_strings[idx] if idx < len(shared_strings) else ""
                    else:
                        val = v.text
                elif c.find(f".//{{{NS['main']}}}t") is not None:
                    val = c.find(f".//{{{NS['main']}}}t").text or ""

                grid[r_idx][col_idx] = val.strip()

    # Detect header row with company names
    company_cols = {}
    header_row_idx = None

    for r_idx in sorted(grid.keys()):
        if r_idx > 25:
            break
        row_dict = grid[r_idx]
        named_cells = [(c_idx, val) for c_idx, val in row_dict.items() if val and len(val) > 1]
        if len(named_cells) >= 10:
            header_row_idx = r_idx
            for c_idx, val in named_cells:
                l_val = val.lower()
                if l_val not in ["category", "features", "description", "item", "id", "#", "french", "english", "notes"]:
                    company_cols[c_idx] = val
            if company_cols:
                break

    if not company_cols:
        print("Error: Could not automatically detect company columns in sheet.", file=sys.stderr)
        sys.exit(1)

    print(f"Detected {len(company_cols)} companies at row {header_row_idx}:")
    for c_idx, name in sorted(company_cols.items()):
        print(f"  Col {c_idx}: {name}")

    color_map = {
        "3": "Green RGB",
        "2": "Orange RGB",
        "1": "Grey RGB",
        "x": "Grey RGB",
        "X": "Grey RGB",
        "": "Grey RGB"
    }

    prefix = "FR_NDC_Aggregator_" if lang.upper() == "FR" else "EN_NDC_Aggregator_"

    batch_data = {}
    for col_idx, comp_name in company_cols.items():
        batch_data[comp_name] = {
            "company": comp_name,
            "filename": f"{prefix}{comp_name}",
            "row_colors": {}
        }

    # Map feature rows and ratings
    table_row_counter = 1
    for r_idx in sorted(grid.keys()):
        if r_idx <= header_row_idx:
            continue
        row_dict = grid[r_idx]
        has_content = any(row_dict.get(c) for c in range(1, 6))
        if not has_content:
            continue

        for col_idx, comp_name in company_cols.items():
            val_str = row_dict.get(col_idx, "").strip()
            swatch_name = color_map.get(val_str, "Grey RGB")
            batch_data[comp_name]["row_colors"][str(table_row_counter)] = swatch_name

        table_row_counter += 1

    print(f"Mapped {table_row_counter - 1} feature rows per company.")

    if out_path:
        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(batch_data, f, indent=2, ensure_ascii=False)
        print(f"Successfully saved normalized data to: {out_path}")

    return batch_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Zero-dependency Excel matrix parser for InDesign batch publishing.")
    parser.add_argument("--xlsx", required=True, help="Path to input .xlsx file")
    parser.add_argument("--sheet", default=None, help="Sheet name (defaults to active sheet)")
    parser.add_argument("--lang", default="EN", choices=["EN", "FR", "en", "fr"], help="Output language prefix (EN or FR)")
    parser.add_argument("--out", default="batch_company_data.json", help="Path for output JSON")
    args = parser.parse_args()

    parse_matrix_native(args.xlsx, args.sheet, args.lang, args.out)
