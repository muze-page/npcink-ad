# ADR 001: Pre-GA native WordPress baseline

- Status: Accepted
- Date: 2026-07-15

## Context

Magick AD has not been deployed and has no user data, public API consumers, or backward-compatibility obligations. The 0.1 implementation nevertheless accumulated several product layers before a basic delivery loop had been validated: a custom administration SPA, custom REST resources, five statistics tables, tracking and consent adapters, queues and cron jobs, A/B variants, template migration code, and multiple frontend runtimes.

Maintaining migration paths for those unpublished contracts would make the next product trial slower and would preserve unvalidated design choices. The first useful baseline only needs to answer one question reliably: may this published placement render its assigned published ad for the current request?

## Decision

Version 0.2 is a destructive pre-GA reset built on native WordPress boundaries:

- `magick_ad` stores an ad. Its block content is the creative and `_magick_ad_end_at` stores an optional WordPress-local datetime string.
- `magick_ad_placement` stores a placement. Typed meta links it to `_magick_ad_ad_id` and records `_magick_ad_location` and `_magick_ad_device`.
- WordPress capabilities, post status, ad revisions, management-only core REST exposure, and native editors remain the control plane. Published ad creative is never anonymously readable through REST.
- `MagickAD\Domain\Eligibility_Evaluator` is a pure policy object. It returns an `allowed` boolean and stable reason codes for unpublished placements, missing, unpublished, expired, or empty ads, and device mismatch.
- Rendering is server-side. The dynamic block stores only `placementId`, `reserveHeight`, and `preview`; automatic locations also pass through the same eligibility policy and renderer.
- The release package contains built assets, runtime PHP, `readme.txt`, and the license under the fixed top-level directory `magick-ad`.

The reset deletes the unpublished 0.1 statistics/tracking subsystem, consent and CMP detection, migration classes, custom database tables, queues and cron jobs, the administration SPA, custom REST controllers, compatibility reports, templates, A/B variants, and hand-maintained fallback frontend runtimes. No compatibility adapter or data migration is provided.

## Alternatives considered

### Preserve 0.1 and incrementally simplify it

Rejected. There is no installed base to protect, while keeping old storage and API contracts would require dual paths, migration tests, and continued maintenance of unvalidated behavior.

### Keep the custom SPA and REST API, but replace the backend

Rejected for the baseline. This would retain two authorization and data-contract layers and make native post revisions, editor behavior, and REST schema secondary rather than authoritative.

### Keep custom statistics tables as an optional module

Rejected for the baseline. There is no measured traffic or reporting requirement that justifies a write queue, aggregation model, retention policy, or consent integration. Analytics can return later as a separately designed module after a real deployment produces requirements.

### Use one new custom table for ads and placements

Rejected for now. Native CPTs and typed meta are sufficient for the first delivery loop and reduce lifecycle, uninstall, and operational work. This decision can be revisited if measured query volume or reporting needs exceed native storage.

## Consequences

- Updating from any 0.1 development snapshot is unsupported. Test data should be discarded before activating 0.2.
- Old option names, REST routes, hooks, database tables, JavaScript globals, templates, and tracking events are not contracts.
- The baseline is smaller and easier to reason about, but intentionally has no dashboard, analytics, A/B testing, popup builder, arbitrary custom JavaScript, consent-management integration, or historical import.
- Product additions must start from an observed user need and include an explicit storage, permission, privacy, testing, and uninstall contract.
- Automated tests cover the pure eligibility policy and the release-package contract. A reusable WordPress Playground fixture installs the packaged zip and verifies activation, registration, server rendering, anonymous REST protection, and expired-ad rejection; browser editor interaction remains a manual pre-release check.
