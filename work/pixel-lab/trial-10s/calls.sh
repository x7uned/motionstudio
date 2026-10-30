#!/bin/zsh
# All trial calls, one after another (the shared static prefix stays warm in the prompt cache between them).
# Run in the user's terminal (Claude CLI login): work/pixel-lab/trial-10s/calls.sh [effort…]
cd "$(dirname "$0")"
for effort in ${@:-medium low}; do
  for topic in pumpkin sunlight bats; do
    node call.mjs $topic $effort 2>&1 | tee -a calls.log
  done
done
echo "calls done" | tee -a calls.log
