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

const splitChunks = defaultConfig?.optimization?.splitChunks || {};
const cacheGroups = splitChunks?.cacheGroups || {};

module.exports = {
    ...defaultConfig,
    entry: buildEntry,
    optimization: {
        ...(defaultConfig.optimization || {}),
        splitChunks: {
            ...splitChunks,
            // Keep async vendor chunks under webpack performance warning threshold.
            maxSize: 220000,
            cacheGroups: {
                ...cacheGroups,
                chartVendors: {
                    test: /[\\/]node_modules[\\/].*(recharts|d3-[^\\/]+|victory-vendor)[\\/]/,
                    name: 'chart-vendors',
                    chunks: 'async',
                    priority: 30,
                    enforce: true,
                    reuseExistingChunk: true,
                },
            },
        },
    },
};
