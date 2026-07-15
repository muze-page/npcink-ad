# WordPress Playground smoke test

Run the packaged plugin through the minimum and current-version matrices:

```sh
WP_VERSION=6.5 PHP_VERSION=8.1 tests/playground/run.sh
WP_VERSION=latest PHP_VERSION=8.5 tests/playground/run.sh
```

`PLUGIN_ZIP` may override the package inferred from the `Version` header in
`npcink-ad.php`. The smoke verifies the single Promotion CPT and typed rules,
the page/time/device matrix, block/shortcode/automatic delivery, anonymous REST
denial, absence of placement records/options/custom tables, and explicit
uninstall cleanup. The runner uses a fixed Playground CLI release, builds a
temporary Blueprint bundle, and deletes all temporary files on exit. It passes
WordPress through the CLI and PHP through `preferredVersions`: this split is
intentional because the current CLI's PHP flag is superseded by Blueprint
resolution.
