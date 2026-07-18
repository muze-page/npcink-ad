#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RETRY_RUNNER="$SCRIPT_DIR/run-with-playground-startup-retry.sh"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/npcink-ad-startup-retry-test.XXXXXX")"
cleanup() {
	rm -rf "$TEMP_DIR"
}
trap cleanup EXIT HUP INT TERM

FAKE_RUNNER="$TEMP_DIR/fake-runner.sh"
cat > "$FAKE_RUNNER" <<'FAKE_RUNNER'
#!/usr/bin/env bash
set -euo pipefail

attempt="$(cat "$NPCINK_AD_RETRY_TEST_COUNTER")"
attempt=$((attempt + 1))
printf '%s\n' "$attempt" > "$NPCINK_AD_RETRY_TEST_COUNTER"
status="$(sed -n "${attempt}p" "$NPCINK_AD_RETRY_TEST_SEQUENCE")"
if [[ -z "$status" ]]; then
	echo "Missing fake status for attempt ${attempt}." >&2
	exit 99
fi
exit "$status"
FAKE_RUNNER
chmod +x "$FAKE_RUNNER"

run_case() {
	local case_name="$1"
	local sequence="$2"
	local expected_status="$3"
	local expected_attempts="$4"
	local case_dir="$TEMP_DIR/$case_name"
	local actual_status
	local actual_attempts

	mkdir -p "$case_dir"
	printf '%s\n' "$sequence" > "$case_dir/sequence"
	printf '0\n' > "$case_dir/counter"

	if NPCINK_AD_RETRY_TEST_COUNTER="$case_dir/counter" \
		NPCINK_AD_RETRY_TEST_SEQUENCE="$case_dir/sequence" \
		"$RETRY_RUNNER" "$FAKE_RUNNER"; then
		actual_status=0
	else
		actual_status=$?
	fi
	actual_attempts="$(cat "$case_dir/counter")"

	if [[ "$actual_status" != "$expected_status" ]]; then
		echo "[$case_name] Expected exit ${expected_status}, received ${actual_status}." >&2
		exit 1
	fi
	if [[ "$actual_attempts" != "$expected_attempts" ]]; then
		echo "[$case_name] Expected ${expected_attempts} attempt(s), received ${actual_attempts}." >&2
		exit 1
	fi
}

run_case 'startup-recovers' $'75\n0' 0 2
run_case 'assertion-fails-fast' $'1\n0' 1 1
run_case 'startup-exhausted' $'75\n75' 75 2

echo '[e2e-startup] OK: only Playground startup failures receive one retry'
