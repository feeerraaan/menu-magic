#!/bin/bash
# Renders every deliverable, one at a time, and copies the finished files into
# docs/video/.
#
# Serial on purpose: this box has two cores, so two renders in parallel each go at
# half speed and double the peak memory for no gain. Every film goes through
# render-film.sh, which is chunked and resumable, so an interrupted run picks up
# where it stopped instead of starting the queue over.
#
#   setsid nohup scripts/render-all.sh > out/render-all.log 2>&1 &
set -e
cd "$(dirname "$0")/.."
DOCS=../docs/video

render() {
  local comp=$1 out=$2 total=$3 name=$4
  if [ -s "$out" ]; then
    echo "### $name already rendered, skipping"
  else
    echo "### $name ($comp, $total frames)"
    scripts/render-film.sh "$comp" "$out" "$total"
  fi
  mkdir -p "$DOCS"
  cp "$out" "$DOCS/$name"
  echo "### $name -> $DOCS/$name"
}

# Frame counts come from src/Root.tsx.
render Launch        out/sacarta-launch.mp4     4950 sacarta-launch.mp4
render Tour          out/sacarta-tour-16x9.mp4  1800 sacarta-tour-16x9.mp4
render Reel          out/sacarta-reel-16x9.mp4  1684 sacarta-reel-16x9.mp4
render TourVertical  out/sacarta-tour-9x16.mp4  1800 sacarta-tour-9x16.mp4
render ReelVertical  out/sacarta-reel-9x16.mp4  1684 sacarta-reel-9x16.mp4

echo
echo "=== all deliverables ==="
ls -la "$DOCS"
for f in "$DOCS"/*.mp4; do
  printf '%-28s %s s\n' "$(basename "$f")" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"
done
