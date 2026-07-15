=== Npcink Ad ===
Contributors: Npcink
Tags: promotion, advertising, marketing, block
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 8.1
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Create, preview, and publish site-owned promotions without a full advertising platform.

== Description ==

Npcink Ad is a focused, WordPress-native workflow for announcements, affiliate cards, campaign creative, and other site-owned promotions.

* Create promotion content with core WordPress blocks.
* Configure location, page scope, exclusions, schedule, and device in the same editor.
* Place a promotion after a bounded top-level block paragraph or Classic HTML paragraph without frontend JavaScript.
* Preview the promotion inside a real page and switch between desktop and mobile context.
* Read a truthful verdict explaining why the promotion will or will not display.
* Review rule status, placement, page scope, stop time, and inactivity reasons directly in the Promotion list.
* Catch empty creative, missing public targets, invalid paragraph settings, invalid schedules, and unverified placement before publication.
* Publish, pause, or expire one Promotion record without a separate placement object.
* Deliver from the server without visitor tracking, custom tables, or required frontend JavaScript.
* Use the bundled Simplified Chinese translation in both PHP screens and the block editor.

Version 0.1 intentionally has no analytics, tracking cookies, external requests, A/B testing, ad-network integration, popup builder, arbitrary code execution, or custom database tables.

== Installation ==

1. Upload the `npcink-ad` folder to `/wp-content/plugins/` and activate Npcink Ad.
2. Open Npcink Ad > Promotions and add a Promotion.
3. Build the creative with WordPress blocks and set its location, pages, device, and optional schedule in the editor sidebar. Paragraph placement accepts 1 through 20 and defaults to 3.
4. Save and open the real-page preview. Confirm the runtime verdict on desktop and mobile.
5. Publish the Promotion. Change it to Draft whenever it should be paused.

== Frequently Asked Questions ==

= Does Npcink Ad track visitors? =

No. Version 0.1 does not collect impression or click analytics, set visitor tracking cookies, or contact an external service.

= Why is there no separate placement or ad group? =

The first release optimizes for one short publishing workflow. Location and delivery rules belong to the Promotion. A separate reusable placement object will be considered only after real use proves it is needed.

= How do full-page caches affect schedules? =

The page must be regenerated after a start or end boundary. Configure the cache TTL or purge affected pages when a Promotion changes. Version 0.1 does not claim minute-accurate schedules through every third-party cache.

= Does 0.1 migrate data from earlier development builds? =

No. Version 0.1 defines a new pre-GA contract and has no compatibility adapters or migrations for earlier unpublished identifiers.

== Changelog ==

= 0.1.0 =

* Introduce the Npcink Ad brand and single Promotion publishing model.
* Add same-editor location, page, schedule, and device rules.
* Add truthful real-page desktop/mobile preview and server-rendered delivery.
* Add shared-rule publication preflight, list diagnostics, and inline pause/resume controls.
* Add bounded after-paragraph placement with truthful missing-anchor preview evidence.
* Keep the default runtime free of visitor tracking, custom tables, and external requests.
* Add complete bundled Simplified Chinese PHP and JavaScript translations.
