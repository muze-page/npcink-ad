# Magick AD WP

Magick AD 0.2 is a pre-GA, WordPress-native advertising placement baseline. It intentionally supports one delivery loop: create an ad, assign it to a placement, evaluate it on the server, and render it on the server.

> Version 0.2 is a destructive reset. It does not migrate 0.1 development data, REST APIs, options, or custom tables. Discard old test data before activating it.

## Current boundary

- Ads use the `magick_ad` post type. Block content is the creative and `_magick_ad_end_at` is an optional WordPress-local datetime string.
- Placements use the `magick_ad_placement` post type with typed `_magick_ad_ad_id`, `_magick_ad_location`, and `_magick_ad_device` meta.
- Both post types use WordPress core REST endpoints for the editor, but every related endpoint requires `manage_magick_ads`; ad creative is not an anonymous public API.
- A pure PHP evaluator returns an `allowed` boolean and stable reason codes.
- The dynamic block and automatic locations apply the same publish-status, expiry, and device rules on the server.
- The block stores only `placementId`, `reserveHeight`, and `preview`; it does not duplicate creative content.

See [ADR 001](docs/decisions/001-pre-ga-native-wordpress-baseline.md) for the decision and [the architecture overview](docs/architecture-overview.md) for module boundaries.

## Non-goals

Version 0.2 has no analytics, tracking, reports, A/B tests, CMP or consent detection, popup builder, arbitrary custom JavaScript, template migrations, custom REST controllers, custom database tables, or administration SPA. Those features require evidence from real use and a deliberate privacy and storage contract before reconsideration.

## Development

Use PHP 8.1+, Node.js 20+, pnpm 10, and Composer 2.

```bash
composer install
pnpm install --frozen-lockfile

composer check
pnpm check
pnpm run build
```

`composer check` runs PHPUnit, WordPress Coding Standards, and PHPStan. PHPUnit covers the pure eligibility policy. The reusable packaged-plugin fixture in `tests/playground/` verifies activation, post types and meta, the dynamic block, the shortcode, server rendering, the anonymous REST boundary, and expired-ad rejection. Browser editor interaction remains a manual pre-release smoke test.

```bash
bash scripts/release-gate.sh
WP_VERSION=6.5 PHP_VERSION=8.1 tests/playground/run.sh
WP_VERSION=latest PHP_VERSION=8.5 tests/playground/run.sh
```

## Release package

```bash
bash scripts/release-gate.sh
```

The gate runs PHP syntax checks, Composer checks, frontend type/lint checks, one production build, strict bundle budgets, deterministic staging, and zip-content assertions. It creates `dist/magick-ad-<version>.zip` with the fixed top-level directory `magick-ad`.

POT generation is separate from reproducible packaging:

```bash
wp i18n make-pot . languages/magick-ad.pot \
  --domain=magick-ad \
  --exclude=node_modules,build,assets/js,docs,dist,vendor
```
