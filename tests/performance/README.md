# Promotion scale benchmark

This development-only benchmark installs the exact packaged plugin into a
disposable WordPress Playground instance. It creates 100 and then 500 published
automatic Promotions, plus one editor draft and one public target. No data is
written to the Local site.

Run both supported evidence rows:

```sh
bash scripts/release.sh
WP_VERSION=6.5 PHP_VERSION=8.1 \
  PLUGIN_ZIP="$PWD/dist/npcink-ad-0.3.3.zip" \
  tests/performance/run.sh
WP_VERSION=latest PHP_VERSION=8.5 \
  PLUGIN_ZIP="$PWD/dist/npcink-ad-0.3.3.zip" \
  tests/performance/run.sh
```

Set `OUTPUT_PATH` to retain the enriched JSON result. Each metric uses five
WordPress-object-cache-cold samples and reports the median duration, maximum
query count, retained-memory delta, and raw samples.

The three measured paths are:

- the shared published automatic Promotion catalog;
- the actual Promotion editor inline-settings path;
- all five custom columns and status forms for a 20-row Promotion list page.

Elapsed time is evidence, not a portable CI assertion. Structural gates require
correct record counts, bounded memory and output, fewer than 1 MiB of editor
inline settings at 500 records, and no material query-count growth between 100
and 500 records. A failed gate is a reason to profile the named path before
changing runtime code.
