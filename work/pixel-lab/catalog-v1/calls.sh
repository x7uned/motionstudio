#!/bin/zsh
# catalog-v1 trial calls (one Claude Opus 5.5 call per topic, effort medium by default), one after another so the shared
# static prefix stays warm. Run in the user's terminal (Claude CLI login): work/pixel-lab/catalog-v1/calls.sh [effort]
cd "$(dirname "$0")"
for topic in dog-nose power-line cat-box crosswalk plane-window frozen-frog; do
  node call.mjs $topic ${1:-medium} 2>&1 | tee -a calls.log
done
echo "calls done" | tee -a calls.log
