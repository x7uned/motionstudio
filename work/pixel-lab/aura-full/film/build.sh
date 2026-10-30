#!/bin/zsh
# Heavy build in ONE turn of the shared render slot: picture → music edit + sfx → mix → QA from the MP4.
#   ../../render-lock.sh infinite-aura ./build.sh
set -e
cd "$(dirname "$0")"
STRICT=1 node render.mjs --video > render.log 2>&1
node music.mjs > music.log 2>&1
node synth.mjs > synth.log 2>&1
node mix.mjs > mix.log 2>&1
node qa.mjs . infinite-aura-pixel.mp4 30 > qa.log 2>&1
echo "build done infinite-aura"
