#!/bin/bash
set -e

TARGETS=(
  "bun-linux-x64"
  "bun-linux-arm64"
  "bun-darwin-x64"
  "bun-darwin-arm64"
  "bun-windows-x64"
)

mkdir -p dist

for target in "${TARGETS[@]}"; do
  # Extract os and arch from target string (e.g. bun-linux-x64 -> linux-x64)
  suffix="${target#bun-}"
  outfile="dist/plaud-mcp-${suffix}"
  if [[ "$target" == *"windows"* ]]; then
    outfile="${outfile}.exe"
  fi

  echo "Building ${target}..."
  bun build --compile --target="${target}" --outfile "${outfile}" src/index.ts
done

echo ""
echo "All builds complete:"
ls -lh dist/plaud-mcp-*
