#!/usr/bin/env bash

set -euo pipefail

readonly STARTUP_FAILURE_EXIT_CODE=75
readonly MAX_ATTEMPTS=2

if (( $# == 0 )); then
	echo '[e2e-startup] A command is required.' >&2
	exit 1
fi

attempt=1
while (( attempt <= MAX_ATTEMPTS )); do
	echo "[e2e-startup] Attempt ${attempt}/${MAX_ATTEMPTS}"
	if NPCINK_AD_E2E_STARTUP_ATTEMPT="$attempt" "$@"; then
		exit 0
	else
		status=$?
	fi

	if (( status != STARTUP_FAILURE_EXIT_CODE )); then
		echo "[e2e-startup] Command exited with ${status}; this is not a retryable Playground startup failure." >&2
		exit "$status"
	fi

	if (( attempt == MAX_ATTEMPTS )); then
		echo "[e2e-startup] Playground startup failed on both attempts." >&2
		exit "$STARTUP_FAILURE_EXIT_CODE"
	fi

	echo '[e2e-startup] Playground startup failed temporarily; rebuilding the ephemeral environment once.' >&2
	attempt=$((attempt + 1))
	sleep 1
done
