#!/usr/bin/env bash
# publish_matrix.sh: Master CLI orchestrator for xlsx-indesign-batch-publisher

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="$(which python3 || echo "python3")"

usage() {
    local exit_code="${1:-0}"
    cat <<EOF
Usage: publish_matrix.sh <subcommand> [options]

Subcommands:
  parse       Parse Excel feature matrix (.xlsx) to normalized JSON
  inspect     Inspect InDesign master template (.indd) headlessly
  generate    Run chunked batch generation and synchronous PDF export
  audit       Run 100% bi-directional QA audit against Excel ground truth
  all         Execute full pipeline with mandatory pre-flight approval gate

Options:
  --xlsx <file>        Path to input Excel matrix (.xlsx)
  --sheet <name>       Sheet name in Excel file
  --lang <EN|FR>       Target language (default: EN)
  --indd <file>        Path to master InDesign template (.indd)
  --out-dir <dir>      Directory to save generated .indd files
  --pdf-dir <dir>      Directory to save exported .pdf files
  --data <file>        Path to normalized company data JSON
  --chunk-size <N>     Number of documents per batch chunk (default: 12)
EOF
    exit "$exit_code"
}

if [ $# -eq 0 ]; then
    usage 1
elif [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage 0
fi

SUBCOMMAND="$1"
shift

# Default parameters
XLSX_FILE=""
SHEET_NAME=""
LANG="EN"
INDD_FILE=""
OUT_DIR=""
PDF_DIR=""
DATA_FILE="${SCRIPT_DIR}/batch_company_data.json"
CHUNK_SIZE=12

while [[ $# -gt 0 ]]; do
    case "$1" in
        --xlsx) XLSX_FILE="$2"; shift 2 ;;
        --sheet) SHEET_NAME="$2"; shift 2 ;;
        --lang) LANG="$2"; shift 2 ;;
        --indd) INDD_FILE="$2"; shift 2 ;;
        --out-dir) OUT_DIR="$2"; shift 2 ;;
        --pdf-dir) PDF_DIR="$2"; shift 2 ;;
        --data) DATA_FILE="$2"; shift 2 ;;
        --chunk-size) CHUNK_SIZE="$2"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown parameter: $1"; usage ;;
    esac
done

run_parse() {
    if [ -z "$XLSX_FILE" ]; then
        echo "Error: --xlsx is required for parse." >&2
        exit 1
    fi
    echo "==> Parsing Excel matrix: $XLSX_FILE (Lang: $LANG)..."
    PARSE_CMD=("$PYTHON_BIN" "${SCRIPT_DIR}/matrix_parser.py" --xlsx "$XLSX_FILE" --lang "$LANG" --out "$DATA_FILE")
    if [ -n "$SHEET_NAME" ]; then
        PARSE_CMD+=(--sheet "$SHEET_NAME")
    fi
    "${PARSE_CMD[@]}"
}

run_inspect() {
    if [ -z "$INDD_FILE" ]; then
        echo "Error: --indd is required for inspect." >&2
        exit 1
    fi
    echo "==> Inspecting InDesign template: $INDD_FILE..."
    cat <<EOF > "${SCRIPT_DIR}/inspect_config.json"
{
  "templatePath": "$INDD_FILE"
}
EOF
    osascript -e "tell application \"Adobe InDesign 2026\" to do script (POSIX file \"${SCRIPT_DIR}/inspect_template.jsx\") language javascript"
    cat "${SCRIPT_DIR}/template_inspection.json"
}

run_generate() {
    if [ ! -f "$DATA_FILE" ]; then
        echo "Error: Data file $DATA_FILE not found. Run 'parse' first." >&2
        exit 1
    fi
    if [ -z "$INDD_FILE" ] || [ -z "$OUT_DIR" ] || [ -z "$PDF_DIR" ]; then
        echo "Error: --indd, --out-dir, and --pdf-dir are required for generate." >&2
        exit 1
    fi

    mkdir -p "$OUT_DIR" "$PDF_DIR"

    echo "==> Preparing batch generator chunks (size: $CHUNK_SIZE)..."
    "$PYTHON_BIN" -c "
import json
data = json.load(open('$DATA_FILE'))
companies = list(data.keys())
chunk_size = int('$CHUNK_SIZE')
chunks = [companies[i:i + chunk_size] for i in range(0, len(companies), chunk_size)]

for idx, chunk in enumerate(chunks, 1):
    cfg = {
        'templatePath': '$INDD_FILE',
        'inddDir': '$OUT_DIR/',
        'pdfDir': '$PDF_DIR/',
        'chunkList': chunk,
        'allData': data,
        'statusPath': '${SCRIPT_DIR}/chunk_status_' + str(idx) + '.json'
    }
    with open('${SCRIPT_DIR}/generator_config.json', 'w') as f:
        json.dump(cfg, f, indent=2)
    print(f'Running Chunk {idx}/{len(chunks)} ({len(chunk)} companies)...')
    import subprocess
    cmd = ['osascript', '-e', 'tell application \"Adobe InDesign 2026\" to do script (POSIX file \"${SCRIPT_DIR}/batch_generate.jsx\") language javascript']
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f'Error in Chunk {idx}: {res.stderr}')
        exit(1)
print('Batch generation finished successfully.')
"
}

run_audit() {
    if [ ! -f "$DATA_FILE" ]; then
        echo "Error: Data file $DATA_FILE not found. Run 'parse' first." >&2
        exit 1
    fi
    if [ -z "$OUT_DIR" ] || [ -z "$PDF_DIR" ]; then
        echo "Error: --out-dir and --pdf-dir are required for audit." >&2
        exit 1
    fi

    echo "==> Running 100% bi-directional QA audit..."
    "$PYTHON_BIN" -c "
import json
data = json.load(open('$DATA_FILE'))
cfg = {
    'inddDir': '$OUT_DIR/',
    'pdfDir': '$PDF_DIR/',
    'allData': data,
    'reportPath': '${SCRIPT_DIR}/audit_report.json'
}
with open('${SCRIPT_DIR}/audit_config.json', 'w') as f:
    json.dump(cfg, f, indent=2)
"
    osascript -e "tell application \"Adobe InDesign 2026\" to do script (POSIX file \"${SCRIPT_DIR}/audit_dots.jsx\") language javascript"

    "$PYTHON_BIN" -c "
import json
rep = json.load(open('${SCRIPT_DIR}/audit_report.json'))
total_dots = sum(x['dotsTotal'] for x in rep)
matched_dots = sum(x['dotsMatched'] for x in rep)
mismatches = sum(len(x['dotMismatches']) for x in rep)
oversets = sum(1 for x in rep if x.get('hasOverset'))

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
print('  100% BI-DIRECTIONAL QA AUDIT VERDICT')
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
print(f'Total Documents Audited: {len(rep)}')
print(f'Total Rating Dots Checked: {total_dots}')
print(f'Dots Matched Ground Truth: {matched_dots}')
print(f'Mismatches: {mismatches}')
print(f'Documents with Oversets: {oversets}')

if mismatches == 0 and matched_dots == total_dots and oversets == 0:
    print('\nOVERALL RESULT: [100% PASS]')
else:
    print('\nOVERALL RESULT: [FAILED / REVIEW REQUIRED]')
    for x in rep:
        if len(x['dotMismatches']) > 0:
            print(f\"  Mismatch in {x['company']}: {x['dotMismatches']}\")
"
}

case "$SUBCOMMAND" in
    parse) run_parse ;;
    inspect) run_inspect ;;
    generate) run_generate ;;
    audit) run_audit ;;
    all)
        run_parse
        run_inspect
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  MANDATORY HUMAN-IN-THE-LOOP APPROVAL CHECKPOINT"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        read -p "Proceed with batch generation and PDF export? (y/n): " CONFIRM
        if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
            run_generate
            run_audit
        else
            echo "Batch generation aborted by user."
            exit 0
        fi
        ;;
    *) echo "Unknown subcommand: $SUBCOMMAND"; usage ;;
esac
