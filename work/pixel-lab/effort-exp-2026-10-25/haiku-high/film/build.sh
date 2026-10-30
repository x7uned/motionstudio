#!/bin/zsh
# Heavy build in ONE turn of the shared render slot: picture → sound → mix → QA from the MP4 → phone copy.
#   cd work/pixel-lab/effort-exp-2026-10-25/haiku-high/film && ../../../render-lock.sh pumpkin-haiku-high ./build.sh
set -e
cd "$(dirname "$0")"
node render.mjs --video > render.log 2>&1
node synth.mjs > synth.log 2>&1
node mix.mjs > mix.log 2>&1
node qa.mjs . pumpkin-face-haiku-high.mp4 30 > qa.log 2>&1
SIZE=$(stat -f %z pumpkin-face-haiku-high.mp4)
if [ "$SIZE" -le 31457280 ]; then cp pumpkin-face-haiku-high.mp4 pumpkin-face-haiku-high-phone.mp4; else echo "master > 30 MiB: phone copy needs a re-encode" >&2; fi
echo "build done pumpkin-haiku-high"
