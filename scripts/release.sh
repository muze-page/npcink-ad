#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR_NAME="$(basename "$ROOT_DIR")"
DIST_DIR="$ROOT_DIR/dist"
STAGING_DIR="$DIST_DIR/$PLUGIN_DIR_NAME"

cd "$ROOT_DIR"

VERSION=$(grep -E "^ \* Version:" -m1 magick-ad.php | awk -F': ' '{print $2}')
if [[ -z "${VERSION}" ]]; then
  VERSION="dev"
fi

mkdir -p "$DIST_DIR"
rm -rf "$STAGING_DIR"

if command -v npm >/dev/null 2>&1; then
  npm run build
fi

if command -v wp >/dev/null 2>&1; then
  mkdir -p languages
  wp i18n make-pot . languages/magick-ad.pot \
    --domain=magick-ad \
    --exclude=node_modules,build,assets/js,docs,dist,vendor
fi

rsync -a \
  --exclude-from="$ROOT_DIR/.distignore" \
  "$ROOT_DIR/" "$STAGING_DIR/"

cd "$DIST_DIR"
rm -f "${PLUGIN_DIR_NAME}-${VERSION}.zip"
zip -r "${PLUGIN_DIR_NAME}-${VERSION}.zip" "$PLUGIN_DIR_NAME" >/dev/null
echo "Release package created: ${DIST_DIR}/${PLUGIN_DIR_NAME}-${VERSION}.zip"
