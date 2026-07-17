# ADR 010: Treat site-controlled video as Promotion creative

## Status

Accepted

## Date

2026-07-16

## Context

Npcink Ad already stores creative in native WordPress block content and renders
that content through the shared server-side Renderer. WordPress therefore
provides the basic media library and Core Video block workflow without another
Npcink content type or upload interface.

Basic renderability is not the same as an explicit product contract. A saved
Video block can have no usable source, and a bare `<video>` element previously
counted as meaningful content merely because the element existed. That could
let publication preflight report success while the live page had no playable
creative. The supported video boundary also needs to stay distinct from VAST,
pre-roll, ad-network integration, playback analytics, and popup delivery.

## Decision

Npcink Ad treats video as creative inside the existing Promotion record, not as
a new delivery system.

- The supported path is the Core Video block with a root-relative or explicit
  HTTP(S) `src` on the `<video>` element. Explicit URLs use a bounded grammar:
  an ASCII hostname or IPv4 address, an optional port from 1 through 65535,
  and no credentials, backslashes, malformed percent escapes, or browser-repair
  shorthand. Bare relative paths and protocol-relative URLs are rejected
  because Core KSES can reinterpret a later colon as a protocol boundary and
  change the rendered source.
  Standalone nested `<source>` markup is not accepted because Core's post KSES
  contract removes it from the rendered creative on the supported WordPress
  versions.
- Every Promotion continues through the same editor preflight,
  `Eligibility_Evaluator`, Renderer, real-page preview, and delivery paths.
- A Core Video block or raw `<video>` element without a usable source is an
  invalid configuration with the stable reason code
  `promotion_video_source_missing`. Dangerous executable/data schemes are not
  accepted as a usable source.
- Source validation is structural. Npcink Ad does not make a network request to
  prove that a saved URL currently returns playable media; Media Library and
  hosting health remain WordPress/site responsibilities.
- Frontend CSS may keep video and its figure inside the Promotion width, but the
  plugin does not replace the Core player, force controls, or override theme
  styling.
- Autoplay, muted, loop, poster, plays-inline, preload, and controls remain Core
  Video attributes. The editor gives a non-blocking warning when video requests
  autoplay without `muted`, but it adds no publication reason or frontend
  behavior. Browser autoplay policy remains authoritative; this slice does not
  claim that a syntactically valid autoplay configuration will be accepted by
  every browser.
- Malformed Custom HTML is not normalized into the supported contract. The
  server-side preflight remains authoritative when browser HTML recovery and
  WordPress sanitization interpret malformed markup differently.
- The feature adds no Promotion metadata, post type, top-level page, visitor
  state, tracking, custom table, plugin-initiated API request, or required
  frontend JavaScript. The visitor's browser naturally requests the media URL
  selected by the site operator.

VAST/IMA, pre-roll/mid-roll/post-roll, rewarded video, playback analytics,
external-player guarantees, popup video, and fullscreen interstitial delivery
are outside this decision.

## Alternatives considered

### Add a separate Video Ad record and player

Rejected. It would duplicate the media library and introduce player ownership,
ad protocols, error recovery, consent, reporting, and new publication state
without validated demand.

### Treat every `<video>` tag as valid content

Rejected. An element with no usable source can render no playable creative and
would make list status, publication preflight, preview, and live delivery
disagree with the operator-visible result.

### Probe the video URL during publication

Rejected. Network reachability is mutable, can be slow or private, and would add
external requests and new failure semantics to a deterministic publishing
workflow.

### Build video upload controls in Npcink settings

Rejected. The native Media Library and Core Video block already own upload and
media editing. A second interface would increase maintenance and user
vocabulary without adding a distinct capability.

## Consequences

- Ordinary image, text, button, and dynamic-block Promotions remain unchanged.
- An incomplete video is reported consistently before publication and anywhere
  shared eligibility reasons are presented.
- A syntactically usable URL can still fail later because of file deletion,
  server configuration, codec support, or browser policy; real-page preview is
  the operator's contextual check.
- Autoplay without `muted` remains publishable but is called out before
  publication so WordPress 6.5, current Core, and raw HTML receive one explicit
  product-level advisory.
- ADR 011 later accepts only normal-flow top and bottom page bars with
  current-document dismissal. A future popup or Overlay mode still requires a
  separate decision covering frontend state, modal accessibility, frequency,
  conflicts, privacy, preview, and cache behavior.
