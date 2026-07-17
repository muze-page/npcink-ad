#!/usr/bin/env bash

set -euo pipefail

WORDPRESS_VERSION='6.5.8'
WORDPRESS_SHA256='02fd51897b985267121bc39df0148a47b477f97e40d560ea13d36cc60cfca58d'
SQLITE_PLUGIN_VERSION='2.2.23'
SQLITE_PLUGIN_SHA256='44be096a14ebcea424b5e4bf764436ec85fb067f74ab47822c4c5346df21591e'
PLUGIN_CHECK_VERSION='2.0.0'
PLUGIN_CHECK_SHA256='d744ee1f93866527aedf7d0a73df40bd87018f02cd5465fa39230bf4c2b3a3fa'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN_VERSION="$(sed -nE 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*([^[:space:]]+).*/\1/p' "$PROJECT_DIR/npcink-ad.php" | head -n 1)"
PLUGIN_ZIP="${PLUGIN_ZIP:-$PROJECT_DIR/dist/npcink-ad-$PLUGIN_VERSION.zip}"

for command_name in curl php unzip wp; do
	if ! command -v "$command_name" >/dev/null 2>&1; then
		echo "[plugin-check] Required command not found: ${command_name}" >&2
		exit 1
	fi
done

if [[ -z "$PLUGIN_VERSION" ]]; then
	echo '[plugin-check] Plugin version is missing from npcink-ad.php' >&2
	exit 1
fi
if [[ ! -f "$PLUGIN_ZIP" ]]; then
	echo "[plugin-check] Plugin ZIP not found: ${PLUGIN_ZIP}" >&2
	exit 1
fi
if ! php -r 'exit(extension_loaded("pdo_sqlite") ? 0 : 1);'; then
	echo '[plugin-check] PHP extension pdo_sqlite is required.' >&2
	exit 1
fi

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/npcink-ad-plugin-check.XXXXXX")"
cleanup() {
	rm -rf "$TEMP_DIR"
}
trap cleanup EXIT HUP INT TERM

download_and_verify() {
	local url="$1"
	local destination="$2"
	local expected_sha256="$3"
	local label="$4"

	curl --fail --location --silent --show-error \
		--retry 3 --retry-delay 1 --retry-all-errors \
		"$url" --output "$destination"
	local actual_sha256
	actual_sha256="$(php -r 'echo hash_file("sha256", $argv[1]);' "$destination")"
	if [[ "$actual_sha256" != "$expected_sha256" ]]; then
		echo "[plugin-check] ${label} checksum mismatch" >&2
		echo "[plugin-check] Expected: ${expected_sha256}" >&2
		echo "[plugin-check] Actual:   ${actual_sha256}" >&2
		exit 1
	fi
}

WORDPRESS_ZIP="$TEMP_DIR/wordpress.zip"
SQLITE_PLUGIN_ZIP="$TEMP_DIR/sqlite-database-integration.zip"
PLUGIN_CHECK_ZIP="$TEMP_DIR/plugin-check.zip"

download_and_verify \
	"https://downloads.wordpress.org/release/wordpress-${WORDPRESS_VERSION}.zip" \
	"$WORDPRESS_ZIP" \
	"$WORDPRESS_SHA256" \
	"WordPress ${WORDPRESS_VERSION}"
download_and_verify \
	"https://downloads.wordpress.org/plugin/sqlite-database-integration.${SQLITE_PLUGIN_VERSION}.zip" \
	"$SQLITE_PLUGIN_ZIP" \
	"$SQLITE_PLUGIN_SHA256" \
	"SQLite Database Integration ${SQLITE_PLUGIN_VERSION}"
download_and_verify \
	"https://downloads.wordpress.org/plugin/plugin-check.${PLUGIN_CHECK_VERSION}.zip" \
	"$PLUGIN_CHECK_ZIP" \
	"$PLUGIN_CHECK_SHA256" \
	"Plugin Check ${PLUGIN_CHECK_VERSION}"

# Plugin Check's complete PHPCS stack exceeds Playground's WebAssembly runtime
# boundary. Native PHP plus WordPress's official SQLite integration keeps this
# release check disposable without adding a local MySQL dependency.
unzip -q "$WORDPRESS_ZIP" -d "$TEMP_DIR"
WORDPRESS_DIR="$TEMP_DIR/wordpress"
mkdir -p "$WORDPRESS_DIR/wp-content/plugins"
unzip -q "$SQLITE_PLUGIN_ZIP" -d "$WORDPRESS_DIR/wp-content/plugins"
if [[ ! -f "$WORDPRESS_DIR/wp-content/plugins/sqlite-database-integration/db.copy" ]]; then
	echo '[plugin-check] SQLite Database Integration did not contain db.copy.' >&2
	exit 1
fi
cp "$WORDPRESS_DIR/wp-content/plugins/sqlite-database-integration/db.copy" "$WORDPRESS_DIR/wp-content/db.php"

wp config create \
	--path="$WORDPRESS_DIR" \
	--dbname=wordpress \
	--dbuser=root \
	--dbpass=root \
	--skip-check \
	--quiet
wp core install \
	--path="$WORDPRESS_DIR" \
	--url=https://npcink-ad.test \
	--title='Npcink Ad Plugin Check' \
	--admin_user=admin \
	--admin_password=password \
	--admin_email=admin@example.test \
	--skip-email \
	--quiet
wp plugin install "$PLUGIN_ZIP" --path="$WORDPRESS_DIR" --activate --quiet
wp plugin install "$PLUGIN_CHECK_ZIP" --path="$WORDPRESS_DIR" --activate --quiet

PLUGIN_CHECK_REQUIRE="$WORDPRESS_DIR/wp-content/plugins/plugin-check/cli.php"
if [[ ! -f "$PLUGIN_CHECK_REQUIRE" ]]; then
	echo '[plugin-check] Plugin Check did not contain its WP-CLI bootstrap.' >&2
	exit 1
fi

# Keep warnings visible so new debt cannot hide, then enforce that the official
# checker reports no errors. The three current warnings are classified in the
# release-readiness document rather than suppressed in source.
wp plugin check npcink-ad \
	--path="$WORDPRESS_DIR" \
	--require="$PLUGIN_CHECK_REQUIRE" \
	--mode=new \
	--slug=npcink-ad

ERROR_OUTPUT="$TEMP_DIR/errors.log"
wp plugin check npcink-ad \
	--path="$WORDPRESS_DIR" \
	--require="$PLUGIN_CHECK_REQUIRE" \
	--ignore-warnings \
	--mode=new \
	--slug=npcink-ad >"$ERROR_OUTPUT" 2>&1

cat "$ERROR_OUTPUT"
if ! grep -Fq 'Checks complete. No errors found.' "$ERROR_OUTPUT"; then
	echo '[plugin-check] Official Plugin Check reported one or more release-blocking errors.' >&2
	exit 1
fi

echo "[plugin-check] OK: Plugin Check ${PLUGIN_CHECK_VERSION} on WordPress ${WORDPRESS_VERSION} with native PHP"
