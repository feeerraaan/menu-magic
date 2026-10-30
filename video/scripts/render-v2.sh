#!/bin/bash
# v2 render: same video as v1 (chunks reused), new soundtrack.
#
# v1 already burned hours of video rendering into out/chunks/*_NNNNN.mp4 and the
# SFX layer changes audio only, so the video chunks are reused as-is and only
# the audio pass is re-rendered, then muxed with a loudness-normalized bed.
# Vertical compositions were never rendered, so they get a full chunked render.
#
#   setsid nohup scripts/render-v2.sh > out/render-v2.log 2>&1 &
set -e
cd "$(dirname "$0")/.."
DOCS=../docs/video
mkdir -p out/v2 out/chunks "$DOCS"

render() {
  local comp=$1 out=$2 total=$3 name=$4
  if [ -s "$out" ]; then
    echo "### $name already rendered, skipping"
  else
    echo "### $name ($comp, $total frames)"
    # The soundtrack changed, so always drop the old audio pass.
    rm -f "out/chunks/${comp}-audio.mp3"
    LOUDNORM=1 scripts/render-film.sh "$comp" "$out" "$total"
  fi
  cp "$out" "$DOCS/$name"
  echo "### $name -> $DOCS/$name"
}

# Same frame counts as v1 (src/Root.tsx).
render Launch        out/v2/sacarta-launch-v2.mp4      4950 sacarta-launch-v2.mp4
render Tour          out/v2/sacarta-tour-16x9-v2.mp4   1800 sacarta-tour-16x9-v2.mp4
render Reel          out/v2/sacarta-reel-16x9-v2.mp4   1684 sacarta-reel-16x9-v2.mp4
render TourVertical  out/v2/sacarta-tour-9x16-v2.mp4   1800 sacarta-tour-9x16-v2.mp4
render ReelVertical  out/v2/sacarta-reel-9x16-v2.mp4   1684 sacarta-reel-9x16-v2.mp4

echo
echo "=== v2 deliverables ==="
ls -la "$DOCS"/sacarta-*-v2.mp4 2>/dev/null
for f in "$DOCS"/sacarta-*-v2.mp4; do
  [ -e "$f" ] && printf '%-32s %s s\n' "$(basename "$f")" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"
done
