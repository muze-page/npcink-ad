#!/bin/sh

set -eu

PLAYGROUND_CLI_VERSION='3.1.44'
WP_VERSION="${WP_VERSION:-6.5}"
PHP_VERSION="${PHP_VERSION:-8.1}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
PLUGIN_VERSION=$(sed -n '/^[[:space:]]*\*[[:space:]]*Version:/ { s/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*//; p; q; }' "$PROJECT_DIR/npcink-ad.php")

if [ -z "$PLUGIN_VERSION" ]; then
	echo 'Could not read the plugin Version header from npcink-ad.php.' >&2
	exit 1
fi

PLUGIN_ZIP="${PLUGIN_ZIP:-$PROJECT_DIR/dist/npcink-ad-$PLUGIN_VERSION.zip}"
OUTPUT_PATH="${OUTPUT_PATH:-}"

for command_name in node npx jq php; do
	if ! command -v "$command_name" >/dev/null 2>&1; then
		echo "Missing required command: $command_name" >&2
		exit 1
	fi
done

if [ ! -f "$PLUGIN_ZIP" ]; then
	echo "Plugin ZIP not found: $PLUGIN_ZIP" >&2
	exit 1
fi

TEMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/npcink-ad-scale-benchmark.XXXXXX")
cleanup() {
	rm -rf "$TEMP_DIR"
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$TEMP_DIR/results"
cp "$PLUGIN_ZIP" "$TEMP_DIR/npcink-ad.zip"
cp "$SCRIPT_DIR/benchmark.php" "$TEMP_DIR/benchmark.php"
jq \
	--arg wordpress "$WP_VERSION" \
	--arg php "$PHP_VERSION" \
	'.preferredVersions = {php: $php, wp: $wordpress}' \
	"$SCRIPT_DIR/blueprint.json" > "$TEMP_DIR/blueprint.json"

npx -y "@wp-playground/cli@$PLAYGROUND_CLI_VERSION" run-blueprint \
	--blueprint="$TEMP_DIR/blueprint.json" \
	--blueprint-may-read-adjacent-files \
	--mount="$TEMP_DIR/results:/wordpress/wp-content/npcink-ad-performance-results" \
	--wp="$WP_VERSION" \
	--verbosity=normal

RESULT_FILE="$TEMP_DIR/results/result.json"
if [ ! -f "$RESULT_FILE" ]; then
	echo 'Playground did not produce a benchmark result.' >&2
	exit 1
fi

PLUGIN_SHA256=$(php -r '$hash = hash_file("sha256", $argv[1]); if (false === $hash) { exit(1); } echo $hash;' "$PLUGIN_ZIP")
ENRICHED_RESULT="$TEMP_DIR/enriched-result.json"
jq \
	--arg zip "$(basename "$PLUGIN_ZIP")" \
	--arg sha256 "$PLUGIN_SHA256" \
	'.artifact = {zip: $zip, sha256: $sha256}' \
	"$RESULT_FILE" > "$ENRICHED_RESULT"

ACTUAL_STATUS=$(jq -r '.status' "$ENRICHED_RESULT")
ACTUAL_WORDPRESS=$(jq -r '.wordpress' "$ENRICHED_RESULT")
ACTUAL_PHP=$(jq -r '.php' "$ENRICHED_RESULT")

if [ -n "$OUTPUT_PATH" ]; then
	mkdir -p "$(dirname "$OUTPUT_PATH")"
	cp "$ENRICHED_RESULT" "$OUTPUT_PATH"
fi

if [ "$ACTUAL_STATUS" != 'NPCINK_AD_SCALE_BENCHMARK_OK' ]; then
	jq . "$ENRICHED_RESULT"
	echo "Unexpected benchmark status: $ACTUAL_STATUS" >&2
	exit 1
fi

case "$PHP_VERSION" in
	latest)
		;;
	*)
		case "$ACTUAL_PHP" in
			"$PHP_VERSION".*) ;;
			*)
				echo "Requested PHP $PHP_VERSION but Playground ran $ACTUAL_PHP" >&2
				exit 1
				;;
		esac
		;;
esac

case "$WP_VERSION" in
	latest|nightly|beta)
		;;
	*)
		case "$ACTUAL_WORDPRESS" in
			"$WP_VERSION"|"$WP_VERSION".*) ;;
			*)
				echo "Requested WordPress $WP_VERSION but Playground ran $ACTUAL_WORDPRESS" >&2
				exit 1
				;;
		esac
		;;
esac
jq . "$ENRICHED_RESULT"
