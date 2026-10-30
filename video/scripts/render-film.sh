#!/bin/bash
# Renders a composition in chunks and muxes its audio back in.
#
# Chunked because a 2 CPU / 3.8 GB box cannot hold one Chrome session across
# thousands of frames without the renderer's memory creeping. Each chunk starts
# clean, the temp bundles are swept between them, and a finished chunk is never
# re-rendered, so a killed run costs one chunk instead of the whole film.
#
#   scripts/render-film.sh Launch out/sacarta-launch.mp4 4950 [chunkSize]
#
# Run it detached, or it dies with the shell that started it:
#   setsid nohup scripts/render-film.sh Launch out/x.mp4 4950 > out/x.log 2>&1 &
set -e
cd "$(dirname "$0")/.."
COMP=${1:?composition id}
OUT=${2:?output path}
TOTAL=${3:?total frames}
CHUNK=${4:-450}

export TMPDIR="$(pwd)/.rtmp"
mkdir -p out/chunks .rtmp
rm -f "out/chunks/partial_${COMP}.mp4" "out/chunks/${COMP}.txt"

# If a bundle was prebuilt with `npx remotion bundle --out-dir=out/bundle`,
# render from it so every chunk skips the webpack re-bundle (~6-7 min each).
# The bundle lives in out/bundle and is imported as the first positional arg.
if [ -d "out/bundle" ] && [ -f "out/bundle/index.html" ]; then
  ENTRY="out/bundle"
  echo "=== ${COMP}: using prebuilt bundle (out/bundle) ==="
else
  ENTRY="$COMP"
  echo "=== ${COMP}: no prebuilt bundle, compiling per chunk ==="
fi

i=0
while [ "$i" -lt "$TOTAL" ]; do
  end=$((i + CHUNK - 1))
  [ "$end" -ge "$TOTAL" ] && end=$((TOTAL - 1))
  pad=$(printf "%05d" "$i")
  target="out/chunks/${COMP}_${pad}.mp4"
  if [ -s "$target" ]; then
    echo "=== ${COMP} frames ${i}-${end} (cached) ==="
  else
    echo "=== ${COMP} frames ${i}-${end} ==="
    # Render to a scratch name and rename on success, so an interrupted chunk is
    # never mistaken for a finished one. The scratch name keeps the .mp4
    # extension because Remotion picks its codec from the extension.
    scratch="out/chunks/partial_${COMP}.mp4"
    npx remotion render "$ENTRY" "$COMP" "$scratch" \
      --frames="${i}-${end}" --concurrency=1 --muted 2>&1 | tail -1
    mv "$scratch" "$target"
  fi
  rm -rf .rtmp/remotion-v4* 2>/dev/null || true
  i=$((end + 1))
done

echo "=== concat video ==="
: > "out/chunks/${COMP}.txt"
for f in "out/chunks/${COMP}_"*.mp4; do
  echo "file '$(pwd)/$f'" >> "out/chunks/${COMP}.txt"
done
ffmpeg -y -loglevel error -f concat -safe 0 -i "out/chunks/${COMP}.txt" -c copy "out/chunks/${COMP}-video.mp4"

echo "=== audio ==="
if [ ! -s "out/chunks/${COMP}-audio.mp3" ]; then
  npx remotion render "$ENTRY" "$COMP" "out/chunks/${COMP}-audio.mp3" --codec=mp3 --concurrency=1 2>&1 | tail -1
fi

echo "=== mux ==="
# LOUDNORM=1 applies a loudness normalization to the final soundtrack (the v2
# films use it so the music bed and the SFX land at a consistent level; v1 was
# rendered without it and is left untouched).
if [ "$LOUDNORM" = "1" ]; then
  ffmpeg -y -loglevel error -i "out/chunks/${COMP}-video.mp4" -i "out/chunks/${COMP}-audio.mp3" \
    -c:v copy -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k -shortest "$OUT"
else
  ffmpeg -y -loglevel error -i "out/chunks/${COMP}-video.mp4" -i "out/chunks/${COMP}-audio.mp3" \
    -c:v copy -c:a aac -b:a 192k -shortest "$OUT"
fi

ls -la "$OUT"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$OUT"
echo "=== done ${COMP} ==="
