# Npcink Ad 0.1 Product Contract

## Product identity

- Brand: **Npcink**
- Product: **Npcink Ad**
- Visual wordmark: **npcink ad**
- WordPress slug and text domain: `npcink-ad`
- Positioning: a WordPress-native, privacy-first workflow for publishing on-site promotions
- Promise: create, preview, and publish an on-site promotion without learning an ad-operations platform

The product name stays short. Descriptive copy, rather than the name, explains the workflow. In Chinese product surfaces, use “WordPress 原生站内推广发布工具” and “创建、预览并发布站内推广” where a longer explanation is useful.

## Primary user and job

Npcink Ad is for a WordPress editor or site operator who needs to publish a site-owned promotion, announcement, affiliate card, or campaign creative. It is not designed for a professional ad-operations team managing an ad network.

The primary job is:

> Create a promotion with WordPress content, choose where and when it appears, verify the result on a real page, and publish or pause it.

## Product language

The default interface exposes three concepts:

1. **Promotion** — the content and its publishing state.
2. **Placement** — where, on which pages, when, and on which devices it may appear.
3. **Preview** — the real-page view and the explanation of whether it will appear.

Implementation details such as slots, variants, resolvers, targeting engines, templates, events, queues, and consent adapters must not become primary navigation or required vocabulary.

## Required 0.1 workflow

One complete vertical workflow is more important than broad feature coverage:

1. Create a promotion using WordPress blocks.
2. Choose a placement: block, before content, or after content.
3. Include or exclude pages.
4. Optionally set a start and end time.
5. Choose all devices, desktop, or mobile.
6. Preview on a real page at desktop and mobile widths.
7. Read an explicit runtime verdict explaining why the promotion will or will not appear.
8. Publish, pause, or let the promotion expire.

The default path must not require custom HTML or JavaScript. Expert code insertion, if retained, is opt-in and separated from the primary workflow.

## Usability budgets

The 0.1 product is accepted only when:

- a new user can publish a valid promotion in no more than three minutes without reading documentation;
- no more than seven primary controls are visible before opening advanced settings;
- the user does not need to create or understand a separate ad group, slot, variant, or tracking object;
- the product explains invalid or inactive delivery before publication;
- the basic frontend delivery path adds no tracking request and no required frontend JavaScript.

## Privacy and data boundaries

Npcink Ad 0.1:

- stores its source of truth in WordPress posts and registered typed metadata;
- performs eligibility and rendering on the server;
- does not collect impressions, clicks, IP addresses, user agents, referrers, cookies, user IDs, or page-view events;
- does not create statistics tables, event queues, aggregation cron jobs, or visitor profiles;
- keeps management REST access capability-protected and does not expose unpublished creative anonymously;
- removes only its own documented data during explicit uninstall.

Analytics, A/B testing, frequency controls, consent integrations, and visitor targeting require a new decision record backed by observed user demand and a privacy design.

## Explicit non-goals

Npcink Ad 0.1 is not:

- an AdSense or Google Ad Manager integration;
- a generic arbitrary-code inserter;
- an advertising analytics platform;
- a popup, sticky banner, or background-ad builder;
- an A/B testing, rotation, frequency, geolocation, or click-fraud suite;
- a CMP or consent-detection product;
- a template marketplace;
- a compatibility-report or debugging product.

## How to use the old `master`

The Magick AD `master` branch is a product-research corpus, not an implementation target. A feature may be brought forward only when all of the following are true:

1. it directly improves the required 0.1 workflow;
2. it can be expressed with the current product language;
3. it does not restore deleted tracking, table, queue, migration, or broad targeting dependencies;
4. its permission, privacy, storage, uninstall, and test contracts are explicit;
5. selective reuse is simpler and safer than a fresh implementation.

Real-page preview, device preview, and human-readable runtime verdicts are candidates for selective reconstruction. The old administration SPA, tracking system, statistics dashboard, A/B subsystem, CMP integrations, template marketplace, and compatibility/debug menus are not candidates for restoration.

## Feature admission rule

Every proposed feature must answer both questions:

1. Does it reduce the time or uncertainty involved in correctly publishing a promotion?
2. If mature WordPress plugins already provide it, why must Npcink Ad own it?

If either answer is missing, the feature stays outside the core product.

## Accepted 0.2 direction (implementation in progress)

The runtime and required workflow documented above remain the current 0.1 product. [ADR 005](decisions/005-controlled-delivery-expansion.md) accepts a bounded 0.2 delivery direction. Its groundwork is implemented: automatic delivery is limited to standard posts/pages, and management surfaces provide a non-blocking advisory when automatic Promotions may appear together. The following user-facing expansion remains ordered work rather than current capability:

1. add an after-the-Nth-paragraph automatic location for standard WordPress posts and pages;
2. add a collapsed advanced editorial scope for standard posts/pages and applicable categories/tags;
3. improve manual-block guidance and explain the existing desktop/mobile breakpoint.

Multiple eligible Promotions at one automatic location continue rendering in deterministic order, while management UI only advises that they **may** appear together. This direction does not add priority, weights, rotation, tablet targeting, arbitrary selectors or hooks, visitor state, tracking, or separate Slot/Placement records.
