#!/bin/zsh
# «Pumpkin face» (xhigh) — heavy build in ONE turn of the shared render slot: picture → sound → mix → phone copy → QA from the MP4.
#   ../../../render-lock.sh pumpkin-xhigh ./build.sh
set -e
cd "$(dirname "$0")"
STRICT=1 node render.mjs --video > render.log 2>&1
node synth.mjs > synth.log 2>&1
node mix.mjs > mix.log 2>&1
MASTER=pumpkin-face-xhigh.mp4; PHONE=pumpkin-face-xhigh-phone.mp4
if [[ $(stat -f%z "$MASTER") -le 31457280 ]]; then cp "$MASTER" "$PHONE"; else "/Users/rv/Desktop/Motion Studio/bin/ffmpeg" -hide_banner -nostdin -y -v error -i "$MASTER" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a copy -movflags +faststart "$PHONE"; fi
node qa.mjs "$MASTER" > qa.log 2>&1
echo "build done pumpkin-xhigh"
