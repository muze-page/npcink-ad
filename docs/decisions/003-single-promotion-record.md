# ADR 003: Use one promotion record for the 0.1 publishing workflow

- Status: Accepted
- Date: 2026-07-15

## Context

The native baseline uses one post type for creative content and a second post type for placement. Publishing one result therefore requires the operator to create and publish a promotion, leave that editor, create and publish a placement, select the first record again, and finally insert or configure a delivery entrypoint. The block then queries a third list of placement records before it can render anything.

This separation is useful only when one creative must be reused across multiple independently scheduled, positioned, or rotated placements. Npcink Ad 0.1 has no validated requirement for that relationship. Preserving it would impose two publication states, relationship validation, orphan cleanup, and a longer workflow solely for hypothetical reuse.

The old `master` implementation does not justify retaining the split. Its primary ad object already contains location, page, device, and schedule rules. The later Slot abstraction is coupled to the runtime cache, resolver, rotation, weighting, migration, and settings systems that Npcink Ad explicitly rejects.

## Decision

Npcink Ad 0.1 uses one `npcink_promotion` custom post type as the complete publishing record.

- `post_title` and `post_content` contain the promotion and use the native block editor.
- `post_status` is the only draft/published/paused state.
- Registered typed metadata contains the placement rules:
  - `_npcink_ad_location`: `block`, `content_before`, or `content_after`;
  - `_npcink_ad_page_scope`: `all` or `selected`;
  - `_npcink_ad_include_ids`: a bounded list of post IDs used by `selected` scope;
  - `_npcink_ad_exclude_ids`: a bounded list of post IDs excluded from either scope;
  - `_npcink_ad_device`: `all`, `desktop`, or `mobile`;
  - `_npcink_ad_start_at`: an optional WordPress-local start datetime;
  - `_npcink_ad_end_at`: an optional WordPress-local end datetime.
- The dynamic block stores a `promotionId`, not a placement relationship.
- Automatic before/after delivery queries published promotions by location and evaluates the same record.
- Manual block and shortcode delivery reference the promotion directly.

Do not create a hidden one-to-one placement record. That approach retains two sources of publication truth and introduces save transactions and orphan states without providing a user-facing capability.

## Eligibility and preview contract

One PHP eligibility policy evaluates actual delivery and preview. It returns an allowed flag and stable reason codes for unpublished content, missing content, start and end times, page scope and exclusions, location, and simulated device.

Real-page preview may force the creative to render for an authorized manager so its appearance can be inspected, but the accompanying verdict must still report the actual eligibility result. Preview access requires the management capability, a promotion-bound nonce, same-origin navigation, and no-cache response headers. Anonymous requests must never use preview mode or read unpublished promotion content.

Device targeting must not depend on user-agent-specific cached HTML. Normal delivery renders a device class and uses a small frontend stylesheet to apply the desktop/mobile breakpoint without JavaScript. The evaluator uses the explicitly simulated device only for preview verdicts.

Scheduled promotion pages require an explicit cache limitation. The first implementation must mark authorized preview responses as non-cacheable and document that third-party full-page caches must be purged or configured around schedule boundaries. A future cache integration requires a separate decision; the plugin must not claim minute-accurate scheduling through arbitrary caches.

## Alternatives considered

### Retain separate promotion and placement post types

Rejected. It optimizes for unvalidated many-to-many reuse and makes the primary workflow longer and harder to explain.

### Hide the placement record and create it automatically

Rejected. It still creates double publication state, orphan and rollback cases, and an internal one-to-one relationship with no product value.

### Restore the old Slot model

Rejected. It reintroduces resolver, rotation, caching, signature, migration, and settings dependencies from the discarded product platform.

### Store all rules in one serialized metadata object

Rejected. Individually registered typed metadata provides clearer validation, REST schemas, revisions, queries, and uninstall verification.

## Consequences

- The unpublished placement post type and its metadata are deleted without migration or aliases.
- `placementId` becomes `promotionId`; existing development block markup is intentionally unsupported.
- The admin menu exposes one promotion collection and one editing workflow.
- Reuse across independently controlled placements is deferred until observed demand proves that the extra entity is worth its user and maintenance cost.
- Tests must prove that no placement record, runtime option cache, tracking event, or custom table is created by the workflow.

