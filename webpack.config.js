const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'node:path' );

function deduplicateTranslatorComments( source ) {
	return source.replace( /(\/\* translators:[\s\S]*?\*\/)(?:\s+\1)+/g, '$1' );
}

class DeduplicateTranslatorCommentsPlugin {
	apply( compiler ) {
		const { Compilation, sources } = compiler.webpack;

		compiler.hooks.thisCompilation.tap(
			'DeduplicateTranslatorCommentsPlugin',
			( compilation ) => {
				compilation.hooks.processAssets.tap(
					{
						name: 'DeduplicateTranslatorCommentsPlugin',
						stage:
							Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE + 1,
					},
					( assets ) => {
						Object.keys( assets )
							.filter( ( assetName ) =>
								assetName.endsWith( '.js' )
							)
							.forEach( ( assetName ) => {
								const original = assets[ assetName ]
									.source()
									.toString();
								const optimized =
									deduplicateTranslatorComments( original );

								if ( optimized !== original ) {
									compilation.updateAsset(
										assetName,
										new sources.RawSource( optimized )
									);
								}
							} );
					}
				);
			}
		);
	}
}

module.exports = {
	...defaultConfig,
	entry: {
		'block-editor': path.resolve(
			process.cwd(),
			'assets/js/block-editor-entry.tsx'
		),
		'page-bar': path.resolve(
			process.cwd(),
			'assets/js/page-bar-entry.ts'
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
	plugins: [
		...defaultConfig.plugins.filter(
			( plugin ) => plugin.constructor.name !== 'RtlCssPlugin'
		),
		new DeduplicateTranslatorCommentsPlugin(),
	],
};
