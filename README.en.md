# Npcink Ad

Npcink Ad 0.1 is a WordPress-native, privacy-first workflow for site-owned promotions. It has one primary path: **create creative → set delivery rules → verify a real-page verdict → publish or pause**.

> Version 0.1 defines a new pre-GA contract. It provides no compatibility layer for previous development data, APIs, blocks, or storage identifiers.

## Product boundary

- `npcink_promotion` is the only content type. Title, block content, draft/published state, and every delivery rule live on one record.
- Typed metadata stores location, canonical content scope, included/excluded content, Core category/tag IDs, device, start time, end time, and paragraph number.
- Locations include a manual block, before content, after content, and after paragraph 1–20 (default paragraph 3). The block and shortcode reference a Promotion ID directly.
- Gutenberg paragraph placement counts only top-level paragraph blocks; Classic content counts actual `<p>` elements. Live delivery renders nothing when the configured paragraph anchor is missing instead of silently moving the Promotion to the end.
- Real-page preview uses the site's theme and the same PHP evaluator as live delivery. Managers may inspect blocked creative, but the verdict remains truthful.
- The Promotion list summarizes rule status, placement, content scope, stop time, and reasons for inactivity, with inline pause/resume actions instead of another screen.
- Server preflight rejects empty creative, missing public targets, invalid paragraph numbers, unavailable configured categories or tags, and invalid schedules before publication or scheduling. The editor mirrors those checks and advisory-checks a manual block or paragraph anchor on the selected preview page.
- Live delivery evaluates publication status, canonical content scope, and schedule on the server. CSS breakpoints handle device visibility so cached HTML is not split by User-Agent.
- Management REST requires `manage_npcink_ads`; activation grants it to WordPress administrators and editors.
- Default delivery adds no tracking request, visitor cookie, custom table, statistics queue, or required frontend JavaScript.

See [the product contract](docs/product-contract.md), [ADR 003](docs/decisions/003-single-promotion-record.md), and [the architecture overview](docs/architecture-overview.md).

The current development line implements [ADR 007](docs/decisions/007-canonical-editorial-scope.md): its mutually exclusive content scope covers all standard posts and pages, all posts, all pages, posts directly related to selected Core categories or tags, or explicitly selected standard posts and pages; explicit ID exclusions always win. The remaining 0.2 closeout is manual-block guidance and clearer explanation of the existing desktop/mobile breakpoints; that work is not complete yet.

## Non-goals

Version 0.1 has no AdSense management, analytics, tracking, reports, A/B tests, CMP, popup builder, frequency or geographic targeting, arbitrary PHP/JavaScript, template marketplace, custom database table, or legacy administration SPA.

## Development and verification

Use PHP 8.1+, Node.js 20+, pnpm 10, Composer 2, WP-CLI, and GNU gettext.

```bash
composer install
pnpm install --frozen-lockfile

composer check
pnpm check
bash scripts/release-gate.sh
```

The plugin bundles complete Simplified Chinese (`zh_CN`) catalogs for PHP and the block editor. After adding or changing interface copy, run:

```bash
composer i18n:refresh
composer i18n:check
```

The refresh command extracts the current PHP, block metadata, and production JavaScript strings while preserving existing translations. The completeness check fails until every new string has a Simplified Chinese translation.

Run the minimum and current WordPress Playground matrices:

```bash
WP_VERSION=6.5 PHP_VERSION=8.1 tests/playground/run.sh
WP_VERSION=latest PHP_VERSION=8.5 tests/playground/run.sh
```

The fixture verifies the single Promotion model, typed meta, publish preflight, all five canonical content scopes, direct Core category/tag relationships and their dynamic changes, fail-closed behavior for deleted configured terms, time/device rules, block/shortcode/automatic delivery, top-level Gutenberg and Classic paragraph anchors, manager/subscriber/anonymous REST boundaries, promotion-bound preview nonces, timezone and schedule boundaries, absence of Placement/options/custom tables, and explicit uninstall cleanup. Browser interaction in the editor, list status actions, and theme remains a Local release check.

## Release package

```bash
bash scripts/release-gate.sh
```

The artifact is `dist/npcink-ad-<Version>.zip` with the fixed top-level directory `npcink-ad/`. The gate requires the plugin header, `NPCINK_AD_VERSION`, `package.json`, and the readme Stable tag to share that version. In a tag-triggered build, `GITHUB_REF_NAME` must be `v<Version>`. It also verifies bundle budgets, required files, forbidden content, and the absence of legacy brand identifiers from the package.

Schedules depend on the page being regenerated at the relevant boundary. Sites with third-party full-page caches must configure an appropriate TTL or purge the affected pages when a Promotion changes; version 0.1 does not claim minute-accurate scheduling through arbitrary caches.
