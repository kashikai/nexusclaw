#!/bin/bash
set -euo pipefail

DIR="/home/hanna/.openclaw/workspace/nexusclaw/agents/nex"
cd "$DIR"

if ! pgrep -f "^node dist/telegram-review\.js$" >/dev/null; then
  setsid -f sh -c 'exec node dist/telegram-review.js > nex-live.log 2>&1 < /dev/null'
  sleep 1
  pid="$(pgrep -f '^node dist/telegram-review\.js$' | head -n 1 || true)"
  echo "$(date -Is) restarted telegram-review pid=${pid:-unknown}" >> watchdog.log
fi

if ! pgrep -f "^node autonomous\.js$" >/dev/null; then
  setsid -f sh -c 'exec node autonomous.js > autonomous.log 2>&1 < /dev/null'
  sleep 1
  pid="$(pgrep -f '^node autonomous\.js$' | head -n 1 || true)"
  echo "$(date -Is) restarted autonomous pid=${pid:-unknown}" >> watchdog.log
fi
