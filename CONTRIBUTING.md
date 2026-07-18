# Contributing to Npcink Ad

Npcink Ad intentionally maintains one WordPress-native Promotion workflow. A
contribution should make that workflow easier to understand, publish, or verify
without restoring the broad advertising platform that preceded the current
pre-GA reset.

## Start with the current contract

Use these sources in order when deciding how the plugin should behave:

1. Runtime code and automated tests.
2. [`docs/product-contract.md`](docs/product-contract.md) and
   [`docs/architecture-overview.md`](docs/architecture-overview.md).
3. Accepted records in [`docs/decisions/`](docs/decisions/).
4. Version-specific release evidence.
5. Historical material, including `docs/archive/` and
   `docs/PROJECT-HISTORY.zh-CN.md`.

Historical files explain earlier decisions; they do not restore removed APIs,
storage identifiers, or product behavior.

## Product boundary

Before proposing a feature, answer both questions in the product contract:

1. Does it reduce the time or uncertainty involved in correctly publishing a
   Promotion?
2. If WordPress Core or a mature plugin already provides it, why must Npcink Ad
   own it?

Do not add analytics, visitor tracking, advertising-network integrations, A/B
testing, frequency or geographic targeting, popup/interstitial delivery,
arbitrary code injection, a second Promotion model, or a custom data platform
without new product evidence and an accepted ADR.

Do not add a migration, alias, or compatibility wrapper unless a currently
supported public contract requires it. Compatibility work must name that
contract and define its removal or support policy.

## Development setup

Use PHP 8.1+, Node.js 20+, pnpm 10, Composer 2, WP-CLI, and GNU gettext.

```sh
composer install
pnpm install --frozen-lockfile

composer check
pnpm check
```

The plugin supports WordPress 6.5 and is tested against both its minimum and
current WordPress/PHP combinations. Keep WordPress package and editor-runtime
changes compatible with that matrix.

## Change expectations

- Keep each pull request to one logical change.
- Prefer WordPress Core APIs and the existing single Promotion data model.
- Keep PHP eligibility and publication preflight authoritative; browser checks
  may improve feedback but must not create a second policy.
- Require capability checks as well as nonces for management writes. Sanitize
  input and escape output at the appropriate boundary.
- Update tests with behavior changes and preserve the negative assertions that
  prevent removed models or identifiers from returning.
- Refresh and complete Simplified Chinese catalogs whenever interface strings
  change.
- Update the product contract or architecture overview when current behavior
  changes. Add a new ADR instead of rewriting an accepted historical decision.

## Release and package boundary

For release-affecting changes, use the repository's existing Playground, theme,
editor E2E, package, translation, and Plugin Check gates. The release gate
creates local `dist/` artifacts, so do not use it to recreate or replace an
already published version.

A published tag, ZIP, and checksum are immutable evidence. Any required runtime
change must use a new version and a newly validated artifact; never overwrite an
existing release asset and continue using its old version number.

Pull request descriptions should record the commands actually run, their
results, remaining risks, and any verification intentionally deferred.
