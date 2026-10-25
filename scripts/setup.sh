#!/bin/zsh
set -e
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/bin:/bin:$PATH"
npm install --no-audit --no-fund
if [ ! -x .runtime/venv/bin/python ]; then
  python3 -m venv .runtime/venv
fi
.runtime/venv/bin/python -m pip install edge-tts==7.3.1
npm run build
echo 'Студия готова. Запустите «Открыть студию.command».'
