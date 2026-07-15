#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR_NAME="npcink-ad"

cd "$ROOT_DIR"

for required_command in php composer pnpm rsync zip unzip wp msgcmp msgfmt; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "[release-gate] Required command not found: ${required_command}" >&2
    exit 1
  fi
done

echo "[release-gate] 1/8 PHP syntax check"
while IFS= read -r -d '' php_file; do
  php -l "$php_file" >/dev/null
done < <(
  find . -type f -name '*.php' \
    -not -path './vendor/*' \
    -not -path './node_modules/*' \
    -not -path './dist/*' \
    -print0
)

echo "[release-gate] 2/8 Composer checks"
composer check

echo "[release-gate] 3/8 Frontend type and lint checks"
pnpm run typecheck
pnpm run lint:js
pnpm run lint:style

echo "[release-gate] 4/8 Build production assets once"
pnpm run build

echo "[release-gate] 5/8 Translation catalog checks"
composer run i18n:check

echo "[release-gate] 6/8 Build contract and strict bundle budget checks"
REQUIRES_WORDPRESS="$(sed -nE 's/^[[:space:]]*\*[[:space:]]*Requires at least:[[:space:]]*([^[:space:]]+).*/\1/p' npcink-ad.php | head -n 1)"
if [[ -z "$REQUIRES_WORDPRESS" ]]; then
  echo "[release-gate] Requires at least is missing from npcink-ad.php" >&2
  exit 1
fi

if php -r 'exit(version_compare($argv[1], "6.6", "<") ? 0 : 1);' "$REQUIRES_WORDPRESS"; then
  if grep -Fq 'react-jsx-runtime' build/index.asset.php; then
    echo "[release-gate] build/index.asset.php requires react-jsx-runtime, which is unavailable before WordPress 6.6" >&2
    exit 1
  fi
fi

INDEX_JS_BUDGET_KB="${NPCINK_AD_BUNDLE_MAX_INDEX_JS_KB:-40}"
INDEX_CSS_BUDGET_KB="${NPCINK_AD_BUNDLE_MAX_INDEX_CSS_KB:-20}"
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
    echo "[release-gate] ERROR: ${label} ${size_kb} KiB exceeds budget ${budget_kb} KiB" >&2
    BUDGET_FAILED=1
  else
    echo "[release-gate] OK: ${label} ${size_kb} KiB (budget ${budget_kb} KiB)"
  fi
}

check_bundle_budget "build/index.js" "build/index.js" "$INDEX_JS_BUDGET_KB"
check_bundle_budget "build/index.css" "build/index.css" "$INDEX_CSS_BUDGET_KB"

if [[ "$BUDGET_FAILED" -eq 1 ]]; then
  exit 1
fi

echo "[release-gate] 7/8 Build release zip"
bash scripts/release.sh

echo "[release-gate] 8/8 Verify artifact"
PLUGIN_VERSION="$(sed -nE 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*([^[:space:]]+).*/\1/p' npcink-ad.php | head -n 1)"
if [[ -z "$PLUGIN_VERSION" ]]; then
  echo "[release-gate] Version is missing from npcink-ad.php" >&2
  exit 1
fi
LATEST_ZIP="dist/${PLUGIN_DIR_NAME}-${PLUGIN_VERSION}.zip"
if [[ ! -f "$LATEST_ZIP" ]]; then
  echo "[release-gate] Expected release zip not found: ${LATEST_ZIP}" >&2
  exit 1
fi

ZIP_ENTRIES="$(unzip -Z1 "$LATEST_ZIP")"

require_zip_entry() {
  local required_entry="$1"
  if ! grep -Fxq "$required_entry" <<<"$ZIP_ENTRIES"; then
    echo "[release-gate] Required release entry missing: ${required_entry}" >&2
    exit 1
  fi
}

reject_zip_prefix() {
  local rejected_prefix="$1"
  if grep -Fq "${PLUGIN_DIR_NAME}/${rejected_prefix}" <<<"$ZIP_ENTRIES"; then
    echo "[release-gate] Forbidden release content found: ${rejected_prefix}" >&2
    exit 1
  fi
}

if grep -Ev "^${PLUGIN_DIR_NAME}(/|$)" <<<"$ZIP_ENTRIES" | grep -q .; then
  echo "[release-gate] Release zip contains entries outside ${PLUGIN_DIR_NAME}/" >&2
  exit 1
fi

REQUIRED_ZIP_ENTRIES=(
  "${PLUGIN_DIR_NAME}/LICENSE"
  "${PLUGIN_DIR_NAME}/npcink-ad.php"
  "${PLUGIN_DIR_NAME}/readme.txt"
  "${PLUGIN_DIR_NAME}/uninstall.php"
  "${PLUGIN_DIR_NAME}/assets/blocks/npcink-ad-promotion/block.json"
  "${PLUGIN_DIR_NAME}/assets/css/admin-preview.css"
  "${PLUGIN_DIR_NAME}/assets/css/frontend.css"
  "${PLUGIN_DIR_NAME}/build/index.asset.php"
  "${PLUGIN_DIR_NAME}/build/index.css"
  "${PLUGIN_DIR_NAME}/build/index.js"
  "${PLUGIN_DIR_NAME}/languages/npcink-ad.pot"
  "${PLUGIN_DIR_NAME}/languages/npcink-ad-zh_CN.po"
  "${PLUGIN_DIR_NAME}/languages/npcink-ad-zh_CN.mo"
  "${PLUGIN_DIR_NAME}/languages/npcink-ad-zh_CN-npcink-ad-block-editor.json"
  "${PLUGIN_DIR_NAME}/src/Admin/Menu.php"
  "${PLUGIN_DIR_NAME}/src/Admin/Editor.php"
  "${PLUGIN_DIR_NAME}/src/Admin/Preview_Page.php"
  "${PLUGIN_DIR_NAME}/src/Blocks/Blocks.php"
  "${PLUGIN_DIR_NAME}/src/Blocks/Patterns.php"
  "${PLUGIN_DIR_NAME}/src/Data/Post_Types.php"
  "${PLUGIN_DIR_NAME}/src/Data/Repository.php"
  "${PLUGIN_DIR_NAME}/src/Data/Roles.php"
  "${PLUGIN_DIR_NAME}/src/Domain/Eligibility_Evaluator.php"
  "${PLUGIN_DIR_NAME}/src/Frontend/Delivery.php"
  "${PLUGIN_DIR_NAME}/src/Frontend/Preview_Request.php"
  "${PLUGIN_DIR_NAME}/src/Frontend/Renderer.php"
  "${PLUGIN_DIR_NAME}/src/REST/Core_Rest_Guard.php"
  "${PLUGIN_DIR_NAME}/src/Lifecycle.php"
  "${PLUGIN_DIR_NAME}/src/Plugin.php"
)

for required_entry in "${REQUIRED_ZIP_ENTRIES[@]}"; do
  require_zip_entry "$required_entry"
done

PACKAGE_AUDIT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/npcink-ad-package.XXXXXX")"
trap 'rm -rf "$PACKAGE_AUDIT_DIR"' EXIT
unzip -q "$LATEST_ZIP" -d "$PACKAGE_AUDIT_DIR"
if grep -RIni 'magick' "$PACKAGE_AUDIT_DIR/$PLUGIN_DIR_NAME"; then
  echo "[release-gate] Legacy Magick identifier found in release artifact" >&2
  exit 1
fi

for rejected_prefix in \
  '.git' \
  'node_modules/' \
  'vendor/' \
  'assets/js/' \
  'tests/' \
  'docs/'; do
  reject_zip_prefix "$rejected_prefix"
done

echo "[release-gate] OK: ${LATEST_ZIP}"
