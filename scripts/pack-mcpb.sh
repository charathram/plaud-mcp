#!/bin/bash
set -euo pipefail

VERSION=$(jq -r .version package.json)
STAGING=$(mktemp -d)
trap 'rm -rf "$STAGING"' EXIT

mkdir -p "$STAGING/bin" dist

echo "Compiling darwin-arm64 binary..."
bun build --compile --target=bun-darwin-arm64 \
  --outfile "$STAGING/bin/plaud-mcp" src/index.ts
chmod +x "$STAGING/bin/plaud-mcp"

# Ad-hoc sign the binary. Without a valid signature the kernel logs "load
# code signature error 4", tccd denies entitlements, and Claude Desktop's
# subprocess runs restricted (can't reach HOME/tmpdir, gets killed shortly
# after startup). Bun --compile leaves an empty LC_CODE_SIGNATURE stub that
# codesign rejects, so we strip it before re-signing.
echo "Ad-hoc signing binary..."
codesign --remove-signature "$STAGING/bin/plaud-mcp"
codesign --force --sign - "$STAGING/bin/plaud-mcp"
codesign -dv "$STAGING/bin/plaud-mcp" 2>&1 | head -3

echo "Staging manifest + docs (version: $VERSION)..."
jq --arg v "$VERSION" '.version = $v' manifest.json > "$STAGING/manifest.json"
cp README.md LICENSE "$STAGING/"

OUTFILE="dist/plaud-mcp-${VERSION}-darwin-arm64.mcpb"

echo "Validating manifest..."
bunx @anthropic-ai/mcpb validate "$STAGING/manifest.json"

echo "Packing $OUTFILE..."
bunx @anthropic-ai/mcpb pack "$STAGING" "$OUTFILE"

echo ""
echo "Packed:"
ls -lh "$OUTFILE"
