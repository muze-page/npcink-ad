# Magick AD WP

WordPress advertising plugin with ad placement configuration, targeting, reporting, and diagnostics.

**Features**
- Placement configuration (page scope, insertion position, device, login state)
- Impression and click reporting
- Diagnostics logs and export
- Frontend rendering and tracking

**Structure**
- `src/` application code
- `build/` frontend build output
- `dist/` release package
- `templates/` frontend templates

**Development**
- Dev server: `pnpm run start`
- Build: `pnpm run build`
- Release package: `pnpm run dist`

**Plugin Check**
- `wp plugin check "wp-content/plugins/magick-ad/dist/magick-ad" --format=table`
