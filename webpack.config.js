const path = require('path');
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const { getWebpackEntryPoints } = require('@wordpress/scripts/utils');

const frontendEntries = {
    'magick-ad-interactivity': path.resolve(
        __dirname,
        'assets/js/frontend/magick-ad-interactivity.ts'
    ),
    'magick-ad-slot-resolver': path.resolve(
        __dirname,
        'assets/js/frontend/magick-ad-slot-resolver.ts'
    ),
    'magick-ad-track': path.resolve(
        __dirname,
        'assets/js/frontend/magick-ad-track.ts'
    ),
};

const buildEntry = () => ({
    ...getWebpackEntryPoints(),
    ...frontendEntries,
});

module.exports = {
    ...defaultConfig,
    entry: buildEntry,
};
