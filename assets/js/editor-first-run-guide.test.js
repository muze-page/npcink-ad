jest.mock( '@wordpress/components', () => ( {
	Button: () => null,
	ComboboxControl: () => null,
	Notice: () => null,
	PanelBody: () => null,
	SelectControl: () => null,
	Spinner: () => null,
	TextControl: () => null,
} ) );
jest.mock( '@wordpress/core-data', () => ( { store: {} } ) );
jest.mock( '@wordpress/data', () => ( {
	useDispatch: jest.fn(),
	useSelect: jest.fn(),
} ) );
jest.mock( '@wordpress/edit-post', () => ( {
	PluginDocumentSettingPanel: () => null,
	PluginPrePublishPanel: () => null,
} ) );
jest.mock( '@wordpress/editor', () => ( {
	PluginDocumentSettingPanel: () => null,
	PluginPrePublishPanel: () => null,
	store: {},
} ) );
jest.mock( '@wordpress/plugins', () => ( {
	registerPlugin: jest.fn(),
} ) );
jest.mock( './preflight', () => ( {
	contentContainsPromotionBlock: jest.fn(),
	contentScopeForPlacement: jest.fn(),
	effectiveParagraphNumber: jest.fn(),
	getEffectivePromotionTermSelection: jest.fn(),
	getEffectivePromotionTargetIds: jest.fn(),
	getPotentiallyOverlappingPromotionIds: jest.fn(),
	getPromotionPreflightIssues: jest.fn(),
	inspectParagraphAnchor: jest.fn(),
	isValidParagraphNumber: jest.fn(),
	MAX_PARAGRAPH_NUMBER: 20,
	MIN_PARAGRAPH_NUMBER: 1,
} ) );

import { getFirstRunGuideState } from './editor';

describe( 'getFirstRunGuideState', () => {
	test( 'uses the existing preflight issues for content and delivery progress', () => {
		expect(
			getFirstRunGuideState( {
				postStatus: 'draft',
				preflightIssues: [ 'empty_content', 'invalid_schedule_order' ],
				previewTargetId: 0,
			} )
		).toEqual( {
			isVisible: true,
			content: 'incomplete',
			delivery: 'incomplete',
			previewAndPublish: 'blocked',
			hasPreviewTarget: false,
		} );
	} );

	test( 'recognizes valid default delivery rules independently from empty content', () => {
		expect(
			getFirstRunGuideState( {
				postStatus: 'auto-draft',
				preflightIssues: [ 'empty_content' ],
				previewTargetId: 12,
			} )
		).toEqual( {
			isVisible: true,
			content: 'incomplete',
			delivery: 'complete',
			previewAndPublish: 'blocked',
			hasPreviewTarget: true,
		} );
	} );

	test( 'marks the final step ready only with valid content, rules, and a preview target', () => {
		expect(
			getFirstRunGuideState( {
				postStatus: 'draft',
				preflightIssues: [],
				previewTargetId: 12,
			} )
		).toEqual( {
			isVisible: true,
			content: 'complete',
			delivery: 'complete',
			previewAndPublish: 'ready',
			hasPreviewTarget: true,
		} );
	} );

	test( 'keeps preview and publish blocked until a real-page target exists', () => {
		expect(
			getFirstRunGuideState( {
				postStatus: 'pending',
				preflightIssues: [],
				previewTargetId: 0,
			} )
		).toMatchObject( {
			isVisible: true,
			content: 'complete',
			delivery: 'complete',
			previewAndPublish: 'blocked',
			hasPreviewTarget: false,
		} );
	} );

	test.each( [ 'publish', 'future' ] )(
		'hides the guide after the publish flow reaches %s',
		( postStatus ) => {
			expect(
				getFirstRunGuideState( {
					postStatus,
					preflightIssues: [],
					previewTargetId: 12,
				} ).isVisible
			).toBe( false );
		}
	);
} );
