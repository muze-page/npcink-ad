# Page Bar Visual QA

Date: 2026-07-20

## Comparison target

- Original problem reference: [Figma source capture, node 1:2](https://www.figma.com/design/Ln1B5rYUYArc10HEcvhwMh?node-id=1-2)
- Source visual truth: [Figma target, node 4:7](https://www.figma.com/design/Ln1B5rYUYArc10HEcvhwMh?node-id=4-7)
- Full comparison evidence: [Figma target and Local implementation, node 9:2](https://www.figma.com/design/Ln1B5rYUYArc10HEcvhwMh?node-id=9-2)
- Desktop implementation screenshot: [Figma Local capture, node 8:3](https://www.figma.com/design/Ln1B5rYUYArc10HEcvhwMh?node-id=8-3)
- Mobile implementation screenshot: [Figma Local capture, node 8:2](https://www.figma.com/design/Ln1B5rYUYArc10HEcvhwMh?node-id=8-2)

## Rendered state

- URL: `http://ad.local/magick-ad-local-smoke-page/`
- WordPress theme: Twenty Twenty-Five 1.5
- Promotion: existing Local draft ID 128, temporarily published without content changes for the capture and restored to `draft` immediately afterward
- Desktop viewport: 1440 × 900 CSS pixels
- Mobile viewport: 390 × 844 CSS pixels
- State: top page bar visible, default dismissal control state, Chinese creative content

## Findings

No actionable P0, P1, or P2 visual differences remain.

- The full-width shell remains visually connected to the page edge while the inner container follows the active theme's `1340px` wide-size token.
- At desktop width the measured inner container is `1340px`, with equal `42.5px` inline gaps inside the `1425px` scrollbar-adjusted page width. The dismiss target remains inside that container.
- At mobile width the measured inner container is `343px`, with equal `16px` inline gaps inside the `375px` scrollbar-adjusted page width. There is no horizontal overflow.
- The dismissal control measures `44 × 44px`; its visible surface is `32 × 32px`, and the WordPress `close-small` icon is `16 × 16px`.
- The target board contains authenticated admin chrome and an idealized creative layout, while the Local capture is a public page using the actual Gutenberg columns and active-theme styles. Those are expected state and user-authored-content differences, not page-bar wrapper drift.

## Required fidelity surfaces

- Fonts and typography: the wrapper does not override user-authored block typography; the live capture preserves the active theme's Chinese font fallbacks, weights, wrapping, and line height. No truncation was introduced.
- Spacing and layout rhythm: the theme-wide maximum, equal inline gutters, fixed dismissal track, and vertical centering are correct at both tested viewports. The creative is allowed to wrap naturally.
- Colors and visual tokens: existing creative colors are unchanged. The dismiss surface uses the intended low-emphasis current-color opacity and becomes stronger only for interaction states.
- Image quality and asset fidelity: the page bar has no photographic asset. The dismissal mark uses WordPress's vector `close-small` icon rather than a text glyph or CSS drawing, and renders sharply at 16px.
- Copy and content: the existing Chinese copy and CTA are preserved exactly. The button's accessible label remains `关闭推广横栏`.
- Responsiveness and accessibility: the 44px hit target is preserved on mobile; the desktop and mobile captures show no overlap or clipping. The control is a semantic button with a visible focus rule in the implementation.

## Focused comparison evidence

The combined Figma QA frame uses two 1440 × 240 top-page regions in one comparison input. This is already a focused component view: the theme-wide boundary, copy, CTA, 32px dismiss surface, and 16px icon remain legible, so a second crop was not needed.

## Primary interactions and runtime checks

- The page bar rendered on a real Local WordPress page with the source branch mounted through the plugin symlink.
- Clicking `关闭推广横栏` set the bar to `hidden`, computed `display: none`, and a zero-height rectangle.
- Browser console check after dismissal: 0 errors and 0 warnings.
- The temporary publication was reverted; a fresh unauthenticated request no longer rendered Promotion 128.

## Comparison history

- Pass 1: no P0/P1/P2 findings. No visual fix was required after the combined target-versus-implementation comparison.
- Expected differences were classified before judgment: authenticated admin chrome versus public capture, scrollbar-adjusted content width, and user-authored Gutenberg block layout versus the idealized creative in the target.

## Implementation checklist

- [x] Constrain the page-bar inner content to the theme wide-size token with a 1200px classic-theme fallback.
- [x] Keep symmetric inline gutters and the dismiss control inside the constrained container.
- [x] Preserve a 44px target, 32px visual surface, and 16px WordPress icon.
- [x] Preserve wrapping, RTL behavior, semantic labeling, focus treatment, and current dismissal behavior.
- [x] Validate desktop, mobile, dismissal behavior, and browser console output.

final result: passed
