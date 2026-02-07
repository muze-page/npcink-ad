#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <release-zip> <plugin-target-dir>" >&2
  echo "Example: $0 dist/magick-ad-0.1.0.zip /var/www/html/wp-content/plugins/magick-ad" >&2
  exit 1
fi

ZIP_FILE="$1"
TARGET_DIR="$2"

if [[ ! -f "$ZIP_FILE" ]]; then
  echo "Release zip not found: $ZIP_FILE" >&2
  exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Target plugin directory not found: $TARGET_DIR" >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
BACKUP_FILE="${WORK_DIR}/magick-ad-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
UNPACK_DIR="${WORK_DIR}/unpack"

mkdir -p "$UNPACK_DIR"

echo "[rollback] backup current plugin directory"
tar -czf "$BACKUP_FILE" -C "$(dirname "$TARGET_DIR")" "$(basename "$TARGET_DIR")"

echo "[rollback] unzip release package"
unzip -q "$ZIP_FILE" -d "$UNPACK_DIR"

SOURCE_DIR="$(find "$UNPACK_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1 || true)"
if [[ -z "$SOURCE_DIR" ]]; then
  echo "[rollback] invalid zip package structure: $ZIP_FILE" >&2
  exit 1
fi

echo "[rollback] sync release to target"
rsync -a --delete "${SOURCE_DIR}/" "${TARGET_DIR}/"

echo "[rollback] done"
echo "[rollback] backup saved at: ${BACKUP_FILE}"
