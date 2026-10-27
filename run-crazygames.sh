#!/usr/bin/env bash
set -euo pipefail

# Serve a packaged CrazyGames build locally.
# Usage: ./run-crazygames.sh [basic|full] [port]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-basic}"

case "$MODE" in
  basic)
    DEFAULT_PORT=8080
    ;;
  full)
    DEFAULT_PORT=8081
    ;;
  -h|--help|help)
    echo "Usage: $0 [basic|full] [port]"
    echo
    echo "  basic  CrazyGames lifecycle build without ads (default, port 8080)"
    echo "  full   CrazyGames lifecycle + rewarded/midgame ads (port 8081)"
    exit 0
    ;;
  *)
    echo "Unknown build: $MODE" >&2
    echo "Usage: $0 [basic|full] [port]" >&2
    exit 1
    ;;
esac

PORT="${2:-$DEFAULT_PORT}"
ZIP="$SCRIPT_DIR/../../release/snake-crazygames-$MODE.zip"
TMP_DIR="${TMPDIR:-/tmp}/cg-snake-$MODE"

for command in unzip python3; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

if [[ ! -f "$ZIP" ]]; then
  echo "Missing package: $ZIP" >&2
  echo "Build it first from the repo root:" >&2
  echo "  npm run package:snake:crazy:$MODE" >&2
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

echo "CrazyGames $MODE build"
echo "  Local:   http://localhost:$PORT/"
if [[ -n "$LAN_IP" ]]; then
  echo "  Network: http://$LAN_IP:$PORT/"
fi
echo "  Files:   $TMP_DIR"
echo
echo "The page loads the CrazyGames SDK from sdk.crazygames.com."
echo "Real ads, muteAudio and event checks require the CrazyGames portal preview."
echo "The SDK disables itself on Network URLs; use Local or the portal for SDK events."
echo "Press Ctrl+C to stop."
echo

exec python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$TMP_DIR"
