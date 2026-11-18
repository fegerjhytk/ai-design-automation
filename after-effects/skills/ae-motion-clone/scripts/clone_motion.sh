#!/usr/bin/env bash
# Reference-Driven Motion Matcher Automation Pipeline
# Ingests reference media, generates physical motion recipe, and injects directly into After Effects.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REF_SOURCE=""
COMP_NAME=""
ARCHETYPE="cascade_drop"
ELEMENTS_ONLY="true"
LAYOUT="as-is"
DURATION="5.0"
STAGGER="0.12"
HOLD="1.9"
PREVIEW_GIF="false"

while [[ $# -gt 0 ]]; do
  case $1 in
    --ref|-r)
      REF_SOURCE="$2"
      shift 2
      ;;
    --comp|-c)
      COMP_NAME="$2"
      shift 2
      ;;
    --archetype|-a)
      ARCHETYPE="$2"
      shift 2
      ;;
    --elements-only)
      ELEMENTS_ONLY="true"
      shift
      ;;
    --include-text)
      ELEMENTS_ONLY="false"
      shift
      ;;
    --layout|-l)
      LAYOUT="$2"
      shift 2
      ;;
    --duration|-d)
      DURATION="$2"
      shift 2
      ;;
    --stagger|-s)
      STAGGER="$2"
      shift 2
      ;;
    --hold)
      HOLD="$2"
      shift 2
      ;;
    --preview-gif)
      PREVIEW_GIF="true"
      shift
      ;;
    --help|-h)
      echo "Reference-Driven Motion Matcher Automation Pipeline"
      echo "Usage: $0 --comp <CompName> [--ref <url_or_file>] [--archetype cascade_drop|carousel_scroll|elastic_pop|stagger_slide] [--elements-only|--include-text] [--layout as-is|stacked] [--duration <sec>] [--stagger <sec>] [--hold <sec>] [--preview-gif]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --ref <url_or_file> --comp <CompName> [--archetype <type>] [--elements-only] [--layout as-is|stacked] [--duration <sec>] [--stagger <sec>] [--hold <sec>] [--preview-gif]"
      exit 1
      ;;
  esac
done

if [ -z "$COMP_NAME" ]; then
  echo "Error: --comp <CompName> is required."
  exit 1
fi

REF_PATH=""
if [ -n "$REF_SOURCE" ]; then
  echo "🎬 Step 1: Ingesting Reference Media..."
  REF_PATH=$(python3 "$SCRIPT_DIR/fetch_reference.py" --source "$REF_SOURCE" --path-only)
  echo "   ✓ Reference cached at: $REF_PATH"
else
  echo "🎬 Step 1: Using built-in physics archetype: $ARCHETYPE"
fi

echo "📐 Step 2: Generating Motion Recipe..."
python3 "$SCRIPT_DIR/motion_analyzer.py" \
  ${REF_PATH:+--ref "$REF_PATH"} \
  --archetype "$ARCHETYPE" \
  --duration "$DURATION" \
  --layout "$LAYOUT" \
  --stagger "$STAGGER" \
  --hold "$HOLD" \
  $( [ "$ELEMENTS_ONLY" = "false" ] && echo "--include-text" ) \
  --output "/tmp/motion_recipe.json"

cat <<EOF > /tmp/ae_motion_config.json
{
  "compName": "$COMP_NAME",
  "archetype": "$ARCHETYPE",
  "elementsOnly": $ELEMENTS_ONLY,
  "layout": "$LAYOUT"
}
EOF

echo "⚡ Step 3: Injecting Motion into After Effects 2026..."
osascript -e '
with timeout of 1800 seconds
    tell application "Adobe After Effects 2026"
        DoScriptFile POSIX file "'"$SCRIPT_DIR"'/apply_motion.jsx"
    end tell
end timeout
'

if [ ! -f /tmp/ae_motion_result.json ]; then
  echo "❌ Error: Motion injection failed (no result JSON)."
  exit 1
fi

SUCCESS=$(python3 -c 'import json; print(json.load(open("/tmp/ae_motion_result.json")).get("success", False))')
if [ "$SUCCESS" != "True" ]; then
  ERR=$(python3 -c 'import json; print(json.load(open("/tmp/ae_motion_result.json")).get("error", "Unknown error"))')
  echo "❌ After Effects Error: $ERR"
  exit 1
fi

ANIM_COUNT=$(python3 -c 'import json; print(json.load(open("/tmp/ae_motion_result.json")).get("layersAnimated", 0))')
SKIP_COUNT=$(python3 -c 'import json; print(json.load(open("/tmp/ae_motion_result.json")).get("layersSkipped", 0))')

echo "✓ Motion successfully applied to '$COMP_NAME'!"
echo "   Archetype: $ARCHETYPE | Layout: $LAYOUT"
echo "   Animated layers: $ANIM_COUNT | Skipped/Static layers: $SKIP_COUNT"

if [ "$PREVIEW_GIF" = "true" ]; then
  echo ""
  echo "🎥 Step 4: Exporting Butter-Smooth 50 FPS Preview GIF via ae-comp-to-gif..."
  /Users/admin/.gemini/config/skills/ae-comp-to-gif/scripts/ae_to_gif.sh \
    --comp "$COMP_NAME" \
    --duration "$DURATION" \
    --fps auto
fi
