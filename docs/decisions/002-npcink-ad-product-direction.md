# ADR 002: Rename and focus the product as Npcink Ad

- Status: Accepted
- Date: 2026-07-15
- Supersedes: the Magick AD name and 0.2 product framing in ADR 001

## Context

The unpublished Magick AD implementation explored a broad advertising suite: a custom administration application, templates, complex targeting, tracking and statistics, queues, A/B variants, consent integrations, debugging surfaces, and several delivery runtimes. That breadth created a high learning and maintenance cost before a primary user workflow had been validated.

The destructive native baseline removed those speculative systems and established safer WordPress data, capability, REST, rendering, testing, and packaging boundaries. It also removed the most recognizable product workflow and left a technically sound but largely interchangeable placement renderer.

There is no deployed user base, public API consumer, or compatibility obligation. The product may therefore reset its brand, identifiers, storage contract, and version without adapters or dual paths.

## Decision

Rename the product to **Npcink Ad** and restart it at version `0.1.0`.

Use these identifiers consistently:

- display name: `Npcink Ad`;
- visual wordmark where appropriate: `npcink ad`;
- plugin directory, package slug, and text domain: `npcink-ad`;
- PHP namespace: `Npcink\Ad`;
- PHP functions and constants: `npcink_ad_*` and `NPCINK_AD_*`;
- block namespace: `npcink-ad/promotion`.

Do not provide aliases for Magick AD names, old post types, metadata, REST routes, shortcodes, globals, options, tables, or hooks. Development fixtures may be discarded.

Npcink Ad will be a WordPress-native workflow for site-owned promotions. Product work must first deliver the single vertical flow defined in `docs/product-contract.md`: create, place, preview with a runtime verdict, and publish or pause.

Retain the native baseline's architectural rules:

- WordPress posts and registered typed metadata are authoritative;
- capability-protected core REST may support WordPress editors;
- eligibility is deterministic and independently testable;
- rendering is server-side;
- basic delivery performs no visitor tracking and requires no custom tables;
- package and uninstall behavior are verified.

Treat the old `master` branch as read-only research material. Selectively reconstruct only behavior that directly serves the product contract. Do not merge or restore the old product wholesale.

## Alternatives considered

### Restore the Magick AD administration application

Rejected. It restores the high-threshold product model and its coupled data and runtime assumptions before proving the primary job.

### Ship the current native baseline unchanged under a new name

Rejected. A generic promotion/placement renderer does not provide a sufficiently coherent or differentiated workflow.

### Use `Npcink Ad Manager` or `Npcink Ads`

Rejected. These names imply a broad advertising-management suite and place the product in direct comparison with mature ad-network and code-insertion plugins. `Npcink Ad` keeps the brand and purpose explicit without promising that scope.

### Preserve old identifiers for future migration safety

Rejected. There is no installed base to protect. Compatibility aliases would make unpublished contracts permanent and make the reset less auditable.

## Consequences

- Existing local development data under Magick AD identifiers is disposable and is not migrated.
- Rename work must be complete across PHP, JavaScript, blocks, packaging, tests, documentation, and release artifacts before feature reconstruction.
- A brand rename alone is not considered product completion; the required publishing workflow and real-page verification must exist.
- New features are rejected by default unless they pass the admission rule in the product contract.
- ADR 001 remains authoritative for the reasons behind native storage, protected REST, deterministic eligibility, zero-tracking delivery, testing, and release gates. Its Magick AD naming and `0.2` version references are historical.

