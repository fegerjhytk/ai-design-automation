#!/usr/bin/env bash
# After Effects Composition to Smooth GIF Automation Pipeline
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMP_NAME=""
DURATION="0"
FPS="auto"
CUSTOM_OUT_DIR=""
PROJECT_PATH=""
SKIP_WEB="false"

while [[ $# -gt 0 ]]; do
  case $1 in
    --comp|-c)
      COMP_NAME="$2"
      shift 2
      ;;
    --duration|-d)
      DURATION="$2"
      shift 2
      ;;
    --fps|-f)
      FPS="$2"
      shift 2
      ;;
    --out|-o)
      CUSTOM_OUT_DIR="$2"
      shift 2
      ;;
    --project|-p)
      PROJECT_PATH="$2"
      shift 2
      ;;
    --skip-web)
      SKIP_WEB="true"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --comp <CompName> [--duration <sec>] [--fps <auto|50|25|20>] [--out <dir>] [--project <aep_path>] [--skip-web]"
      exit 1
      ;;
  esac
done

if [ -z "$COMP_NAME" ]; then
  echo "Error: --comp <CompName> is required."
  exit 1
fi

TEMP_VIDEO="/private/tmp/ae_comp_${COMP_NAME// /_}.mp4"

# 1. Compute target FPS for ExtendScript
EXT_FPS=50
if [ "$FPS" != "auto" ]; then
  EXT_FPS="$FPS"
fi

# 2. Write configuration for ExtendScript
cat <<EOF > /tmp/ae_export_config.json
{
  "compName": "$COMP_NAME",
  "targetFps": $EXT_FPS,
  "targetDuration": $DURATION,
  "outputPath": "$TEMP_VIDEO",
  "projectPath": "$PROJECT_PATH"
}
EOF

echo "🎥 Configuring After Effects 2026 for comp '$COMP_NAME'..."
echo "   Target FPS: $EXT_FPS | Target Duration: ${DURATION}s"

# 3. Trigger ExtendScript via osascript
osascript -e '
with timeout of 1800 seconds
    tell application "Adobe After Effects 2026"
        DoScriptFile POSIX file "'"$SCRIPT_DIR"'/ae_export.jsx"
    end tell
end timeout
'

# 4. Verify Export Output
if [ ! -f /tmp/ae_export_result.json ]; then
  echo "❌ Error: After Effects export failed (no result JSON)."
  exit 1
fi

SUCCESS=$(python3 -c 'import json; print(json.load(open("/tmp/ae_export_result.json")).get("success", False))')
if [ "$SUCCESS" != "True" ]; then
  ERR=$(python3 -c 'import json; print(json.load(open("/tmp/ae_export_result.json")).get("error", "Unknown error"))')
  echo "❌ After Effects Error: $ERR"
  exit 1
fi

RENDERED_VIDEO=$(python3 -c 'import json; print(json.load(open("/tmp/ae_export_result.json")).get("outputPath", ""))')
PROJECT_FOLDER=$(python3 -c 'import json; print(json.load(open("/tmp/ae_export_result.json")).get("projectFolder", ""))')
echo "✓ Video rendered: $RENDERED_VIDEO"

# Determine Output Directory (Default to Output folder beside After Effects file)
if [ -n "$CUSTOM_OUT_DIR" ]; then
  FINAL_OUT_DIR="$CUSTOM_OUT_DIR"
elif [ -n "$PROJECT_FOLDER" ]; then
  FINAL_OUT_DIR="$PROJECT_FOLDER/Output"
else
  FINAL_OUT_DIR="$HOME/Desktop/Output"
fi

mkdir -p "$FINAL_OUT_DIR"
echo "📁 Output destination: $FINAL_OUT_DIR"

# 5. Convert to Smooth GIF via Python and remove intermediate MP4
CMD=(python3 "$SCRIPT_DIR/convert_to_smooth_gif.py" --input "$RENDERED_VIDEO" --out-dir "$FINAL_OUT_DIR" --fps "$FPS" --name "$COMP_NAME" --remove-input)
if [ "$SKIP_WEB" = "true" ]; then
  CMD+=(--skip-web)
fi

"${CMD[@]}"

# 6. Safety cleanup: ensure intermediate MP4 is removed
if [ -f "$RENDERED_VIDEO" ]; then
  rm -f "$RENDERED_VIDEO"
  echo "🗑️ Removed intermediate MP4 render: $RENDERED_VIDEO"
fi
