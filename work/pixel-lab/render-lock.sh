#!/bin/zsh
# Shared render slot for pixel-lab chat sessions (user, 2026-10-23: «просто надо не рендерить это все в одно время»).
# Only one heavy job at a time: a full `render.mjs --video`, a mix, a phone copy encode.
# Stills and contact sheets are light and do not need the slot.
#   ./render-lock.sh <label> <command...>      e.g.  ../../render-lock.sh dog-red-ball node render.mjs --video
#   ./render-lock.sh --status
# The lock is a directory (atomic mkdir). A lock whose PID is gone is stale and is taken over.
LOCK="/Users/rv/Desktop/Motion Studio/work/pixel-lab/.render-lock"
if [[ "$1" == "--status" ]]; then
  if [[ -d "$LOCK" ]]; then cat "$LOCK/owner" 2>/dev/null; else echo "free"; fi
  exit 0
fi
LABEL="$1"; shift
while true; do
  if mkdir "$LOCK" 2>/dev/null; then
    echo "pid=$$ label=$LABEL since=$(date '+%H:%M:%S') cwd=$PWD" > "$LOCK/owner"
    break
  fi
  OWNER_PID=$(sed -n 's/^pid=\([0-9]*\).*/\1/p' "$LOCK/owner" 2>/dev/null)
  if [[ -n "$OWNER_PID" ]] && ! kill -0 "$OWNER_PID" 2>/dev/null; then
    echo "[render-lock] stale lock from pid $OWNER_PID, taking over"; rm -rf "$LOCK"; continue
  fi
  echo "[render-lock] $LABEL waits: busy with $(cat "$LOCK/owner" 2>/dev/null)"
  sleep 15
done
trap 'rm -rf "$LOCK"' EXIT INT TERM
echo "[render-lock] $LABEL has the render slot"
"$@"
