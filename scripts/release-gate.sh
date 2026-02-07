#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR_NAME="$(basename "$ROOT_DIR")"

cd "$ROOT_DIR"

echo "[release-gate] 1/5 Build admin assets"
pnpm run build

echo "[release-gate] 2/5 PHP syntax check"
if command -v php >/dev/null 2>&1; then
  find src -name "*.php" -print0 | xargs -0 -n 1 php -l >/dev/null
  php -l magick-ad.php >/dev/null
  php -l uninstall.php >/dev/null
else
  echo "[release-gate] php not found, skip php lint"
fi

echo "[release-gate] 3/5 Optional E2E matrix"
if [[ -n "${MAGICK_AD_E2E_PREVIEW_PATH:-}" ]]; then
  pnpm exec playwright install chromium
  pnpm run test:e2e
else
  echo "[release-gate] MAGICK_AD_E2E_PREVIEW_PATH not set, skip e2e"
fi

echo "[release-gate] 4/5 Build release zip"
bash scripts/release.sh

echo "[release-gate] 5/5 Verify artifact"
LATEST_ZIP="$(ls -t dist/${PLUGIN_DIR_NAME}-*.zip 2>/dev/null | head -n 1 || true)"
if [[ -z "$LATEST_ZIP" ]]; then
  echo "[release-gate] release zip not found in dist/" >&2
  exit 1
fi
echo "[release-gate] OK: ${LATEST_ZIP}"
