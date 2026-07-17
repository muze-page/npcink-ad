# ADR 011: Add bounded page-bar delivery

## Status

Accepted

## Date

2026-07-17

## Context

Five first-Promotion user trials passed without a repeated usability problem.
The next accepted product step is therefore a new high-visibility presentation
surface rather than another repair to the existing editor workflow.

The archived Magick AD implementation explored banners, floating containers,
visitor state, animation, frequency controls, tracking, and a separate slot
resolver. Reintroducing that container system would also reintroduce the
product language and runtime dependencies that the single-Promotion baseline
removed. A page bar is still useful for a site-owned announcement or campaign,
but its first contract must remain inside the existing Promotion workflow.

## Decision

Npcink Ad adds two automatic locations to the existing
`_npcink_ad_location` enum:

- `bar_top`: a page bar emitted by the standard `wp_body_open` hook;
- `bar_bottom`: a page bar emitted by the standard `wp_footer` hook.

Both locations remain part of the single Promotion record and reuse the same
content scope, explicit exclusions, Core category/tag selection, schedule,
device classes, `Eligibility_Evaluator`, overlap advisory, real-page preview,
Renderer, and publication preflight as the existing automatic locations.

The initial page-bar contract is deliberately bounded:

- Bars apply only to eligible singular standard posts and pages. They do not
  expand delivery to archives, search, 404 pages, custom post types, or custom
  taxonomies.
- A bar stays in normal document flow at the theme hook. It is not fixed,
  sticky, floating, modal, or fullscreen, and it does not reserve or calculate
  an overlay offset.
- Native Promotion block content remains the creative and styling surface.
  There is no second bar builder, token schema, or custom HTML/CSS setting.
- Every rendered bar region has one accessible close button. Closing hides the
  region only in the current document and pauses media already playing inside
  that region. The plugin does not write a Cookie, session, `localStorage`,
  visitor profile, frequency cap, or tracking event.
- Multiple eligible Promotions at the same bar location render as separate,
  independently dismissible regions in the existing deterministic order. The
  current non-blocking overlap advisory remains the management warning; no
  priority, rotation, or winner selection is introduced.
- Only a page that renders a bar needs the small dismissal script. Existing
  block, shortcode, before-content, after-content, and paragraph delivery keep
  their no-required-frontend-JavaScript contract.
- Authorized real-page preview uses the actual selected theme hook and the same
  evaluator. If the top hook is absent but the theme reaches `wp_footer`, the
  preview reports the missing `wp_body_open` integration instead of showing the
  creative at a false location. Theme templates that omit `wp_footer` cannot
  support the bottom bar or the fallback diagnostic; the real-page preview is
  the contextual verification boundary.
- Full-page caches retain the existing schedule and publication limitation.
  Bars do not add visitor-varying HTML, so their output remains safe to cache.

This decision does not accept popup, interstitial, sticky/floating bar,
animation, delay, scroll/click triggers, close-state persistence, frequency
controls, analytics, or ad-network video.

## Alternatives considered

### Restore the archived banner/container runtime

Rejected. It is coupled to slots, resolver state, tracking, templates, visitor
behavior, and a broad settings model. Selectively implementing two locations on
the current evaluator is smaller and easier to verify.

### Make the first bar fixed or sticky

Rejected. A fixed surface must resolve theme and admin-bar offsets, arbitrary
creative height, multiple-bar stacking, content occlusion, and layout shift.
Normal-flow delivery provides the announcement use case without those hidden
contracts. Sticky behavior requires observed demand and a new decision.

### Persist visitor dismissal

Rejected. Persistence introduces visitor state, retention semantics, cache
interaction, consent/privacy disclosure, and frequency behavior. A current-page
dismissal is sufficient for the first non-modal bar.

### Add a separate Bar post type or container metadata

Rejected. The content, publication state, location, target, schedule, and
device rule already belong to the Promotion. A second record or presentation
schema would recreate the split that ADR 003 removed.

## Consequences

- Existing Promotion records and the default `content_after` value require no
  migration; the REST enum is extended additively.
- Page bars gain the same truthful status, preview, pause/resume, schedule, and
  cache disclosures as existing automatic locations.
- Theme hook compatibility becomes a real-page property and is not guessed
  from stored configuration.
- Top-bar DOM order relative to a theme-provided skip link remains controlled
  by the theme and WordPress template canvas. The plugin does not rewrite theme
  HTML or move server-rendered bars with JavaScript to manufacture a different
  order.
- The small dismissal script is a presentation enhancement only. Eligibility
  and bar markup remain server-authoritative and work without visitor storage.
- Popup delivery remains a separate future decision with modal accessibility,
  focus restoration, scroll locking, conflicts, preview, cache, and visitor
  state explicitly unresolved.
