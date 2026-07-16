import { getBlockPreviewMode } from './block-preview-state';

describe( 'getBlockPreviewMode', () => {
	test( 'does not request server rendering when preview is on without a Promotion', () => {
		expect( getBlockPreviewMode( 0, true ) ).toBe( 'no-selection' );
	} );

	test( 'requests server rendering when preview is on with a selected Promotion', () => {
		expect( getBlockPreviewMode( 12, true ) ).toBe( 'server-side-render' );
	} );

	test( 'does not request server rendering when preview is off', () => {
		expect( getBlockPreviewMode( 12, false ) ).toBe( 'preview-disabled' );
	} );
} );
