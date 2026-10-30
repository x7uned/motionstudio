#!/bin/zsh
# Heavy build in ONE turn of the shared render slot: picture → sound → mix → QA from the MP4 → phone copy.
#   ../../../render-lock.sh pumpkin-sonnet-medium ./build.sh
set -e
cd "$(dirname "$0")"
M=pumpkin-face-sonnet-medium
node render.mjs --video > render.log 2>&1
node synth.mjs > synth.log 2>&1
node mix.mjs > mix.log 2>&1
node qa.mjs . $M.mp4 24 > qa.log 2>&1
SZ=$(stat -f%z $M.mp4)
if [ "$SZ" -le 31457280 ]; then cp $M.mp4 $M-phone.mp4; else /Users/rv/Desktop/Motion\ Studio/bin/ffmpeg -y -v error -i $M.mp4 -c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -c:a copy -movflags +faststart $M-phone.mp4; fi
echo "build done $M size=$SZ"
