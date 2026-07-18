# ADR 012: Duplicate a Promotion as a safe draft

## Status

Accepted

## Date

2026-07-18

## Context

An operator often needs a new Promotion that reuses an existing creative and
placement configuration. Re-entering the same blocks and rules is slow and can
introduce mistakes. The archived Magick AD product addressed reuse through a
separate template system, but restoring template records, navigation, and
lifecycle would make the current single-Promotion workflow harder to learn and
maintain.

Npcink Ad has not been publicly released and has no compatibility burden, but
duplication still crosses a security and publication boundary. Copying a
published status or schedule could make the new Promotion visible before an
operator reviews it. A mutation link implemented as GET would also be vulnerable
to accidental or cross-site activation.

## Decision

Npcink Ad adds one management action, **Duplicate as draft**, to each Promotion
row. It creates a new `npcink_promotion` record and opens the new draft in the
native editor.

The operation follows this contract:

- it accepts only `POST` through `admin-post.php`;
- its nonce is bound to the source Promotion ID;
- the current user must be able to edit the source Promotion and create a new
  Promotion;
- the source must exist and have the `npcink_promotion` post type;
- the new record always has `draft` status and the current user as author;
- the new title is the source title followed by “— Copy”; an untitled source
  uses “Promotion copy”;
- the native block content is copied without rendering or transforming it;
- only location, content scope, include/exclude IDs, category/tag IDs, device,
  and paragraph number are copied through an explicit allowlist;
- start and end times are deliberately reset, so an old campaign schedule can
  never silently control the new draft;
- no post ID, status, dates, revisions, comments, GUID, menu order, or unknown
  custom metadata is copied;
- the source record is never modified;
- if creation or any allowlisted metadata write fails, the handler deletes the
  incomplete new record and verifies that it is gone; if a third-party hook or
  storage failure prevents confirmed cleanup, the notice truthfully warns that
  an incomplete draft may remain and sends the operator to the Promotion list;
- success redirects to the new draft editor, while a rejected or failed request
  returns to the Promotion list with a bounded notice.

The row action is a button associated with a standalone footer form. It does not
nest a form inside WordPress's list-table form and does not use a state-changing
GET URL.

## Alternatives considered

### Restore the archived template library

Rejected. A second reusable-content entity adds naming, editing, deletion,
selection, migration, and permission questions. One safe copy action solves the
observed reuse job without another product concept.

### Copy publication status and schedule

Rejected. A duplicate is a starting point for review, not a second live
campaign. Always creating an unscheduled draft is the safer and more legible
default.

### Copy every custom field

Rejected. Unknown metadata may contain transient, integration, or future state.
An explicit allowlist makes the data boundary reviewable and keeps new fields
opt-in.

### Use a GET row-action link

Rejected. Nonce-protected GET still gives crawlers, prefetchers, and copied URLs
a mutation surface. The operation is an explicit POST form submission.

### Require a generic post-duplication plugin

Rejected for this bounded workflow. A generic duplicator cannot know that
Npcink Ad schedules must be cleared and that only registered placement metadata
belongs to the copy.

## Consequences

- Reusing a Promotion becomes a one-action path without adding a template post
  type, database table, REST route, frontend runtime, or visitor state.
- Every copy must be reviewed and explicitly published, and its schedule must be
  entered again.
- Adding a future Promotion meta field does not automatically make it
  duplicable; its copy semantics must be reviewed and the allowlist and tests
  updated deliberately.
- Automated tests cover request method, nonce and capability boundaries, post type,
  allowlisted fields, cleared schedule, source immutability, rollback, notices,
  and redirect targets. Disposable WordPress and browser tests cover the real
  list-to-editor workflow.
- This is development for a future `0.3.3`; it does not alter, rebuild, retag,
  or replace the accepted `v0.3.2` release artifact.
