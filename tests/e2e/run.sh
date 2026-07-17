#!/bin/sh

set -eu

PLAYGROUND_CLI_VERSION='3.1.44'
WP_VERSION="${WP_VERSION:-6.5}"
PHP_VERSION="${PHP_VERSION:-8.1}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
PLUGIN_VERSION=$(sed -n '/^[[:space:]]*\*[[:space:]]*Version:/ { s/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*//; p; q; }' "$PROJECT_DIR/npcink-ad.php")

if [ "$#" -eq 0 ] && [ -z "${NPCINK_AD_E2E_FIXTURE_MODE:-}" ]; then
	NPCINK_AD_E2E_FIXTURE_MODE='standard' "$0"
	NPCINK_AD_E2E_FIXTURE_MODE='first-run' "$0" tests/e2e/first-promotion.spec.ts
	exit 0
fi

FIXTURE_MODE=${NPCINK_AD_E2E_FIXTURE_MODE:-}
if [ -z "$FIXTURE_MODE" ]; then
	FIXTURE_MODE='standard'
	first_run_requested='false'
	regular_spec_requested='false'
	for argument in "$@"; do
		case "$argument" in
			*first-promotion.spec.ts*) first_run_requested='true' ;;
			*.spec.ts*) regular_spec_requested='true' ;;
		esac
	done
	if [ "$first_run_requested" = 'true' ] && [ "$regular_spec_requested" = 'true' ]; then
		echo 'Run first-promotion.spec.ts separately because it requires a clean first-run fixture.' >&2
		exit 1
	fi
	if [ "$first_run_requested" = 'true' ]; then
		FIXTURE_MODE='first-run'
	fi
fi

case "$FIXTURE_MODE" in
	standard) FIXTURE_SOURCE="$SCRIPT_DIR/fixture.php" ;;
	first-run) FIXTURE_SOURCE="$SCRIPT_DIR/first-run-fixture.php" ;;
	theme-bars) FIXTURE_SOURCE="$SCRIPT_DIR/theme-bars-fixture.php" ;;
	*)
		echo "Unknown NPCINK_AD_E2E_FIXTURE_MODE: $FIXTURE_MODE" >&2
		exit 1
		;;
esac

if [ -z "$PLUGIN_VERSION" ]; then
	echo 'Could not read the plugin Version header from npcink-ad.php.' >&2
	exit 1
fi

PLUGIN_ZIP="${PLUGIN_ZIP:-$PROJECT_DIR/dist/npcink-ad-$PLUGIN_VERSION.zip}"

for command_name in curl jq node npx pnpm; do
	if ! command -v "$command_name" >/dev/null 2>&1; then
		echo "Missing required command: $command_name" >&2
		exit 1
	fi
done

if [ ! -f "$PLUGIN_ZIP" ]; then
	echo "Plugin ZIP not found: $PLUGIN_ZIP" >&2
	exit 1
fi

TEMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/npcink-ad-editor-e2e.XXXXXX")
SERVER_PID=''
cleanup() {
	if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
		kill "$SERVER_PID" >/dev/null 2>&1 || true
		wait "$SERVER_PID" >/dev/null 2>&1 || true
	fi
	rm -rf "$TEMP_DIR"
}
trap cleanup EXIT HUP INT TERM

cp "$PLUGIN_ZIP" "$TEMP_DIR/npcink-ad.zip"
mkdir -p "$TEMP_DIR/mu-plugins"
cp "$FIXTURE_SOURCE" "$TEMP_DIR/mu-plugins/npcink-ad-editor-e2e-fixture.php"
cp "$SCRIPT_DIR/health.txt" "$TEMP_DIR/mu-plugins/health.txt"

THEME_SLUG="${NPCINK_AD_E2E_THEME_SLUG:-}"
THEME_ZIP="${NPCINK_AD_E2E_THEME_ZIP:-}"
if { [ -n "$THEME_SLUG" ] && [ -z "$THEME_ZIP" ]; } || { [ -z "$THEME_SLUG" ] && [ -n "$THEME_ZIP" ]; }; then
	echo 'NPCINK_AD_E2E_THEME_SLUG and NPCINK_AD_E2E_THEME_ZIP must be set together.' >&2
	exit 1
fi
if [ -n "$THEME_ZIP" ]; then
	if [ ! -f "$THEME_ZIP" ]; then
		echo "Theme ZIP not found: $THEME_ZIP" >&2
		exit 1
	fi
	cp "$THEME_ZIP" "$TEMP_DIR/theme.zip"
fi

jq \
	--arg wordpress "$WP_VERSION" \
	--arg php "$PHP_VERSION" \
	--arg theme_slug "$THEME_SLUG" \
	'.preferredVersions = {php: $php, wp: $wordpress}
	| if $theme_slug != "" then
		.steps += [{
			"step": "installTheme",
			"themeData": {"resource": "bundled", "path": "/theme.zip"},
			"options": {"activate": true}
		}]
	else . end' \
	"$SCRIPT_DIR/blueprint.json" > "$TEMP_DIR/blueprint.json"

if [ -n "${NPCINK_AD_E2E_PORT:-}" ]; then
	PORT="$NPCINK_AD_E2E_PORT"
else
	PORT=$(node -e 'const server = require("node:net").createServer(); server.listen(0, "127.0.0.1", () => { console.log(server.address().port); server.close(); });')
fi
BASE_URL="http://127.0.0.1:$PORT"
READY_URL="$BASE_URL/wp-json/wp/v2/pages?slug=npcink-ad-selector-e2e-page&_fields=id"
PROMOTION_READY_URL="$BASE_URL/wp-json/wp/v2/npcink_promotion?per_page=1"
HEALTH_URL="$BASE_URL/wp-content/mu-plugins/health.txt"
SERVER_LOG="$TEMP_DIR/playground.log"

cd "$PROJECT_DIR"
npx -y "@wp-playground/cli@$PLAYGROUND_CLI_VERSION" server \
	--blueprint="$TEMP_DIR/blueprint.json" \
	--blueprint-may-read-adjacent-files \
	--mount-before-install="$TEMP_DIR/mu-plugins:/wordpress/wp-content/mu-plugins" \
	--site-url="$BASE_URL" \
	--port="$PORT" \
	--wp="$WP_VERSION" \
	--php="$PHP_VERSION" \
	--verbosity=normal >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

attempt=0
while [ "$attempt" -lt 240 ]; do
	if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
		echo 'WordPress Playground stopped before it became ready.' >&2
		tail -n 200 "$SERVER_LOG" >&2
		exit 1
	fi

	curl --fail --silent --output "$TEMP_DIR/ready.json" "$READY_URL" >/dev/null 2>&1 || true
	promotion_status=$(curl --silent --output /dev/null --write-out '%{http_code}' "$PROMOTION_READY_URL" || true)
	health_status=$(curl --fail --silent "$HEALTH_URL" 2>/dev/null || true)
	if [ "$health_status" = 'NPCINK_AD_E2E_MU_OK' ] && jq -e 'length == 1 and .[0].id > 0' "$TEMP_DIR/ready.json" >/dev/null 2>&1 && { [ "$promotion_status" = '200' ] || [ "$promotion_status" = '401' ]; } && curl --fail --silent --output /dev/null "$BASE_URL/wp-login.php"; then
		break
	fi

	attempt=$((attempt + 1))
	sleep 0.5
done

if ! jq -e 'length == 1 and .[0].id > 0' "$TEMP_DIR/ready.json" >/dev/null 2>&1; then
	echo 'WordPress Playground did not expose the editor fixture page.' >&2
	echo "MU plugin mount health: ${health_status:-<missing>}" >&2
	echo "Promotion REST status: ${promotion_status:-<missing>}" >&2
	tail -n 200 "$SERVER_LOG" >&2
	exit 1
fi

if ! curl --fail --silent --output /dev/null "$BASE_URL/wp-login.php"; then
	echo "WordPress Playground did not become ready at $BASE_URL." >&2
	tail -n 200 "$SERVER_LOG" >&2
	exit 1
fi

echo "Running $FIXTURE_MODE editor E2E against WordPress $WP_VERSION / PHP $PHP_VERSION at $BASE_URL"
if ! NPCINK_AD_E2E_BASE_URL="$BASE_URL" \
	NPCINK_AD_E2E_FIXTURE_MODE="$FIXTURE_MODE" \
	pnpm exec playwright test --config=playwright.config.ts "$@"; then
	echo 'Playground server log:' >&2
	tail -n 200 "$SERVER_LOG" >&2
	exit 1
fi
