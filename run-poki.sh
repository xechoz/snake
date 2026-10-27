#!/usr/bin/env bash
set -euo pipefail

# Serve a packaged Poki build locally.
# Usage: ./run-poki.sh [port]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8082}"
ZIP="$SCRIPT_DIR/release/snake-poki.zip"
TMP_DIR="${TMPDIR:-/tmp}/poki-snake"

case "${1:-}" in
  -h|--help|help)
    echo "Usage: $0 [port]"
    echo
    echo "  Serves release/snake-poki.zip on port 8082 by default."
    echo "  Real Poki ads and SDK events require the Poki Inspector."
    exit 0
    ;;
esac

for command in unzip python3; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

if [[ ! -f "$ZIP" ]]; then
  echo "Missing package: $ZIP" >&2
  echo "Build it first from the repo root:" >&2
  echo "  npm run package:poki" >&2
  exit 1
fi

if ! [[ "$PORT" =~ ^[0-9]+$ ]] || ((PORT < 1 || PORT > 65535)); then
  echo "Invalid port: $PORT" >&2
  exit 1
fi

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
unzip -q "$ZIP" -d "$TMP_DIR"

if [[ ! -f "$TMP_DIR/index.html" ]]; then
  echo "Package is invalid: index.html is not at the zip root." >&2
  exit 1
fi

LAN_IP=""
if command -v ip >/dev/null 2>&1; then
  LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") print $(i + 1)}' || true)"
fi
if [[ -z "$LAN_IP" ]] && command -v hostname >/dev/null 2>&1; then
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
fi

echo "Poki build"
echo "  Local:   http://localhost:$PORT/"
if [[ -n "$LAN_IP" ]]; then
  echo "  Network: http://$LAN_IP:$PORT/"
fi
echo "  Files:   $TMP_DIR"
echo
echo "The page loads the Poki SDK from game-cdn.poki.com."
echo "Real ads, ad-block handling and SDK event checks require the Poki Inspector:"
echo "  https://inspector.poki.dev"
echo "Press Ctrl+C to stop."
echo
exec python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$TMP_DIR"
