#!/bin/zsh
# Heavy build in ONE turn of the shared render slot: picture → sound → mix → QA from the MP4.
#   ../../../render-lock.sh pumpkin-sonnet-high ./build.sh
set -e
cd "$(dirname "$0")"
node render.mjs --video > render.log 2>&1
node synth.mjs > synth.log 2>&1
node mix.mjs > mix.log 2>&1
node qa.mjs . pumpkin-face-sonnet-high.mp4 24 > qa.log 2>&1
echo "build done pumpkin-face-sonnet-high"
