#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="/Users/admin/.gemini/antigravity/bin/node"
if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node)"
fi

TOKEN="$("$NODE_BIN" "$SCRIPT_DIR/bridge_server.js" --print-token)"
echo "Bridge URL:   http://127.0.0.1:${DESIGN_BRIDGE_PORT:-4815}"
echo "Bridge Token: $TOKEN"
echo "Starting local bridge..."
exec "$NODE_BIN" "$SCRIPT_DIR/bridge_server.js" "$@"
