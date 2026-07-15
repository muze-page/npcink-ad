# Npcink Ad

Npcink Ad 0.1 is a WordPress-native, privacy-first workflow for site-owned promotions. It has one primary path: **create creative → set delivery rules → verify a real-page verdict → publish or pause**.

> Version 0.1 defines a new pre-GA contract. It provides no compatibility layer for previous development data, APIs, blocks, or storage identifiers.

## Product boundary

- `npcink_promotion` is the only content type. Title, block content, draft/published state, and every delivery rule live on one record.
- Typed metadata stores location, page scope, included/excluded content, device, start time, and end time.
- Locations are limited to a manual block, before content, and after content. The block and shortcode reference a Promotion ID directly.
- Real-page preview uses the site's theme and the same PHP evaluator as live delivery. Managers may inspect blocked creative, but the verdict remains truthful.
- Live delivery evaluates status, page, and schedule on the server. CSS breakpoints handle device visibility so cached HTML is not split by User-Agent.
- Management REST requires `manage_npcink_ads`; activation grants it to WordPress administrators and editors.
- Default delivery adds no tracking request, visitor cookie, custom table, statistics queue, or required frontend JavaScript.

See [the product contract](docs/product-contract.md), [ADR 003](docs/decisions/003-single-promotion-record.md), and [the architecture overview](docs/architecture-overview.md).

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

The fixture verifies the single Promotion model, typed meta, page/time/device rules, block/shortcode/automatic delivery, manager/subscriber/anonymous REST boundaries, promotion-bound preview nonces, preview capabilities, absence of Placement/options/custom tables, and explicit uninstall cleanup. Browser interaction in the real editor and theme remains a Local release check.

## Release package

```bash
bash scripts/release-gate.sh
```

The artifact is `dist/npcink-ad-<Version>.zip` with the fixed top-level directory `npcink-ad/`. The gate requires the plugin header, `NPCINK_AD_VERSION`, `package.json`, and the readme Stable tag to share that version. In a tag-triggered build, `GITHUB_REF_NAME` must be `v<Version>`. It also verifies bundle budgets, required files, forbidden content, and the absence of legacy brand identifiers from the package.

Schedules depend on the page being regenerated at the relevant boundary. Sites with third-party full-page caches must configure an appropriate TTL or purge the affected pages when a Promotion changes; version 0.1 does not claim minute-accurate scheduling through arbitrary caches.
