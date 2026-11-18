#!/usr/bin/env python3
"""
Zero-dependency Excel (.xlsx) cell text & threaded comment / note extractor.
Parses openxml zip structures directly via standard library (zipfile + xml.etree).
"""

import sys
import os
import zipfile
import argparse
import json
import csv
import xml.etree.ElementTree as ET

def extract_excel_data(file_path, sheet_name_or_idx=1, target_col="B", header_col="A", start_row=1, end_row=200):
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Excel file not found at: {file_path}")

    with zipfile.ZipFile(file_path, 'r') as z:
        # 1. Parse Shared Strings (xl/sharedStrings.xml)
        sst = []
        if 'xl/sharedStrings.xml' in z.namelist():
            sst_xml = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns_main = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in sst_xml.findall('ns:si', ns_main):
                text = ''.join(t.text for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text)
                sst.append(text)

        # 2. Identify target sheet XML and index
        wb_xml = ET.fromstring(z.read('xl/workbook.xml'))
        ns_wb = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheets = wb_xml.findall('.//ns:sheet', ns_wb)
        
        target_sheet_idx = 1
        if isinstance(sheet_name_or_idx, int):
            target_sheet_idx = sheet_name_or_idx
        else:
            for idx, s in enumerate(sheets, 1):
                if s.attrib.get('name', '').lower() == str(sheet_name_or_idx).lower():
                    target_sheet_idx = idx
                    break

        sheet_file = f'xl/worksheets/sheet{target_sheet_idx}.xml'
        if sheet_file not in z.namelist():
            # Fallback to first worksheet found
            ws_files = [f for f in z.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml')]
            if not ws_files:
                raise ValueError("No worksheet XML files found in workbook.")
            sheet_file = ws_files[0]

        # 3. Read Worksheet Cells
        sheet_xml = ET.fromstring(z.read(sheet_file))
        cells = {}
        for row in sheet_xml.findall('.//ns:row', ns_wb):
            for c in row.findall('ns:c', ns_wb):
                ref = c.attrib.get('r')
                t = c.attrib.get('t')
                v = c.find('ns:v', ns_wb)
                val = ''
                if v is not None and v.text is not None:
                    if t == 's':
                        idx = int(v.text)
                        val = sst[idx] if idx < len(sst) else ''
                    else:
                        val = v.text
                elif c.find('ns:is', ns_wb) is not None:
                    val = ''.join(t.text for t in c.find('ns:is', ns_wb).iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text)
                cells[ref] = val

        # 4. Read Threaded Comments (xl/threadedComments/threadedComment{idx}.xml)
        tc_map = {}
        tc_file = f'xl/threadedComments/threadedComment{target_sheet_idx}.xml'
        if tc_file in z.namelist():
            tc_xml = ET.fromstring(z.read(tc_file))
            for tc in tc_xml.findall('{http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments}threadedComment'):
                ref = tc.attrib.get('ref')
                text_elem = tc.find('{http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments}text')
                text = text_elem.text if text_elem is not None and text_elem.text else ''
                if text.strip():
                    tc_map.setdefault(ref, []).append(text.strip())

        # 5. Read Legacy Comments Fallback (xl/comments{idx}.xml)
        legacy_file = f'xl/comments{target_sheet_idx}.xml'
        if legacy_file in z.namelist():
            c_xml = ET.fromstring(z.read(legacy_file))
            for c in c_xml.findall('.//ns:comment', ns_wb):
                ref = c.attrib.get('ref')
                if ref not in tc_map:
                    text = ''.join(t.text for t in c.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text)
                    if text.strip():
                        tc_map.setdefault(ref, []).append(text.strip())

    # Build structured records
    records = []
    for r in range(start_row, end_row + 1):
        target_cell = f"{target_col}{r}"
        header_cell = f"{header_col}{r}" if header_col else None
        
        target_val = cells.get(target_cell, '').strip()
        header_val = cells.get(header_cell, '').strip() if header_cell else ''
        comment = ' \n'.join(tc_map.get(target_cell, [])).strip()

        if target_val or comment:
            records.append({
                "row": r,
                "cell": target_cell,
                "header": header_val,
                "text": target_val,
                "comment": comment
            })

    return records

def format_output(records, output_format="markdown"):
    if output_format == "json":
        return json.dumps(records, indent=2, ensure_ascii=False)
    
    elif output_format == "csv":
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Row", "Cell", "Header", "Text", "Comment"])
        for r in records:
            writer.writerow([r["row"], r["cell"], r["header"], r["text"], r["comment"]])
        return output.getvalue()

    else: # markdown
        lines = [
            "| Cell | Text | Comment / Note |",
            "| :--- | :--- | :--- |"
        ]
        for r in records:
            if r["text"] or r["comment"]:
                clean_comment = r["comment"].replace("\n", "<br>")
                clean_text = r["text"].replace("\n", " ")
                lines.append(f"| `{r['cell']}` | **{clean_text}** | {clean_comment} |")
        return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="Extract cell text and threaded comments from Excel (.xlsx) files.")
    parser.add_argument("--file", "-f", required=True, help="Path to master .xlsx file")
    parser.add_argument("--sheet", "-s", default=1, help="Sheet number (1-based) or sheet name (default: 1)")
    parser.add_argument("--col", "-c", default="B", help="Target column letter to extract (default: B)")
    parser.add_argument("--header-col", default="A", help="Optional header column letter (default: A)")
    parser.add_argument("--start", type=int, default=1, help="Start row (default: 1)")
    parser.add_argument("--end", type=int, default=150, help="End row (default: 150)")
    parser.add_argument("--format", choices=["markdown", "json", "csv"], default="markdown", help="Output format")
    parser.add_argument("--output", "-o", help="Optional output file path to write to")

    args = parser.parse_args()

    try:
        # Convert numeric sheet argument to int
        sheet = int(args.sheet) if str(args.sheet).isdigit() else args.sheet
        data = extract_excel_data(
            file_path=args.file,
            sheet_name_or_idx=sheet,
            target_col=args.col.upper(),
            header_col=args.header_col.upper() if args.header_col else None,
            start_row=args.start,
            end_row=args.end
        )
        rendered = format_output(data, output_format=args.format)

        if args.output:
            with open(args.output, "w", encoding="utf-8-sig" if args.format == "csv" else "utf-8") as f:
                f.write(rendered)
            print(f"Extracted {len(data)} items to {args.output}")
        else:
            print(rendered)

    except Exception as e:
        print(f"Error extracting Excel data: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
