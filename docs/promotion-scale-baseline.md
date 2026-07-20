# Promotion scale baseline

Date: 2026-07-20 (Asia/Shanghai)

## Decision

Npcink Ad does not need a runtime scale optimization at the current 500
published automatic Promotion boundary. In both supported evidence rows, the
catalog stayed at 7 database queries and the editor and 20-row management list
stayed at 11 queries when the fixture grew from 100 to 500 records. The three
median durations remained below 91 ms and the 500-record editor inline settings
were 112,077 bytes, about 10.7% of the fixed 1 MiB budget.

These measurements therefore still do not justify a runtime scale
optimization. The current editor and list presentation changes do not alter the
catalog, cache-priming, overlap, or frontend-delivery design. Optimizing without
a failing path would add cache invalidation and correctness risk without
evidence of user value.

## Exact artifact and method

- Development artifact: `dist/npcink-ad-0.3.3.zip`
- SHA-256: `c0d921c49847fb10eed9bc460871adf4b0e09598464564b3ff27026f9588a025`
- Fixture: 100, then 500 published automatic Promotions; one draft editor
  candidate; one public target; a deterministic mix of all accepted automatic
  locations, content scopes, and devices.
- Sampling: five samples per path with the WordPress object cache cleared before
  each sample; elapsed results use the median, while query and retained-memory
  gates use the maximum.
- Paths: shared automatic catalog, actual editor inline-settings enqueue, and
  all three consolidated custom columns plus status forms for a 20-row
  Promotion list.

The budgets were fixed before the successful runs:

- catalog: at most 8 queries;
- editor and 20-row list: at most 12 queries each;
- 100-to-500 query growth: at most 2;
- 500-record editor inline settings: at most 1,048,576 bytes;
- 20-row generated list output: at most 524,288 bytes;
- retained-memory delta per measured path: at most 67,108,864 bytes.

Commands:

```sh
bash scripts/release.sh
WP_VERSION=6.5 PHP_VERSION=8.1 \
  PLUGIN_ZIP="$PWD/dist/npcink-ad-0.3.3.zip" \
  OUTPUT_PATH=/tmp/npcink-ad-scale-wp65-php81.json \
  tests/performance/run.sh
WP_VERSION=latest PHP_VERSION=8.5 \
  PLUGIN_ZIP="$PWD/dist/npcink-ad-0.3.3.zip" \
  OUTPUT_PATH=/tmp/npcink-ad-scale-latest-php85.json \
  tests/performance/run.sh
```

## Results

All structural gates passed.

| Environment | Records | Catalog median / queries | Editor median / queries / inline bytes | 20-row list median / queries / output bytes |
|---|---:|---:|---:|---:|
| WordPress 6.5.8 / PHP 8.1.34 | 100 | 23.174 ms / 7 | 25.721 ms / 11 / 22,662 | 32.665 ms / 11 / 23,810 |
| WordPress 6.5.8 / PHP 8.1.34 | 500 | 70.280 ms / 7 | 78.672 ms / 11 / 112,077 | 90.658 ms / 11 / 24,300 |
| WordPress 7.0.2 / PHP 8.5.5 | 100 | 16.076 ms / 7 | 20.086 ms / 11 / 22,662 | 23.449 ms / 11 / 23,810 |
| WordPress 7.0.2 / PHP 8.5.5 | 500 | 57.003 ms / 7 | 64.255 ms / 11 / 112,077 | 68.699 ms / 11 / 24,300 |

At the minimum-version row, retained-memory maxima at 500 records were
4,328,256 bytes for the catalog, 3,522,736 bytes for editor settings, and
3,498,160 bytes for the list. The latest-version row was lower on all three
paths. The 500/100 median-duration ratios ranged from 2.775 to 3.546 for a 5x
record increase; editor bytes grew by 4.946x, as expected for the bounded
per-record rule shape.

## Evidence boundary and re-run triggers

These are disposable local WordPress Playground measurements using its SQLite
runtime. They prove the packaged plugin's current structural behavior and catch
N+1 regressions; they are not production MySQL, hosting, browser-render, or real
merchant traffic evidence. Elapsed times should be compared only within the same
runner and environment, so they are recorded rather than used as portable CI
limits.

Re-run both rows before a 0.3.3 release candidate and after any change to the
catalog query/mapping, editor overlap payload, list cache priming, or overlap
detection. Profile the named path before changing runtime code if a structural
gate fails or real-site evidence shows a regression.

This development artifact and baseline are separate from the immutable v0.3.2
WordPress.org candidate. No tag, GitHub Release, WordPress.org upload, or SVN
content was created or changed by this benchmark.
