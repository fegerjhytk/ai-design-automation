#!/usr/bin/env bash
# run_diff.sh - Convenience wrapper for indesign-doc-diff skill
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/indesign-doc-diff.js" "$@"
