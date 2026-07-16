# Promotion selector editor E2E

This suite exercises the packaged plugin in a real Gutenberg editor without
Docker or `wp-env`. The runner starts the fixed WordPress Playground CLI
`3.1.44`, installs `dist/npcink-ad-<Version>.zip` through a bundled Blueprint,
creates an ephemeral English fixture, writes its JSON record inside the
Blueprint runtime, runs Playwright with one worker, and stops the server
afterward. Playground itself keeps its default server-worker setting. Because
Playground workers share the fixture database but not generated files, the
browser resolves the published fixture page through the real same-origin REST
API and reads Promotion IDs from the prebuilt block instead of transferring the
JSON file between workers.

The fixture contains 105 filler Promotions, a selected Promotion that sorts
outside the initial 20-result page, and a published page containing that
selected dynamic block. Twenty-five fillers match one search term; the target
sorts onto search page 2. The test first highlights an old suggestion and proves
that Enter during the 300 ms pending-search window cannot change the saved ID.
It then loads search page 2, reaches its target using real ArrowDown/Enter input,
saves, hard-refreshes, and verifies restoration. It also checks the REST query
shape and requires zero `console.error` or page errors. Console warnings are
retained as browser diagnostics but do not fail the test.

Build a release ZIP and install Chromium once:

```sh
pnpm run build
bash scripts/release.sh
pnpm exec playwright install chromium
```

Run the minimum and current compatibility rows:

```sh
WP_VERSION=6.5 PHP_VERSION=8.1 pnpm run test:e2e:editor
WP_VERSION=7.0 PHP_VERSION=8.5 pnpm run test:e2e:editor
```

`PLUGIN_ZIP` may override the release package inferred from the plugin Version
header. `NPCINK_AD_E2E_PORT` may fix the local port; otherwise the runner asks
the operating system for an available port.
