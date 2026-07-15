# ADR 007: Use one canonical editorial content scope

- Status: Accepted
- Date: 2026-07-15

## Context

Npcink Ad already supports explicit standard-post/page IDs through one Promotion record and one PHP eligibility policy. ADR 005 accepts a bounded editorial expansion, but it does not define how post types, categories, tags, and the existing selected-content path compose.

WordPress Core gives the product a useful fixed boundary: standard posts use the built-in `category` and `post_tag` taxonomies, while standard pages do not use either taxonomy by default. Published posts always have a category because Core assigns the site's default category when needed; posts may have no tags. Category and tag relationships can change independently after a Promotion is published.

Two tempting representations would create hidden complexity:

- treating selected IDs and terms as positive rules joined by `OR`; or
- storing `all | selected` in one field and a second advanced scope that is silently ignored in some combinations.

Both representations make empty-target validation, list explanations, overlap hints, and real-page preview harder to explain. The first also turns the advanced section into the start of a boolean targeting builder.

## Decision

### One positive population

Each Promotion has one canonical `content_scope`:

- `all`: every published standard post and page;
- `posts`: every published standard post;
- `pages`: every published standard page;
- `terms`: published standard posts directly assigned at least one configured Core category or post tag;
- `selected`: explicitly selected published standard post/page IDs.

The representation is mutually exclusive. Positive selected IDs and positive terms are never combined in one Promotion. `_npcink_ad_exclude_ids` remains a cross-scope veto and always wins for the matching content ID.

The stored metadata is `_npcink_ad_content_scope`, `_npcink_ad_include_ids`, `_npcink_ad_exclude_ids`, `_npcink_ad_category_ids`, and `_npcink_ad_tag_ids`. The pre-GA project has no compatibility requirement for the removed `_npcink_ad_page_scope` field and does not add a dual-read migration path.

### Term boundary

- Only Core `category` and `post_tag` IDs are accepted. Custom taxonomies and custom post types remain unsupported.
- A term rule uses direct object-term relationships. Selecting a parent category does not implicitly include posts assigned only to descendant categories.
- Category and tag selections are joined by `OR`: any one direct configured match is sufficient.
- There is no term-exclusion list, taxonomy-level `AND`, nested condition group, or generic boolean rule builder.
- Standard pages never match `terms`, even if another plugin registers a built-in taxonomy for pages at runtime.
- The repository resolves term existence and taxonomy ownership against current WordPress data. A `terms` scope with no active term IDs fails closed with `promotion_targets_empty`; malformed, missing, or wrong-taxonomy IDs fail closed with `promotion_terms_invalid`.
- Runtime delivery reads current term relationships. Changing a post's categories or tags changes its next uncached eligibility decision without rewriting the Promotion.

No term-deletion hook scans and rewrites every Promotion. Stored references may remain inert metadata after deletion, while every domain read resolves their current validity; list, preview, preflight, resume, and frontend delivery all consume that same current result.

### Automatic and manual delivery

The five scopes apply to automatic before-content, after-content, and after-paragraph delivery. Automatic runtime context is limited to the current standard post/page type and the current post's direct Core category/tag IDs.

Manual Promotion blocks and the shortcode retain only their explicit `all | selected` behavior. If a manual delivery receives `posts`, `pages`, or `terms`, PHP evaluates that positive scope as `all`; explicit ID exclusions still veto. The editor must not present advanced automatic scopes for manual placement.

### Management evidence and overlap

PHP remains authoritative. Publication preflight, resume, list readiness, real-page preview, and normal frontend delivery use the same normalized Promotion domain and evaluator.

The list keeps one content-scope column. It summarizes the canonical population, the number of configured terms, invalid term state, effective public selected IDs, and explicit exclusions without claiming a live matched-post count.

Overlap remains advisory and conservative:

- `posts` versus `pages`, and `pages` versus `terms`, are provably disjoint;
- `posts` versus `terms` may overlap;
- two term rules may overlap even when their configured terms differ, because one post can hold several categories and tags;
- invalid or empty term rules have no effective published overlap target;
- selected/selected retains exact effective-ID comparison;
- selected versus a broad non-`all` scope remains “may overlap” when the pure detector lacks content-type and term data.

The detector does not query or expand the full site content universe.

## Alternatives considered

### Join selected IDs and terms with `OR`

Rejected. It allows one Promotion to cover a special page plus a term-selected post population, but it makes “selected” dynamic, cannot directly express all posts or all pages, and introduces cross-rule emptiness and overlap semantics that resemble a boolean targeting engine.

The accepted cost is explicit: the same creative aimed at one individually selected page and at category/tag-selected posts requires two Promotions. They remain separately reviewable and may produce the existing non-blocking overlap advisory. This duplication is preferable to making every Promotion carry a composite rule language before observed demand justifies it.

### Keep `page_scope` plus a second advanced scope

Rejected. Two fields would permit contradictory stored states and require every reader to remember which field is ignored. One canonical enum gives REST, PHP, JavaScript, list summaries, and tests a single source of truth.

### Snapshot matching post IDs when publishing

Rejected. A snapshot becomes stale when editors change post terms and would require synchronization, cleanup, and a misleading difference between WordPress editorial state and delivery.

### Restore the old broad targeting implementation

Rejected. The old `master` branch remains product-research material only. It can inform questions and terminology, but it is not an implementation source or compatibility contract. This decision does not restore its arbitrary taxonomy, custom-post-type, rule-composition, placement, tracking, or administration systems.

## Consequences

- Default `all` behavior remains unchanged and the advanced control stays collapsed.
- All-posts, all-pages, term-selected posts, and explicit selected content are now directly expressible and explainable.
- Pages have no category/tag edge case in the product contract: they simply never match `terms`.
- Term deletion and relationship changes fail closed or take effect from current WordPress state; no background migration or target snapshot is introduced.
- Reason codes, list summaries, preview verdicts, REST preflight, resume, overlap, and Playground tests must change together.
- Manual-block/device guidance remains the next ordered ADR 005 step; this decision does not claim that work is complete.
