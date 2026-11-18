#!/usr/bin/env bash
# Design QC & Visual Diff Shell Wrapper
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

case "$1" in
  --audit)
    shift
    python3 "$DIR/qc_runner.py" "$@"
    ;;
  --compare)
    BEFORE_FILE="$2"
    AFTER_FILE="$3"
    MODE="${4:---mode all}"
    OUTPUT_DIR="${5:-/Users/admin/Downloads/QC_Visual_Diff}"

    if [ -z "$BEFORE_FILE" ] || [ -z "$AFTER_FILE" ]; then
      echo "Usage: ./run_qc.sh --compare <before.ai> <after.ai> [--mode image|marked|all] [output_dir]"
      exit 1
    fi

    echo "▶ Setting up comparison staging directories..."
    TMP_BEFORE="/tmp/qc_diff_staging/before"
    TMP_AFTER="/tmp/qc_diff_staging/after"
    rm -rf "$TMP_BEFORE" "$TMP_AFTER"
    mkdir -p "$TMP_BEFORE" "$TMP_AFTER" "$OUTPUT_DIR"

    # Export Before Artboards
    echo "▶ Exporting artboards from Before file: $(basename "$BEFORE_FILE")..."
    osascript -e "
    tell application \"Adobe Illustrator\"
        open POSIX file \"$BEFORE_FILE\"
        set js to \"var outDir = '$TMP_BEFORE'; var prefix = 'ab_'; var abs = 'all'; var res = 150;\" & (read POSIX file \"$DIR/export_artboards.jsx\")
        do javascript js
        close current document saving no
    end tell"

    # Export After Artboards
    echo "▶ Exporting artboards from After file: $(basename "$AFTER_FILE")..."
    osascript -e "
    tell application \"Adobe Illustrator\"
        open POSIX file \"$AFTER_FILE\"
        set js to \"var outDir = '$TMP_AFTER'; var prefix = 'ab_'; var abs = 'all'; var res = 150;\" & (read POSIX file \"$DIR/export_artboards.jsx\")
        do javascript js
    end tell"

    # Run Visual Diff Engine via uv
    echo "▶ Running Visual Diff Engine (Image & Marked Modes)..."
    uv run --with pillow python3 "$DIR/visual_diff_engine.py" \
      --before "$TMP_BEFORE" \
      --after "$TMP_AFTER" \
      --mode all \
      --output "$OUTPUT_DIR"

    echo ""
    echo "✨ Visual Comparison Complete! Outputs saved to:"
    echo "   📁 file://$OUTPUT_DIR"
    echo "   🌐 Dashboard: file://$OUTPUT_DIR/index.html"
    ;;
  *)
    echo "Design QC & Visual Difference Engine"
    echo "Usage:"
    echo "  ./run_qc.sh --audit [--markers]"
    echo "  ./run_qc.sh --compare <before.ai> <after.ai> [--mode image|marked|all] [output_dir]"
    ;;
esac
