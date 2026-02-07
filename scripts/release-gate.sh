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
  PLAYWRIGHT_CACHE_DIR="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/Library/Caches/ms-playwright}"
  CHROMIUM_EXECUTABLE="$(pnpm exec node -e "const fs=require('fs');const { chromium }=require('@playwright/test');const p=chromium.executablePath();process.stdout.write(p);" 2>/dev/null || true)"
  HAS_CHROMIUM=0
  HAS_CHROMIUM_SHELL=0

  if [[ -n "$CHROMIUM_EXECUTABLE" && -x "$CHROMIUM_EXECUTABLE" ]]; then
    HAS_CHROMIUM=1
  fi

  for shell_path in "$PLAYWRIGHT_CACHE_DIR"/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell; do
    if [[ -x "$shell_path" ]]; then
      HAS_CHROMIUM_SHELL=1
      break
    fi
  done

  if [[ "$HAS_CHROMIUM" -eq 1 && "$HAS_CHROMIUM_SHELL" -eq 1 ]]; then
    echo "[release-gate] Playwright Chromium already installed, skip install"
  else
    echo "[release-gate] Playwright Chromium not found, installing..."
    pnpm exec playwright install chromium
  fi

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
