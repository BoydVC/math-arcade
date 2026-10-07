#!/usr/bin/env bash
# Vic's Math Arcade: build, test, serve on :4255.
#   ./run.sh            build + full smoke test (incl. ~2 min headless play) + serve
#   ./run.sh --quick    build + smoke test without headless play + serve
#   ./run.sh --shots    also regenerate screenshots (headless Chrome)
set -euo pipefail
cd "$(dirname "$0")"
PORT=4255
python3 build.py
if [[ "${1:-}" == "--shots" ]]; then node --experimental-websocket tests/screens.mjs >/dev/null && cp screenshots/desktop-01-home.png screenshots/00-best-home-desktop.png; fi
if [[ "${1:-}" == "--quick" ]]; then python3 tests/smoke_test.py --skip-play; else python3 tests/smoke_test.py; fi
if ss -ltn | grep -q ":$PORT "; then echo "already serving on :$PORT"; else
  nohup python3 -m http.server "$PORT" --bind 0.0.0.0 --directory dist > /tmp/math-arcade-$PORT.log 2>&1 &
  sleep 1; echo "serving http://localhost:$PORT/ (pid $!)"; fi
