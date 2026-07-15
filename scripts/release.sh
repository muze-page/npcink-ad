#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR_NAME="magick-ad"
DIST_DIR="$ROOT_DIR/dist"
STAGING_DIR="$DIST_DIR/$PLUGIN_DIR_NAME"

cd "$ROOT_DIR"

VERSION="$(sed -nE 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*([^[:space:]]+).*/\1/p' magick-ad.php | head -n 1)"
if [[ -z "$VERSION" ]]; then
  echo "[release] Plugin version is missing from magick-ad.php" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
rm -rf "$STAGING_DIR"

rsync -am \
  --exclude-from="$ROOT_DIR/.distignore" \
  "$ROOT_DIR/" "$STAGING_DIR/"

cd "$DIST_DIR"
rm -f "${PLUGIN_DIR_NAME}-${VERSION}.zip"
LC_ALL=C zip -X -rq "${PLUGIN_DIR_NAME}-${VERSION}.zip" "$PLUGIN_DIR_NAME"
rm -rf "$STAGING_DIR"
echo "Release package created: ${DIST_DIR}/${PLUGIN_DIR_NAME}-${VERSION}.zip"
