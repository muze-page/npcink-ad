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

echo "[release-gate] 1/9 Version contract"
PLUGIN_VERSION="$(sed -nE 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*([^[:space:]]+).*/\1/p' npcink-ad.php | head -n 1)"
CONSTANT_VERSION="$(sed -nE "s/^[[:space:]]*define\([[:space:]]*'NPCINK_AD_VERSION',[[:space:]]*'([^']+)'[[:space:]]*\);.*/\1/p" npcink-ad.php | head -n 1)"
PACKAGE_VERSION="$(php -r '$package = json_decode((string) file_get_contents("package.json"), true, 512, JSON_THROW_ON_ERROR); echo isset($package["version"]) ? $package["version"] : "";')"
STABLE_TAG="$(sed -nE 's/^Stable tag:[[:space:]]*([^[:space:]]+).*/\1/p' readme.txt | head -n 1)"

if [[ -z "$PLUGIN_VERSION" ]]; then
  echo "[release-gate] Version is missing from npcink-ad.php" >&2
  exit 1
fi

check_version_match() {
  local label="$1"
  local actual="$2"

  if [[ -z "$actual" ]]; then
    echo "[release-gate] ${label} version is missing" >&2
    exit 1
  fi
  if [[ "$actual" != "$PLUGIN_VERSION" ]]; then
    echo "[release-gate] ${label} version ${actual} does not match plugin version ${PLUGIN_VERSION}" >&2
    exit 1
  fi
}

check_version_match "NPCINK_AD_VERSION" "$CONSTANT_VERSION"
check_version_match "package.json" "$PACKAGE_VERSION"
check_version_match "readme.txt Stable tag" "$STABLE_TAG"

if [[ "${GITHUB_REF_TYPE:-}" == "tag" ]]; then
  EXPECTED_TAG="v${PLUGIN_VERSION}"
  if [[ "${GITHUB_REF_NAME:-}" != "$EXPECTED_TAG" ]]; then
    echo "[release-gate] Tag ${GITHUB_REF_NAME:-<missing>} does not match expected ${EXPECTED_TAG}" >&2
    exit 1
  fi
fi

echo "[release-gate] 2/9 PHP syntax check"
while IFS= read -r -d '' php_file; do
  php -l "$php_file" >/dev/null
done < <(
  find . -type f -name '*.php' \
    -not -path './vendor/*' \
    -not -path './node_modules/*' \
    -not -path './dist/*' \
    -print0
)

echo "[release-gate] 3/9 Composer checks"
composer check

echo "[release-gate] 4/9 Frontend type and lint checks"
pnpm run typecheck
pnpm run test:js
pnpm run lint:js
pnpm run lint:style

echo "[release-gate] 5/9 Build production assets once"
pnpm run build

echo "[release-gate] 6/9 Translation catalog checks"
composer run i18n:check

echo "[release-gate] 7/9 Build contract and strict bundle budget checks"
REQUIRES_WORDPRESS="$(sed -nE 's/^[[:space:]]*\*[[:space:]]*Requires at least:[[:space:]]*([^[:space:]]+).*/\1/p' npcink-ad.php | head -n 1)"
if [[ -z "$REQUIRES_WORDPRESS" ]]; then
  echo "[release-gate] Requires at least is missing from npcink-ad.php" >&2
  exit 1
fi

if php -r 'exit(version_compare($argv[1], "6.6", "<") ? 0 : 1);' "$REQUIRES_WORDPRESS"; then
  php -r '
    $asset_file = $argv[1];
    $requires_wordpress = $argv[2];
    if (!is_file($asset_file)) {
      fwrite(STDERR, "[release-gate] Missing build asset manifest: {$asset_file}\n");
      exit(1);
    }

    $asset = require $asset_file;
    if (!is_array($asset) || !array_key_exists("dependencies", $asset) || !is_array($asset["dependencies"])) {
      fwrite(STDERR, "[release-gate] build/index.asset.php must return a dependencies array\n");
      exit(1);
    }

    $dependencies = $asset["dependencies"];
    foreach ($dependencies as $dependency) {
      if (!is_string($dependency) || "" === $dependency) {
        fwrite(STDERR, "[release-gate] build/index.asset.php contains an invalid dependency entry\n");
        exit(1);
      }
    }

    if (in_array("react-jsx-runtime", $dependencies, true)) {
      fwrite(STDERR, "[release-gate] build/index.asset.php requires react-jsx-runtime, which is unavailable before WordPress 6.6\n");
      exit(1);
    }

    if (!in_array("wp-edit-post", $dependencies, true)) {
      fwrite(STDERR, "[release-gate] build/index.asset.php must require wp-edit-post when Requires at least is {$requires_wordpress}; WordPress 6.5 needs it for the Promotion editor SlotFill compatibility fallback\n");
      exit(1);
    }
  ' build/index.asset.php "$REQUIRES_WORDPRESS"
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

echo "[release-gate] 8/9 Build release zip"
bash scripts/release.sh

echo "[release-gate] 9/9 Verify artifact"
RELEASE_ZIP="dist/${PLUGIN_DIR_NAME}-${PLUGIN_VERSION}.zip"
if [[ ! -f "$RELEASE_ZIP" ]]; then
  echo "[release-gate] Expected release zip not found: ${RELEASE_ZIP}" >&2
  exit 1
fi

ZIP_ENTRIES="$(unzip -Z1 "$RELEASE_ZIP")"

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
  "${PLUGIN_DIR_NAME}/src/Admin/Promotion_List.php"
  "${PLUGIN_DIR_NAME}/src/Admin/Promotion_Status_Action.php"
  "${PLUGIN_DIR_NAME}/src/Blocks/Blocks.php"
  "${PLUGIN_DIR_NAME}/src/Blocks/Patterns.php"
  "${PLUGIN_DIR_NAME}/src/Data/Post_Types.php"
  "${PLUGIN_DIR_NAME}/src/Data/Repository.php"
  "${PLUGIN_DIR_NAME}/src/Data/Roles.php"
  "${PLUGIN_DIR_NAME}/src/Domain/Eligibility_Evaluator.php"
  "${PLUGIN_DIR_NAME}/src/Domain/Overlap_Detector.php"
  "${PLUGIN_DIR_NAME}/src/Frontend/Classic_Paragraph_Tag_Processor.php"
  "${PLUGIN_DIR_NAME}/src/Frontend/Delivery.php"
  "${PLUGIN_DIR_NAME}/src/Frontend/Paragraph_Inserter.php"
  "${PLUGIN_DIR_NAME}/src/Frontend/Preview_Request.php"
  "${PLUGIN_DIR_NAME}/src/Frontend/Renderer.php"
  "${PLUGIN_DIR_NAME}/src/Presentation/Eligibility_Messages.php"
  "${PLUGIN_DIR_NAME}/src/REST/Core_Rest_Guard.php"
  "${PLUGIN_DIR_NAME}/src/REST/Promotion_Preflight.php"
  "${PLUGIN_DIR_NAME}/src/Lifecycle.php"
  "${PLUGIN_DIR_NAME}/src/Plugin.php"
)

for required_entry in "${REQUIRED_ZIP_ENTRIES[@]}"; do
  require_zip_entry "$required_entry"
done

PACKAGE_AUDIT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/npcink-ad-package.XXXXXX")"
trap 'rm -rf "$PACKAGE_AUDIT_DIR"' EXIT
unzip -q "$RELEASE_ZIP" -d "$PACKAGE_AUDIT_DIR"
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

echo "[release-gate] OK: ${RELEASE_ZIP}"
