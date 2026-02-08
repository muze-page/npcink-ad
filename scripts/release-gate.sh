#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR_NAME="$(basename "$ROOT_DIR")"

cd "$ROOT_DIR"

echo "[release-gate] 1/6 Build admin assets"
pnpm run build

echo "[release-gate] 2/6 Bundle budget check"
INDEX_JS_BUDGET_KB="${MAGICK_AD_BUNDLE_MAX_INDEX_JS_KB:-180}"
INDEX_CSS_BUDGET_KB="${MAGICK_AD_BUNDLE_MAX_INDEX_CSS_KB:-60}"
BUDGET_STRICT="${MAGICK_AD_BUNDLE_BUDGET_STRICT:-1}"
BUDGET_FAILED=0

check_bundle_budget() {
  local label="$1"
  local file_path="$2"
  local budget_kb="$3"

  if [[ ! -f "$file_path" ]]; then
    echo "[release-gate] missing bundle file: ${file_path}" >&2
    exit 1
  fi

  local bytes
  local size_kb
  bytes="$(wc -c < "$file_path" | tr -d '[:space:]')"
  size_kb=$(( (bytes + 1023) / 1024 ))

  if (( size_kb > budget_kb )); then
    echo "[release-gate] WARN: ${label} ${size_kb} KiB exceeds budget ${budget_kb} KiB"
    BUDGET_FAILED=1
  else
    echo "[release-gate] OK: ${label} ${size_kb} KiB (budget ${budget_kb} KiB)"
  fi
}

check_bundle_budget "build/index.js" "build/index.js" "$INDEX_JS_BUDGET_KB"
check_bundle_budget "build/index.css" "build/index.css" "$INDEX_CSS_BUDGET_KB"

if [[ "$BUDGET_FAILED" -eq 1 ]]; then
  if [[ "$BUDGET_STRICT" == "1" ]]; then
    echo "[release-gate] Bundle budget check failed. You can temporarily set MAGICK_AD_BUNDLE_BUDGET_STRICT=0 to warn only." >&2
    exit 1
  fi
  echo "[release-gate] Bundle budget exceeded, continue because MAGICK_AD_BUNDLE_BUDGET_STRICT=0"
fi

echo "[release-gate] 3/6 PHP syntax check"
if command -v php >/dev/null 2>&1; then
  find src -name "*.php" -print0 | xargs -0 -n 1 php -l >/dev/null
  php -l magick-ad.php >/dev/null
  php -l uninstall.php >/dev/null
else
  echo "[release-gate] php not found, skip php lint"
fi

echo "[release-gate] 4/6 Optional E2E matrix"
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
    pnpm exec playwright install chromium chromium-headless-shell
  fi

  pnpm run test:e2e
else
  echo "[release-gate] MAGICK_AD_E2E_PREVIEW_PATH not set, skip e2e"
fi

echo "[release-gate] 5/6 Build release zip"
bash scripts/release.sh

echo "[release-gate] 6/6 Verify artifact"
LATEST_ZIP="$(ls -t dist/${PLUGIN_DIR_NAME}-*.zip 2>/dev/null | head -n 1 || true)"
if [[ -z "$LATEST_ZIP" ]]; then
  echo "[release-gate] release zip not found in dist/" >&2
  exit 1
fi
echo "[release-gate] OK: ${LATEST_ZIP}"
