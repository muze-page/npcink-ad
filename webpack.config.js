const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'node:path' );

module.exports = {
	...defaultConfig,
	entry: {
		'block-editor': path.resolve(
			process.cwd(),
			'assets/js/block-editor-entry.tsx'
		),
		'promotion-editor': path.resolve(
			process.cwd(),
			'assets/js/promotion-editor-entry.tsx'
		),
	},
	output: {
		...defaultConfig.output,
		clean: true,
	},
	plugins: defaultConfig.plugins.filter(
		( plugin ) => plugin.constructor.name !== 'RtlCssPlugin'
	),
};
