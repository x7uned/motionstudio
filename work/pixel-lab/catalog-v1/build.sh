#!/bin/zsh
# Trial 10 s · heavy build of ONE run in one turn of the shared render slot: picture → sound → mix → phone copy → QA from the MP4.
#   ../render-lock.sh trial-<run> ./build.sh <run>        (from work/pixel-lab/trial-10s)
set -e
cd "$(dirname "$0")"
RUN=$1; D=runs/$RUN
node engine/render.mjs $RUN --video > $D/render.log 2>&1
node engine/synth.mjs $RUN > $D/synth.log 2>&1
node engine/mix.mjs $RUN > $D/mix.log 2>&1
if [[ $(stat -f%z "$D/film.mp4") -le 31457280 ]]; then cp "$D/film.mp4" "$D/film-phone.mp4"; else "/Users/rv/Desktop/Motion Studio/bin/ffmpeg" -hide_banner -nostdin -y -v error -i "$D/film.mp4" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a copy -movflags +faststart "$D/film-phone.mp4"; fi
node engine/qa.mjs $RUN > $D/qa.log 2>&1
echo "build done $RUN"
