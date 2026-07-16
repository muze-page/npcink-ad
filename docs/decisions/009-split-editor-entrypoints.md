# ADR 009: Split block and Promotion editor entrypoints

## Status

Accepted

## Date

2026-07-16

## Context

Npcink Ad originally produced one `build/index.js` entrypoint that imported both
the manual Promotion block and the Promotion document sidebar. WordPress must
load a block's editor script in ordinary post and page editors so the block can
be inserted. That made every editor also download and register Promotion-only
SlotFills, preflight logic, content pickers, preview guidance, and their
`wp-edit-post`, `wp-editor`, and `wp-plugins` dependencies.

The combined production bundle reached 40,814 bytes against a 40 KiB release
budget. Raising the budget would preserve the wrong ownership boundary and make
future Promotion settings increase the cost of every post editor.

## Decision

Build and register two editor entrypoints:

- `block-editor` contains only `npcink-ad/promotion`, its selector, server-side
  preview, and block-specific CSS. It keeps the stable
  `npcink-ad-block-editor` script and style handles declared by `block.json`.
- `promotion-editor` contains only Promotion document settings, prepublish
  checks, real-page preview guidance, and Promotion-specific CSS. It uses the
  new internal `npcink-ad-promotion-editor` handle and is registered and
  enqueued only after the current screen and post are confirmed as
  `npcink_promotion`.

Each handle has its own WordPress asset manifest and Simplified Chinese JSON
catalog. The release gate treats the dependency boundary as a contract: the
block bundle may not depend on `wp-edit-post`, `wp-editor`, or `wp-plugins`,
while the Promotion bundle must retain `wp-edit-post` for the WordPress 6.5
SlotFill fallback. Separate and combined size budgets prevent either bundle or
their total from growing silently.

The block name, attributes, dynamic render callback, saved content, Promotion
data model, and frontend output do not change.

## Alternatives considered

### Increase the combined bundle budget

Rejected. This would remove the immediate build failure but continue loading
Promotion-only behavior in every editor.

### Conditionally return `null` from the shared Promotion plugin

Rejected. The component already returned `null` outside `npcink_promotion`, but
the browser still downloaded, parsed, and registered its code and dependencies.

### Dynamically import Promotion behavior from the shared entrypoint

Rejected for now. A second build entry maps directly to WordPress asset handles,
translation catalogs, dependency manifests, and screen-level enqueue rules. It
is easier to audit across the supported WordPress range.

## Consequences

- Ordinary post and page editors load roughly 11 KiB of Npcink Ad JavaScript
  instead of the previous 40 KiB combined bundle.
- Promotion editors load both entries because the manual block remains
  available there; total JavaScript is approximately unchanged.
- Build, translation, package, Playground, and browser gates must update both
  assets atomically.
- Adding Promotion-only code to the block entry will fail the dependency or
  size contract instead of silently widening the global editor surface.

## Verification

- Build produces only `block-editor.*` and `promotion-editor.*` assets.
- Playground validates both handles, dependencies, translations, and packaged
  files on the minimum and current WordPress rows.
- Browser E2E verifies ordinary page editors do not request
  `promotion-editor.js`, while Promotion editors do.
- Existing selector save/reload and real frontend rendering tests continue to
  pass without a block migration.
