#!/bin/zsh
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/bin:/bin:$PATH"
if ! curl --silent --fail http://127.0.0.1:3210/api/studio >/dev/null; then
  (sleep 3; open http://127.0.0.1:3210) &
  npm start
else
  open http://127.0.0.1:3210
fi
