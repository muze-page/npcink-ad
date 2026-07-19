# ADR 013: Pause scheduled Promotions through the existing status action

- Status: Accepted
- Date: 2026-07-20
- Version line: 0.3.3 development

## Context

WordPress stores a post scheduled for future publication with the native
`future` status. Npcink Ad already labels that Promotion as **Not started**, but
the Promotion list only offered its POST-only pause action for `publish`
records. An operator therefore could not cancel a scheduled Promotion from the
same list surface used to pause a live Promotion.

This is a state-management inconsistency, not a request for another campaign
state. `post_status` remains the only publication truth, and the existing
Promotion start/end metadata remains the delivery-window truth after native
publication.

## Decision

The existing status action accepts this bounded transition matrix:

| Current native status | Operation | Result |
| --- | --- | --- |
| `publish` | Pause | `draft` |
| `future` | Pause | `draft` |
| `draft` | Pause | Already-paused notice |
| `draft` | Resume | `publish` after the existing configuration preflight |
| `publish` | Resume | Already-published notice |

`private`, `pending`, `trash`, and every unknown status remain unsupported for
both operations. A `future` Promotion cannot use **Resume** directly; it is
already scheduled and can only be paused.

The list renders **Pause** for both `publish` and `future`, and **Resume** only
for `draft`. Every mutation continues to require:

- an authenticated POST request;
- an operation-and-Promotion-bound nonce;
- the Promotion post type's edit capability;
- the publish capability for Resume;
- a successful re-read proving that WordPress reached the requested status.

When a paused scheduled Promotion is resumed, it publishes immediately. The
existing resume path resets a retained future native publication date so
WordPress cannot silently convert the record back to `future`. An operator who
wants a new future publication time must schedule it explicitly in the editor.

## Consequences

- Operators can cancel both live and not-yet-started Promotions from one
  management surface.
- No meta field, custom status, REST field, frontend branch, or visitor state is
  added.
- Full-page caches retain the existing limitation: affected pages may need a
  purge or suitable TTL after pause or resume.
- Unit tests cover the transition allowlist and protected native statuses;
  packaged browser tests cover schedule, pause, immediate resume, live delivery,
  and cleanup.

## Rejected alternatives

### Add a custom paused or cancelled status

Rejected. Native `draft` already expresses paused, and another state would
duplicate WordPress publication truth throughout REST, list, preview, and
delivery paths.

### Expose Quick Edit or a bulk status mutation

Rejected for this change. Those paths add partial-failure and preflight
semantics unrelated to fixing the single-record inconsistency.

### Preserve the old future date when resuming

Rejected. A button labelled Resume must not report success while WordPress
quietly leaves the Promotion scheduled. Re-scheduling remains an explicit
editor action.

## Release boundary

This decision applies only to the 0.3.3 development line. It does not modify,
rebuild, retag, or replace the accepted v0.3.2 GitHub Release artifact and does
not authorize a WordPress.org or SVN action.
