#!/bin/zsh
# Heavy build of the film, all inside ONE turn of the shared render slot: picture → mix → phone copy → QA from the MP4.
set -e
cd "$(dirname "$0")"
NAME=$1
node render.mjs --video > render.log 2>&1
node synth.mjs > synth.log 2>&1
node mix.mjs > mix.log 2>&1
"/Users/rv/Desktop/Motion Studio/bin/ffmpeg" -y -v error -i "$NAME-pixel.mp4" -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$NAME-pixel-phone.mp4"
node ../../animals/qa.mjs . "$NAME-pixel.mp4" 24 > qa.log 2>&1
echo "build done $NAME"
