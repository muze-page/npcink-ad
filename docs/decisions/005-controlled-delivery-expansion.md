# ADR 005: Bound the Npcink Ad 0.2 delivery expansion

- Status: Accepted
- Date: 2026-07-15

## Context

Npcink Ad 0.1 established one Promotion record, one eligibility policy, and three delivery locations: a manual block, before content, and after content. That baseline intentionally avoids a generic targeting engine, a separate Placement entity, visitor state, and ad-operations features.

The next useful delivery requests are narrower: insert after a selected paragraph, choose a broader editorial scope without selecting every page, and make the manual-block and device behavior easier to understand. These requests need a scope contract before implementation so that adding one content position does not reopen arbitrary selectors, custom hooks, custom post types, or the old Slot and rotation systems.

Automatic locations also allow more than one published Promotion to match the same request. The repository already returns matching Promotions in deterministic order, but page, schedule, device, cache, and later content changes mean the management UI cannot prove an exact runtime conflict from stored configuration alone.

## Decision

Npcink Ad 0.2 is a controlled extension of the single-Promotion model. This ADR defines the implementation boundary; accepting it does not mean that the following capabilities already exist.

### Automatic-content page contract

- Automatic content locations apply only to the standard WordPress `post` and `page` post types.
- This contract covers the existing before-content and after-content locations and the planned after-paragraph location.
- Other custom post types are not implicitly supported merely because they render through `the_content`.
- The manual Promotion block remains an explicit insertion path and is not expanded into a generic automatic-location contract.

### Multiple Promotions at one automatic location

- When multiple Promotions are eligible for the same request and automatic location, all of them continue to render.
- They render in the existing deterministic repository order: `menu_order` ascending, then post ID ascending.
- That order is an implementation stability rule, not a user-facing priority model.
- Management surfaces must show an advisory when stored rules indicate that Promotions may appear together at the same automatic location.
- The advisory must use possibility language such as “may appear together.” It must not claim that a precise conflict exists, that a visitor will see both Promotions, or that one Promotion wins.
- The minimum advisory comparison uses these bounded semantics:
  - both Promotions use the same automatic location;
  - their schedule windows may intersect, treating start as inclusive and end as exclusive (`start <= now < end`) and an absent boundary as open; windows that only touch at one Promotion's end and the other's start do not intersect;
  - their effective standard-post/page scopes share at least one possible page after applying each Promotion's exclusions; a scope that can be proven disjoint must not trigger the advisory;
  - their device rules can be visible in the same viewport: `all` intersects either device, and equal device rules intersect, while `desktop` and `mobile` alone do not.
- The advisory is management evidence, not an `Eligibility_Evaluator` reason code. It does not change runtime eligibility or block publication.
- Npcink Ad 0.2 does not add priority, weight, rotation, winner selection, or an ad group.

### Ordered extension sequence

Implementation proceeds in this order:

1. **After the Nth paragraph** — add one bounded automatic content position for standard posts and pages. It must preserve main-query/main-loop safeguards and the shared eligibility and rendering path.
2. **Collapsed advanced editorial scope** — add an advanced section for the standard `post`/`page` types and, where applicable, WordPress categories and tags. Existing simple page inclusion and exclusion remains the primary path; this is not a generic boolean targeting engine or arbitrary taxonomy/CPT support.
3. **Manual-block and device guidance** — make the explicit block-placement workflow clearer and document the fixed device boundary: mobile at `781px` and below, desktop at `782px` and above. No third device class is introduced.

Each step must be completed and verified before the next step widens the product surface. New eligibility rules remain authoritative in PHP and must be reflected consistently in publication preflight, list explanations, real-page preview, translations, and tests.

## Explicit non-goals

Npcink Ad 0.2 does not add:

- a separate tablet target or configurable device breakpoints;
- arbitrary CSS selectors, theme hooks, or user-defined insertion callbacks;
- visitor state such as cookies, sessions, frequency caps, login-state targeting, referrers, geolocation, or visitor profiles;
- impression, click, or conversion tracking, analytics, event queues, or statistics tables;
- priority, weights, rotation, split testing, or automatic winner selection;
- separate Slot, Placement, Variant, or ad-group records.

## Alternatives considered

### Add priorities or rotation to resolve automatic-location overlap

Rejected. It would change a truthful advisory into an ad-selection system and require user-visible ordering, weights, persistence, preview semantics, and additional runtime state before demand for those capabilities exists.

### Treat possible overlap as an exact conflict or publication error

Rejected. Stored configuration cannot prove what a particular request, schedule boundary, full-page cache, or later content change will render. Blocking publication would overstate the evidence.

### Support every post type, selector, hook, and taxonomy through one targeting engine

Rejected. The resulting compatibility and rule-composition surface would recreate the broad system removed by ADR 001. Standard posts, pages, categories, and tags cover the intended editorial workflow while keeping the evaluator explainable.

### Restore separate Placement or Slot records

Rejected. ADR 003 remains authoritative: there is no observed need that justifies multiple publication states, relationship validation, orphan cleanup, or a resolver and rotation subsystem.

## Consequences

- The 0.1 implementation remains the current runtime until each 0.2 step is implemented and verified.
- Automatic delivery must gain an explicit standard-`post`/`page` guard before the 0.2 page contract is claimed as complete.
- Overlap detection is advisory evidence only. Its wording and tests must preserve uncertainty instead of presenting a false conflict guarantee, and the advisory must stay outside eligibility reason codes and publication preflight failures.
- Rendering all eligible Promotions preserves existing behavior and avoids introducing hidden selection state.
- The advanced scope must remain collapsed and bounded so the default publishing workflow keeps its current usability budget.
- Any future request for custom post types, tablet targeting, priorities, rotation, visitor state, tracking, or separate delivery entities requires a new decision record with observed demand and a complete data, privacy, cache, permission, uninstall, and test contract.
