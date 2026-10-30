#!/bin/zsh
# Heavy build in ONE turn of the shared render slot: picture → sound → mix → QA from the MP4 → phone copy.
#   ../../../render-lock.sh pumpkin-medium ./build.sh
set -e
cd "$(dirname "$0")"
node render.mjs --video > render.log 2>&1
node synth.mjs > synth.log 2>&1
node mix.mjs > mix.log 2>&1
node qa.mjs . pumpkin-face-medium.mp4 30 > qa.log 2>&1
SZ=$(stat -f %z pumpkin-face-medium.mp4)
if (( SZ <= 31457280 )); then cp pumpkin-face-medium.mp4 pumpkin-face-medium-phone.mp4; else "/Users/rv/Desktop/Motion Studio/bin/ffmpeg" -y -v error -i pumpkin-face-medium.mp4 -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -c:a copy -movflags +faststart pumpkin-face-medium-phone.mp4; fi
echo "build done pumpkin-medium"
