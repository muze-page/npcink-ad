=== Magick AD ===
Contributors: Npcink
Tags: advertising, ads, block, placements
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 8.1
Stable tag: 0.2.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Create block-based ads and render them through explicit, server-side WordPress placements.

== Description ==

Magick AD 0.2 is a small, WordPress-native advertising placement baseline.

* Create ad content with the WordPress block editor.
* Create reusable placements that reference a published ad.
* Render a placement with the Magick AD block, shortcode, or supported content locations.
* Limit a placement to desktop or mobile requests.
* Stop an ad at an optional expiry date and time.
* Evaluate publication, assignment, expiry, and device rules on the server.

Version 0.2 intentionally has no visitor analytics, tracking cookies, external requests, A/B testing, custom JavaScript, popup builder, or custom database tables.

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`.
2. Activate the plugin through the WordPress Plugins screen.
3. Create and publish an ad under Magick AD > Ads.
4. Create and publish a placement under Magick AD > Placements, then assign the ad.
5. Insert the Magick AD block and select that placement, or choose a supported automatic location.

== Frequently Asked Questions ==

= Does Magick AD track visitors? =

No. The 0.2 baseline does not collect impression or click analytics, set visitor tracking cookies, or contact an external service.

= Does 0.2 migrate data from development version 0.1? =

No. Version 0.2 is a destructive pre-GA reset. It does not provide compatibility adapters or data migrations for unpublished 0.1 storage and APIs.

== Changelog ==

= 0.2.0 =

* Reset the plugin to native ad and placement post types with typed meta.
* Add one server-side eligibility and rendering path for blocks and automatic locations.
* Remove the unpublished analytics, tracking, migration, custom REST, custom table, and administration SPA subsystems.
