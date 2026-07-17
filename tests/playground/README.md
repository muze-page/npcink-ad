# WordPress Playground smoke test

Run the packaged plugin through the minimum and current-version matrices:

```sh
WP_VERSION=6.5 PHP_VERSION=8.1 tests/playground/run.sh
WP_VERSION=latest PHP_VERSION=8.5 tests/playground/run.sh
```

`PLUGIN_ZIP` may override the package inferred from the `Version` header in
`npcink-ad.php`. The smoke verifies the single Promotion CPT and typed rules,
publication and future-schedule preflight (including invalid calendar values),
source-less/unsafe Core Video rejection and valid site-controlled video rendering,
site-timezone schedule boundaries, the page/time/device matrix,
block/shortcode/automatic delivery, the fixed `781px`/`782px` frontend CSS
boundary, the exact three-attribute Promotion block contract, registered block
description, visible preview breakpoint guidance, authorized and denied REST
access, promotion-bound preview nonces, preview capability checks, absence of
placement records/options/custom tables, and explicit uninstall cleanup. The
runner uses a fixed Playground CLI release, builds a temporary Blueprint bundle, and deletes
all temporary files on exit. It passes WordPress through the CLI and PHP through
`preferredVersions`: this split is intentional because the current CLI's PHP
flag is superseded by Blueprint resolution.

The WordPress 6.5 row also protects the split editor dependency contract. The
packaged `promotion-editor` manifest must register `wp-edit-post` so the legacy
SlotFill fallback can load when the current `wp-editor` SlotFills are
unavailable. The `block-editor` manifest must not carry `wp-edit-post`,
`wp-editor`, or `wp-plugins`, so ordinary post editors do not load Promotion
document behavior. For a plugin whose `Requires at least` is below 6.6, both
manifests must also avoid the pre-6.6-incompatible `react-jsx-runtime`
dependency.
