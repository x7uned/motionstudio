#!/bin/zsh
# Heavy build of the film, all inside ONE turn of the shared render slot: picture → sound → mix → send copy → QA from the MP4.
#   ../../render-lock.sh cat-name ./build.sh cat-name
set -e
cd "$(dirname "$0")"
NAME=$1
FF="/Users/rv/Desktop/Motion Studio/bin/ffmpeg"
node render.mjs --video > render.log 2>&1
node synth.mjs > synth.log 2>&1
node mix.mjs > mix.log 2>&1
# send copy for the phone (≤ 30 MiB): CRF 22; if it is still too big, a 2-pass ~28.6 MiB copy with the master audio
"$FF" -y -v error -i "$NAME-pixel.mp4" -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$NAME-pixel-phone.mp4"
if [[ $(stat -f %z "$NAME-pixel-phone.mp4") -gt 31000000 ]]; then
  DUR=$("$FF" -i "$NAME-pixel.mp4" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' | awk -F: '{print $1*3600+$2*60+$3}')
  VB=$(awk -v d="$DUR" 'BEGIN{printf "%d", (28.6*8*1048576/d - 192000)/1000}')
  "$FF" -y -v error -i "$NAME-pixel.mp4" -c:v libx264 -preset slow -b:v ${VB}k -pass 1 -passlogfile dev/ff2pass -an -f mp4 /dev/null
  "$FF" -y -v error -i "$NAME-pixel.mp4" -c:v libx264 -preset slow -b:v ${VB}k -pass 2 -passlogfile dev/ff2pass -pix_fmt yuv420p -c:a copy -movflags +faststart "$NAME-pixel-max.mp4"
fi
node qa.mjs . "$NAME-pixel.mp4" 30 > qa.log 2>&1
echo "build done $NAME"
