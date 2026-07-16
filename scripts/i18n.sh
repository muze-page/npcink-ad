#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="npcink-ad"
LOCALE="zh_CN"
SCRIPT_HANDLE="npcink-ad-block-editor"
LANGUAGES_DIR="$ROOT_DIR/languages"
POT_FILE="$LANGUAGES_DIR/${DOMAIN}.pot"
PO_FILE="$LANGUAGES_DIR/${DOMAIN}-${LOCALE}.po"
MO_FILE="$LANGUAGES_DIR/${DOMAIN}-${LOCALE}.mo"
JSON_FILE="$LANGUAGES_DIR/${DOMAIN}-${LOCALE}-${SCRIPT_HANDLE}.json"
MODE="${1:-check}"

cd "$ROOT_DIR"

for required_command in php pnpm msgcmp msgfmt wp; do
	if ! command -v "$required_command" >/dev/null 2>&1; then
		echo "[i18n] Required command not found: ${required_command}" >&2
		exit 1
	fi
done

WP_CLI_BIN="${WP_CLI_BIN:-$(command -v wp)}"
PHP_BIN="${PHP_BIN:-$(command -v php)}"

run_wp() {
	"$WP_CLI_BIN" "$@"
}

make_pot() {
	local destination="$1"
	run_wp i18n make-pot . "$destination" \
		--slug="$DOMAIN" \
		--domain="$DOMAIN" \
		--headers='{"Report-Msgid-Bugs-To":"https://github.com/muze-page/npcink-ad/issues","POT-Creation-Date":""}' \
		--skip-block-json \
		--exclude=.github,assets/js,dist,node_modules,playwright-report,test-results,tests,vendor
}

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/npcink-ad-i18n.XXXXXX")"
trap 'rm -rf "$TEMP_DIR"' EXIT

refresh_catalogs() {
	pnpm run build
	mkdir -p "$LANGUAGES_DIR"
	make_pot "$POT_FILE"

	if [[ ! -f "$PO_FILE" ]]; then
		echo "[i18n] Missing translation source: ${PO_FILE}" >&2
		exit 1
	fi

	run_wp i18n update-po "$POT_FILE" "$PO_FILE"
	msgfmt --check --check-format -o "$MO_FILE" "$PO_FILE"

	run_wp i18n make-json "$PO_FILE" "$TEMP_DIR" --no-purge --pretty-print
	local generated_json
	local generated_count
	generated_json="$(find "$TEMP_DIR" -maxdepth 1 -type f -name "${DOMAIN}-${LOCALE}-*.json" -print)"
	generated_count="$(printf '%s\n' "$generated_json" | sed '/^$/d' | wc -l | tr -d '[:space:]')"
	if [[ "$generated_count" -ne 1 ]]; then
		echo "[i18n] Expected one JavaScript catalog, found ${generated_count}." >&2
		exit 1
	fi
	mv "$generated_json" "$JSON_FILE"
}

check_catalogs() {
	for required_file in "$POT_FILE" "$PO_FILE" "$MO_FILE" "$JSON_FILE"; do
		if [[ ! -f "$required_file" ]]; then
			echo "[i18n] Missing catalog: ${required_file}" >&2
			exit 1
		fi
	done

	make_pot "$TEMP_DIR/${DOMAIN}.pot"
	msgcmp --use-untranslated "$POT_FILE" "$TEMP_DIR/${DOMAIN}.pot"
	msgcmp --use-untranslated "$TEMP_DIR/${DOMAIN}.pot" "$POT_FILE"
	msgcmp "$PO_FILE" "$POT_FILE"

	local statistics
	statistics="$(msgfmt --check --check-format --statistics -o "$TEMP_DIR/${DOMAIN}-${LOCALE}.mo" "$PO_FILE" 2>&1)"
	echo "[i18n] ${statistics}"
	if [[ "$statistics" == *untranslated* || "$statistics" == *fuzzy* ]]; then
		echo "[i18n] The Simplified Chinese catalog is incomplete." >&2
		exit 1
	fi
	cmp "$MO_FILE" "$TEMP_DIR/${DOMAIN}-${LOCALE}.mo"

	run_wp i18n make-json "$PO_FILE" "$TEMP_DIR" --no-purge --pretty-print
	local generated_json
	local generated_count
	generated_json="$(find "$TEMP_DIR" -maxdepth 1 -type f -name "${DOMAIN}-${LOCALE}-*.json" -print)"
	generated_count="$(printf '%s\n' "$generated_json" | sed '/^$/d' | wc -l | tr -d '[:space:]')"
	if [[ "$generated_count" -ne 1 ]]; then
		echo "[i18n] Expected one generated JavaScript catalog, found ${generated_count}." >&2
		exit 1
	fi

	"$PHP_BIN" -r '
		$committed = json_decode((string) file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
		$generated = json_decode((string) file_get_contents($argv[2]), true, 512, JSON_THROW_ON_ERROR);
		unset($committed["generator"], $generated["generator"]);
		if ($committed != $generated) {
			fwrite(STDERR, "[i18n] The JavaScript translation catalog is stale.\n");
			exit(1);
		}
	' "$JSON_FILE" "$generated_json"

	echo "[i18n] OK: complete ${LOCALE} PHP and JavaScript catalogs"
}

case "$MODE" in
	refresh)
		refresh_catalogs
		check_catalogs
		;;
	check)
		check_catalogs
		;;
	*)
		echo "Usage: scripts/i18n.sh [refresh|check]" >&2
		exit 2
		;;
esac
