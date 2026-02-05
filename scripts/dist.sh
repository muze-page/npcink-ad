#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${ROOT}/dist/magick-ad"

rm -rf "${DEST}"
mkdir -p "${DEST}"

rsync -a --delete \
  --exclude-from="${ROOT}/.distignore" \
  "${ROOT}/" \
  "${DEST}/"

echo "Dist built at: ${DEST}"
