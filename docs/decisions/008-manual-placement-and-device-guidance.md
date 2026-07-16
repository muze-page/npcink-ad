# ADR 008: Clarify explicit manual placement and the fixed device boundary

- Status: Accepted
- Date: 2026-07-15

## Context

ADR 005 ordered one final controlled 0.2 step after paragraph placement and the canonical editorial scope: make manual placement easier to follow and explain the existing desktop/mobile behavior. The runtime already has the required bounded behavior, but the management surfaces do not state the complete workflow or the exact device boundary.

The stored `block` location is shared by two explicit entrypoints. The dynamic `npcink-ad/promotion` block stores a Promotion ID, while the `[npcink_ad promotion="ID"]` shortcode accepts that ID directly. Both call the same PHP delivery path with the expected `block` location. Treating either entrypoint as a new eligibility rule or a separate Placement record would duplicate existing truth.

Manual entrypoint evidence also remains contextual. A block or shortcode may come from post content, a template, a synced pattern, or another runtime source. Inspecting one saved post body cannot prove that an entrypoint exists or is absent on the rendered page. ADR 004 therefore makes real-page preview the final contextual evidence and keeps missing-block inspection advisory.

Device targeting has a similar explanation gap. Normal delivery already emits cache-stable HTML with a device class, and the frontend stylesheet applies one fixed boundary. The preview canvas offers representative desktop and mobile views, but its mobile canvas width is not itself the production breakpoint.

## Decision

### Explicit manual workflow

The management workflow for the `block` location is:

1. Save the Promotion with **Manual block** placement and choose its content scope, exclusions, device rule, and optional schedule.
2. At the intended entrypoint, either insert the **Npcink Ad Promotion** block and select that same saved Promotion, or use `[npcink_ad promotion="ID"]` as the existing expert shortcode path.
3. Select a published real-page target and inspect the truthful preview verdict in context before publishing or relying on the entrypoint.

The block description says that it inserts a manually placed Npcink Ad Promotion. Block-editor empty, preview-disabled, and transport-error states explain only their observed state; they do not invent a new delivery reason or claim that a Promotion is missing merely because it is absent from one list response.

The current block selector deliberately keeps every Promotion returned by its bounded `per_page=100` request. It does not filter that already bounded response to `location=block`; instead, options configured for any automatic location remain selectable and receive an explicit **Not configured for Manual block** marker. Filtering after the first 100 results would further shrink an incomplete candidate set and could make a stored selected ID look deleted. **Issue #8** remains responsible for server-side search or pagination and for resolving a selected ID independently when it falls outside the first result set.

### Manual content scope

Manual block and shortcode delivery retain the ADR 007 `all | selected` contract:

- `all` means wherever the Promotion is explicitly inserted by the block or shortcode. It does not add the standard-post/page restriction used by automatic locations, so an explicit manual entrypoint may continue to render in another supported WordPress context when the remaining rules allow it.
- `selected` is an allow-list of explicitly selected published standard posts and pages.
- explicit content exclusions always win when the current content ID matches an exclusion.
- stored `posts`, `pages`, or `terms` values are not additional manual modes; PHP continues to treat their positive manual scope as `all`.

The editor presents only the two manual-safe choices. It also states that choosing a scope does not create an entrypoint: the block or shortcode must still be inserted separately.

### Entry-point evidence

Editor inspection of a selected post or page body remains non-blocking evidence. A matching serialized block may be reported as found. A missing or unavailable body inspection must not prevent save, publication, scheduling, or resume, and it must not become an `Eligibility_Evaluator` reason code. Templates, synced patterns, shortcodes, and later content changes can make a body-only conclusion incomplete.

Real-page preview remains the authoritative contextual check available to the manager. If the target block renders, preview uses that live position. If it does not render there, the authorized preview may append the creative with an explanation; this fallback is preview evidence, never live-placement fallback behavior.

### Fixed device boundary

The supported device values remain exactly `all | desktop | mobile`:

- `all` is visible at every viewport width;
- `desktop` is visible at `782px` and above;
- `mobile` is visible at `781px` and below.

These are the fixed CSS media-query thresholds. They do not introduce a separate tablet target or a configurable breakpoint.

Normal delivery continues to emit the same cache-stable server HTML for every user agent. The frontend stylesheet hides the nonmatching device class; the plugin adds no user-agent branch, visitor cookie, or required frontend JavaScript. Full-page cache limitations from ADR 004 remain unchanged.

The real-page preview buttons simulate the corresponding device rule and preserve the truthful evaluator verdict. The mobile iframe is capped at `390px` only as a representative viewing width. It does not redefine the production `781px` maximum.

### Data and interface boundary

This guidance adds no Promotion meta, eligibility rule, stable reason code, REST field, or runtime branch. The dynamic block attributes remain exactly:

- `promotionId`;
- `reserveHeight`;
- `preview`.

The existing `promotion_missing`, `location_mismatch`, and preview-only `device_mismatch` explanations remain sufficient for their established contexts. Missing entrypoint evidence stays outside that reason-code contract.

## Alternatives considered

### Add a missing-block eligibility reason and block publication

Rejected. A saved post body cannot prove the runtime result of templates, synced patterns, shortcodes, filters, or later edits. A new reason would turn incomplete management evidence into a false eligibility rule.

### Split device HTML on the server or add a tablet target

Rejected. User-agent-specific HTML is unsafe behind shared page caches, and a third class or configurable breakpoint would widen storage, interface, preview, overlap, translation, and test contracts without observed demand.

### Scan every content source for the block

Rejected. A site-wide scan is expensive and still cannot prove runtime composition. The selected real-page preview provides stronger evidence at the context the manager actually intends to verify.

### Redesign the Promotion selector in this step

Deferred. The block editor still loads a bounded first result set. This step preserves and annotates every returned candidate rather than applying a second client-side Manual-block filter, but installations with more than 100 Promotions still need server-side search or pagination and explicit selected-ID resolution. **Issue #8** owns that follow-up. This guidance step does not claim that the limit is fixed and must not interpret absence from the first result set as proof that a saved Promotion was deleted.

## Consequences

- Authors receive one explicit block-or-shortcode workflow without a new Placement object.
- Manual `all | selected`, explicit exclusions, preview authorization, cache behavior, and eligibility remain unchanged.
- The fixed `781px`/`782px` boundary is visible in the editor and preview and is protected by packaged-plugin contract checks.
- The controlled ADR 005 0.2 product scope is implemented in the development line. The 0.2 version bump, changelog, final packaging, and release signoff remain a separate release closeout and are not implied by this decision.
- Issue #8 remains open follow-up work for server-side search or pagination and selected-ID resolution; keeping and annotating the bounded result set is not a selector scalability fix.
