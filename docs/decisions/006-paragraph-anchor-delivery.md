# ADR 006: Define bounded paragraph-anchor delivery

- Status: Accepted
- Date: 2026-07-15

## Context

ADR 005 accepts one new automatic content location: after a selected paragraph on standard WordPress posts and pages. The phrase “paragraph N” is otherwise ambiguous. A block document can contain nested paragraphs, themes can transform rendered HTML, and a missing anchor could tempt the runtime to silently move a Promotion to the end of the content. Those choices would make editor guidance, real-page preview, and live delivery disagree.

The implementation must also preserve the current server-rendered, cache-stable delivery path. It must not rewrite saved post content, add required frontend JavaScript, or turn paragraph placement into a generic selector engine.

## Decision

### Stored contract

- The location identifier is `content_after_paragraph`.
- `_npcink_ad_paragraph_number` is registered typed integer metadata with a default of `3` and an inclusive range of `1` through `20`.
- A missing value uses the default and remains valid. An explicitly invalid value is invalid configuration; it must not be made publishable by silently replacing it with the default.
- `promotion_paragraph_invalid` is the stable configuration reason code for an invalid paragraph number.

### Anchor semantics

- In Gutenberg content, paragraph N means the Nth **top-level** `core/paragraph` block in document order.
- Paragraphs nested inside Group, Columns, Cover, Query, or other container blocks do not count.
- In classic content that has no named blocks, paragraph N means the Nth rendered HTML `<p>` element.
- Heading, list, quote, image caption, and arbitrary block boundaries do not count as paragraph anchors.
- If the requested anchor does not exist, normal delivery renders nothing for that Promotion. It does not fall back to the beginning or end of the content.

### Runtime pipeline

- Before Core renders blocks, the plugin parses the serialized top-level block sequence and adds request-local markers after the paragraph numbers required by published Promotions.
- After normal block rendering, the plugin replaces only the first copy of each surviving marker with the eligible server-rendered Promotions assigned to that number; duplicate marker copies and the block-content sentinel are removed without rendering again.
- Classic content uses the Core HTML tokenizer to locate real `P` closers, excluding comment, raw-text, template-descendant, and attribute lookalikes. Insertion uses the original token byte span and preserves all surrounding source bytes.
- Markers are ephemeral filter output. They are never written to `post_content`, exposed as a new saved block format, or used as a public placement API.
- Multiple eligible Promotions assigned to the same number render together in existing deterministic repository order. Different paragraph numbers are different automatic positions.

### Evidence and diagnostics

- Normal delivery calls the shared evaluator with `content_anchor_available=true` only after the requested anchor has been found.
- An authorized real-page preview renders the creative at the real anchor when it exists.
- If the preview page lacks the anchor, the preview may append the forced creative for inspection, but it must pass `content_anchor_available=false` and show the stable `content_anchor_missing` runtime reason. This preview-only fallback is evidence, not live placement behavior.
- Editor inspection of a selected real page is advisory. It must distinguish a verified missing anchor from content that could not be inspected; mixed Classic content is `unavailable`, not `missing`, when the editor cannot prove the full `wpautop` result. It does not replace the PHP evaluator or real-page preview.
- Publication is blocked for an invalid paragraph-number configuration, but a selected page that currently lacks enough paragraphs produces a non-blocking warning because page content can change independently.

### Existing boundaries remain

- Paragraph delivery uses the same standard `post`/`page`, main-query, main-loop, page-scope, schedule, device, permission, rendering, and cache boundaries as the other automatic positions.
- It adds no frontend script, visitor request, tracking state, custom table, cache-provider integration, priority, rotation, or winner selection.
- The location is not an arbitrary CSS selector, theme hook, shortcode anchor, DOM mutation API, or custom-post-type contract.

## Alternatives considered

### Count every nested paragraph block

Rejected. Theme and container-block structure would unexpectedly change the meaning of N, and the editor could not explain the resulting placement as one simple document-level rule.

### Search the rendered HTML for every Gutenberg page

Rejected. Rendered markup loses the distinction between top-level and nested blocks. It would also let theme or block output change the stored placement meaning.

### Fall back to the end of content when the anchor is missing

Rejected for live delivery. A Promotion configured for paragraph 6 must not silently appear in another position. The authorized preview may append it only while explicitly reporting `content_anchor_missing`.

### Save a custom anchor block into each target page

Rejected. It would make a Promotion edit mutate unrelated content, require cross-record consistency and cleanup, and duplicate the existing explicit manual Promotion block.

## Consequences

- Content authors can reason about paragraph placement without learning selectors or theme hooks.
- Moving a paragraph into or out of a top-level container can change whether the anchor exists; preview and editor evidence must make that visible.
- Classic content necessarily uses rendered HTML semantics, while block content retains structural block semantics.
- Full-page caches retain the boundary defined by ADR 004: placement and schedule changes become visible when the affected page is regenerated or purged.
- Any request for nested-block targeting, custom anchors, selectors, hooks, or automatic custom-post-type support requires a new decision rather than extending this identifier implicitly.
