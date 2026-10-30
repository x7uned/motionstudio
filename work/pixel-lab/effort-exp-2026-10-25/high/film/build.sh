#!/bin/zsh
# Heavy build in ONE turn of the shared render slot: picture → sound → mix → QA from the MP4 → phone copy.
#   ../../../render-lock.sh pumpkin-high ./build.sh
set -e
cd "$(dirname "$0")"
node render.mjs --video > render.log 2>&1
node synth.mjs > synth.log 2>&1
node mix.mjs > mix.log 2>&1
node qa.mjs pumpkin-face-high.mp4 > qa.log 2>&1
# phone copy ≤ 30 MiB: the master is copied as is when it already fits, otherwise re-encoded
SIZE=$(stat -f %z pumpkin-face-high.mp4)
if (( SIZE <= 31457280 )); then cp pumpkin-face-high.mp4 pumpkin-face-high-phone.mp4
else "/Users/rv/Desktop/Motion Studio/bin/ffmpeg" -y -v error -i pumpkin-face-high.mp4 -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a copy -movflags +faststart pumpkin-face-high-phone.mp4; fi
echo "build done pumpkin-high $(stat -f %z pumpkin-face-high.mp4) $(stat -f %z pumpkin-face-high-phone.mp4)"
