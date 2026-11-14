#!/usr/bin/env bash
# Serves the static export exactly like GitHub Pages (under BASE_PATH) and runs the e2e suite.
#   BASE_PATH=/dashboard npm run build:static && BASE_PATH=/dashboard npm run e2e
set -euo pipefail
BASE_PATH="${BASE_PATH:-/dashboard}"
PORT="${E2E_PORT:-3200}"
SITE="$(mktemp -d)"
mkdir -p "$SITE$(dirname "$BASE_PATH")"
cp -r out "$SITE$BASE_PATH"
python3 -m http.server "$PORT" --directory "$SITE" > /dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$SITE"' EXIT
for _ in $(seq 1 30); do curl -sf "http://localhost:$PORT$BASE_PATH/" > /dev/null && break; sleep 0.5; done
export E2E_BASE="http://localhost:$PORT$BASE_PATH" E2E_ROOT="out"
# In sandboxes where the browser cannot reach ESPN directly, set E2E_ROUTE_ESPN=1
# (requests are then fetched by Node; NODE_USE_ENV_PROXY lets Node use HTTPS_PROXY).
export NODE_USE_ENV_PROXY="${NODE_USE_ENV_PROXY:-1}"
status=0
echo "▶ interaction tests"; node e2e/interact.cjs || status=1
echo "▶ crawl (desktop · mobile · tablet)"; node e2e/crawl.cjs || status=1
exit $status
