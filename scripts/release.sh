#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR_NAME="npcink-ad"
DIST_DIR="$ROOT_DIR/dist"
STAGING_DIR="$DIST_DIR/$PLUGIN_DIR_NAME"

cd "$ROOT_DIR"

VERSION="$(sed -nE 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*([^[:space:]]+).*/\1/p' npcink-ad.php | head -n 1)"
if [[ -z "$VERSION" ]]; then
  echo "[release] Plugin version is missing from npcink-ad.php" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
rm -rf "$STAGING_DIR"

RELEASE_ZIP="$DIST_DIR/${PLUGIN_DIR_NAME}-${VERSION}.zip"
RELEASE_CHECKSUM="${RELEASE_ZIP}.sha256"
rm -f "$RELEASE_ZIP" "$RELEASE_CHECKSUM"

rsync -am \
  --exclude-from="$ROOT_DIR/.distignore" \
  "$ROOT_DIR/" "$STAGING_DIR/"

cd "$DIST_DIR"
LC_ALL=C zip -X -rq "${PLUGIN_DIR_NAME}-${VERSION}.zip" "$PLUGIN_DIR_NAME"
rm -rf "$STAGING_DIR"
php -r '
	$file = $argv[1];
	$checksum_file = $argv[2];
	$checksum = hash_file("sha256", $file);
	if (false === $checksum || false === file_put_contents($checksum_file, $checksum . "  " . basename($file) . PHP_EOL)) {
		fwrite(STDERR, "Could not create the release checksum.\n");
		exit(1);
	}
' "$RELEASE_ZIP" "$RELEASE_CHECKSUM"

echo "Release package created: ${RELEASE_ZIP}"
echo "SHA-256 checksum created: ${RELEASE_CHECKSUM}"
