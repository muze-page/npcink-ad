# WordPress.org review and release checklist

## Before uploading the ZIP

- [ ] Confirm the final display name and requested slug are `Npcink Ad` and
  `npcink-ad`; a directory URL cannot be renamed after submission.
- [ ] Use the `muze233` WordPress.org account and verify that its email is
  current, monitored, and suitable for representing the Npcink brand.
- [ ] Whitelist `plugins@wordpress.org` and check spam during review.
- [ ] Promote the WordPress.org material through `v0.3.2` instead of modifying
  or reusing the already checksummed `v0.3.1` ZIP.
- [ ] Make the root plugin version, `NPCINK_AD_VERSION`, `package.json`, root
  `readme.txt` Stable tag, Git tag, and SVN tag identical.
- [ ] Copy the candidate `readme.txt` and `changelog.txt` into the plugin root;
  keep the root readme below 10 KiB.
- [ ] Confirm runtime code contains no manual `load_plugin_textdomain()` call
  and the packaged Playground smoke proves Simplified Chinese through the
  WordPress.org PHP language-pack path and editor JSON catalogs.
- [ ] Run `bash scripts/release-gate.sh`; accept no Plugin Check error and
  review every warning rather than hiding it.
- [ ] Install the exact generated ZIP through Plugins > Add Plugin > Upload
  Plugin on a clean site; do not test only the source symlink.
- [ ] Confirm the ZIP is below the official 10 MB upload limit, contains the
  compiled assets, and contains no tests, Node modules, Composer vendor tree,
  development logs, or source maps.
- [ ] Recompute the `.zip.sha256` after downloading the final artifact.
- [ ] Submit the exact final ZIP at <https://wordpress.org/plugins/developers/add/>.

## During review

- [ ] Reply inside the existing review email thread; do not submit a duplicate
  plugin if changes are requested.
- [ ] Treat reviewer requests as release blockers and preserve their exact
  wording in a GitHub issue or pull request.
- [ ] Keep the source repository public and include reproducible build steps.
- [ ] Explain that operator-selected image/video URLs are content resources,
  not an Npcink external service.
- [ ] Do not claim analytics, ad-network compatibility, automatic cache purge,
  legal compliance, or minute-accurate delivery through every page cache.

## After approval

- [ ] Check out `https://plugins.svn.wordpress.org/npcink-ad`.
- [ ] Put plugin files directly in `trunk/`; do not nest them in another
  `npcink-ad/` directory.
- [ ] Copy directory PNGs into top-level `assets/`, next to `trunk/` and
  `tags/`, and set their SVN MIME types to `image/png`.
- [ ] Copy the tested trunk to `tags/0.3.2/`; do not use `Stable tag: trunk`.
- [ ] Confirm the Stable tag points to a real SVN tag whose main PHP Version
  matches exactly.
- [ ] Complete any WordPress.org release-confirmation step and verify the
  public download ZIP before announcing availability.
- [ ] Verify the public icon, banners, screenshot order, captions, install
  button, minimum versions, and Simplified Chinese translation.
- [ ] Enter and review the strings in `translation-copy-zh_CN.md` through the
  WordPress.org translation workflow; do not upload that Markdown file to SVN.
- [ ] Make one test install from the WordPress admin directory search and one
  update-path test on the next patch release.

## Proposed SVN layout

```text
npcink-ad/
├── assets/
│   ├── banner-772x250.png
│   ├── banner-1544x500.png
│   ├── banner-772x250-zh_CN.png
│   ├── banner-1544x500-zh_CN.png
│   ├── icon-128x128.png
│   ├── icon-256x256.png
│   ├── screenshot-1.png
│   ├── screenshot-1-zh_CN.png
│   ├── screenshot-2.png
│   ├── screenshot-2-zh_CN.png
│   ├── screenshot-3.png
│   └── screenshot-3-zh_CN.png
├── trunk/
│   ├── npcink-ad.php
│   ├── readme.txt
│   └── ...
└── tags/
    └── 0.3.2/
        ├── npcink-ad.php
        ├── readme.txt
        └── ...
```
