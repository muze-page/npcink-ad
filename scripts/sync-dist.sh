#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${ROOT}/dist/magick-ad"

if [[ ! -d "${DEST}" ]]; then
  echo "Dist folder not found: ${DEST}" >&2
  exit 1
fi

rsync -a "${ROOT}/src/" "${DEST}/src/"
rsync -a "${ROOT}/assets/" "${DEST}/assets/"
rsync -a "${ROOT}/templates/" "${DEST}/templates/"

cp -f "${ROOT}/magick-ad.php" "${DEST}/magick-ad.php"
cp -f "${ROOT}/uninstall.php" "${DEST}/uninstall.php"
cp -f "${ROOT}/readme.txt" "${DEST}/readme.txt"
cp -f "${ROOT}/LICENSE" "${DEST}/LICENSE"

echo "Dist synced to: ${DEST}"
