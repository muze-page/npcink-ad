=== Npcink Ad ===
Contributors: Npcink
Tags: promotion, advertising, marketing, block
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 8.1
Stable tag: 0.3.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Create, preview, and publish site-owned promotions without a full advertising platform.

== Description ==

Npcink Ad is a focused, WordPress-native workflow for announcements, affiliate cards, campaign creative, and other site-owned promotions.

* Create promotion content with core WordPress blocks.
* Publish site-controlled Core Video creative through the same Promotion, preflight, preview, and delivery workflow.
* Configure location, one canonical content scope, explicit exclusions, schedule, and device in the same editor.
* For manual placement, insert the Npcink Ad Promotion block and select the same saved Promotion, or use the existing expert `[npcink_ad promotion="ID"]` shortcode.
* Search Promotion titles from the manual block selector, load further 20-record pages on demand, and retain saved selections outside the current result page.
* Place a promotion after a bounded top-level block paragraph or Classic HTML paragraph without frontend JavaScript.
* Publish a normal-flow page bar at the standard top or bottom theme hook, with a current-page close button and no persisted visitor state.
* Preview the promotion inside a real page and switch between desktop and mobile context. Desktop uses the fixed rule at `782px` and above, and mobile uses the fixed rule at `781px` and below; the `390px` mobile canvas is only a representative width.
* Read a truthful verdict explaining why the promotion will or will not display.
* Review rule status, placement, content scope, stop time, and inactivity reasons directly in the Promotion list.
* Follow a native three-step first-Promotion guide without opening another settings or wizard page.
* Catch empty creative, missing public targets, invalid paragraph settings, invalid schedules, and unverified placement before publication.
* Reject a saved Video block that has no usable root-relative or explicit HTTP(S) media source instead of reporting an empty player as ready.
* Receive an explicit TTL-or-purge warning when WordPress has an enabled advanced page-cache drop-in.
* Publish, pause, or expire one Promotion record without a separate placement object.
* Deliver eligibility and markup from the server without visitor tracking or custom tables. Only a rendered page bar loads its small current-page dismissal script; standard placements require no frontend JavaScript.
* Use the bundled Simplified Chinese translation in both PHP screens and the block editor.

Version 0.3.1 intentionally has no analytics, tracking cookies, plugin-initiated external API requests, A/B testing, ad-network integration, popup or sticky/floating bar builder, arbitrary code execution, or custom database tables. A visitor's browser still requests media URLs selected by the site operator.

Version 0.2.0 established the controlled 0.2 delivery scope: bounded after-paragraph delivery, mutually exclusive editorial content scopes, explicit manual block-or-shortcode guidance, and the fixed desktop/mobile boundary. Version 0.2.1 made the manual block selector reliable beyond its former bounded result set. Version 0.2.2 tightened editor asset ownership, first-Promotion guidance, complete browser validation, cache-boundary disclosure, and site-controlled Core Video validation. Version 0.3.0 keeps one Promotion and one delivery system while adding bounded normal-flow page bars. Version 0.3.1 improves their touch target, RTL spacing, and compact announcement pattern without changing delivery rules.

== Installation ==

1. Upload the `npcink-ad` folder to `/wp-content/plugins/` and activate Npcink Ad.
2. Open Npcink Ad > Promotions and add a Promotion.
3. Build the creative with WordPress blocks and set its location, content scope, explicit exclusions, device, and optional schedule in the editor sidebar. Paragraph placement accepts 1 through 20 and defaults to 3; page bars use the active theme's standard top or bottom hook.
4. For Manual block placement, save the Promotion, then insert the Npcink Ad Promotion block where it should appear and select that same Promotion. The `[npcink_ad promotion="ID"]` shortcode remains an expert alternative.
5. Save and open the real-page preview. Confirm the runtime verdict on desktop (`782px` and above) and mobile (`781px` and below).
6. Publish the Promotion. Change it to Draft whenever it should be paused.

== Frequently Asked Questions ==

= Does Npcink Ad track visitors? =

No. Version 0.3.1 does not collect impression or click analytics, set visitor tracking cookies, persist page-bar dismissal, or make an external API request. The browser requests only the creative media URL selected by the site operator.

= Why is there no separate placement or ad group? =

The first release optimizes for one short publishing workflow. Location and delivery rules belong to the Promotion. A separate reusable placement object will be considered only after real use proves it is needed.

= How do full-page caches affect schedules? =

The page must be regenerated after publish, pause, resume, start, and end transitions. Configure the cache TTL or purge affected pages at those boundaries. Version 0.3.1 warns when WordPress exposes an enabled advanced-cache drop-in, but it does not claim automatic purging or minute-accurate schedules through every cache provider.

= Does choosing Manual block insert the Promotion automatically? =

No. Save the Promotion, insert the Npcink Ad Promotion block at the intended location, and select that same Promotion. The existing `[npcink_ad promotion="ID"]` shortcode is an expert alternative. A missing-block editor warning is advisory because a template, synced pattern, or shortcode may provide the runtime entrypoint; verify the intended page with Real-page preview.

= What do the Desktop and Mobile device choices mean? =

Desktop is visible at `782px` and above, Mobile at `781px` and below, and All devices at every width. The boundary is fixed and there is no separate tablet target. Device visibility uses CSS so normal cached HTML does not branch by User-Agent. The preview's mobile canvas is capped at `390px` as a representative width, not as the production breakpoint.

= What kind of video advertising is supported? =

Npcink Ad supports a site-controlled Core Video block as Promotion creative. It validates that the saved video has a root-relative or explicit HTTP(S) source and then reuses the normal preflight, real-page preview, device, schedule, and placement rules. Bare relative paths and protocol-relative URLs are rejected to preserve the same source through Core KSES. It does not provide VAST/IMA, pre-roll or rewarded video, playback analytics, popup video, or an ad-network player. URL availability, codecs, media requests, and browser autoplay policy remain site and browser responsibilities.

= Are page bars sticky or remembered after a visitor closes them? =

No. Version 0.3.1 page bars remain in normal document flow. The close button hides a bar only for the current page and does not use cookies or local storage. Sticky, floating, delayed, frequency-controlled, and popup behavior remain outside this release.

= Does 0.3.1 migrate data from earlier development snapshots? =

No. Version 0.3.1 remains pre-GA and has no compatibility adapters or migrations for earlier development snapshots or unpublished identifiers.

== Changelog ==

= 0.3.1 =

* Increase the normal-flow page-bar dismiss target to 44 by 44 CSS pixels and reserve its space with RTL-safe logical padding.
* Refine the existing compact announcement pattern into wrapping short copy plus an editable Core Button CTA.
* Add packaged mobile-width and RTL geometry checks while preserving current-page dismissal, device rules, and the dependency-free 1 KiB script budget.

= 0.3.0 =

* Add top and bottom page-bar locations to the existing Promotion REST enum, evaluator, scope, schedule, device, overlap, list, and preflight contracts.
* Render bars through `wp_body_open` and `wp_footer` in normal document flow, with truthful real-page preview and a missing-hook diagnostic.
* Add an accessible current-page dismissal control backed by a tiny conditional script with no cookies, local storage, frequency state, or tracking.
* Keep popup, sticky/floating, interstitial, and visitor-state behavior outside the bounded page-bar contract.

= 0.2.2 =

* Split the manual block and Promotion document editor into separate assets so ordinary post editors no longer load Promotion-only behavior.
* Add native empty-list guidance and a compact three-step Promotion-editor checklist derived from the existing publication preflight.
* Warn in Promotion management surfaces when WordPress exposes an enabled advanced-cache drop-in; keep TTL or affected-page purge as an operator responsibility.
* Validate scheduled start, scheduled end, pause, and resume against a real WP Super Cache Simple-mode page cache and record the deployment evidence in ADR 004.
* Add packaged-plugin E2E from Add New through selected-page configuration, authenticated real-page preview, publish, live delivery, pause, resume, and cleanup on the minimum and current WordPress matrices.
* Treat site-controlled Core Video as Promotion creative and reject source-less or unsafe video sources through the shared publication policy.

= 0.2.1 =

* Replace the manual block selector's bounded first result set with debounced server-side title search and real 20-record pagination, including page-two loading.
* Resolve saved Promotion IDs independently so selections outside the current result page survive loading, failed requests, editor saves, and reloads without false deletion claims.
* Add packaged-plugin Gutenberg editor E2E coverage on the minimum and current WordPress/PHP matrices, including keyboard selection, pagination, persistence, and browser error checks.
* Keep the Promotion schema, block attributes, REST contract, eligibility rules, and frontend delivery behavior unchanged.

= 0.2.0 =

* Unify publication preflight, Promotion-list status, preview verdicts, and live delivery on the shared eligibility policy; add inline pause and resume actions.
* Document the full-page-cache boundary for publication and schedules, including explicit TTL or purge guidance for start and stop times.
* Bound automatic delivery to standard posts and pages and add non-blocking overlap guidance for Promotions that may render together.
* Add server-rendered placement after paragraph 1 through 20, with explicit missing-anchor evidence and no silent fallback.
* Add mutually exclusive all, posts, pages, Core category/tag, and selected-content scopes with explicit exclusions taking precedence.
* Clarify manual block and shortcode entrypoints, the fixed `781px`/`782px` mobile/desktop boundary, and the representative `390px` preview canvas.
* Keep the Promotion editor compatible with WordPress 6.5 through the supported legacy SlotFill dependency fallback.

= 0.1.0 =

* Internal pre-GA development baseline; not publicly released.
* Introduce the Npcink Ad brand and single Promotion publishing model.
* Add same-editor basic location, content, schedule, and device rules.
* Add truthful real-page desktop/mobile preview and server-rendered delivery.
* Keep the default runtime free of visitor tracking, custom tables, and external requests.
* Add complete bundled Simplified Chinese PHP and JavaScript translations.
