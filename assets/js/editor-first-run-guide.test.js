jest.mock( '@wordpress/components', () => ( {
	Button: () => null,
	ComboboxControl: () => null,
	Modal: () => null,
	Notice: () => null,
	SelectControl: () => null,
	Spinner: () => null,
	TabPanel: () => null,
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

import {
	buildContentPickerQuery,
	combineScheduleDateTime,
	getFirstRunGuideState,
	isRecordsRequestLoading,
	splitScheduleDateTime,
} from './editor';

describe( 'content picker queries', () => {
	test( 'keeps the default candidate search free of taxonomy filters', () => {
		expect( buildContentPickerQuery( '' ) ).toMatchObject( {
			orderby: 'date',
			search: undefined,
			status: 'publish',
			categories: undefined,
			tags: undefined,
		} );
	} );

	test( 'adds category and tag filters only to the post candidate query', () => {
		expect(
			buildContentPickerQuery( 'summer', [ 12, 14 ], [ 21 ] )
		).toMatchObject( {
			orderby: 'relevance',
			search: 'summer',
			categories: [ 12, 14 ],
			tags: [ 21 ],
		} );
	} );
} );

describe( 'schedule date and time values', () => {
	test( 'splits stored WordPress-local values into minute-precision controls', () => {
		expect( splitScheduleDateTime( '2026-07-23 19:14:00' ) ).toEqual( {
			date: '2026-07-23',
			time: '19:14',
		} );
		expect( splitScheduleDateTime( '2026-07-23T19:14' ) ).toEqual( {
			date: '2026-07-23',
			time: '19:14',
		} );
	} );

	test( 'keeps empty values out of both controls', () => {
		expect( splitScheduleDateTime( undefined ) ).toEqual( {
			date: '',
			time: '',
		} );
	} );

	test( 'combines date and time without changing the stored schema', () => {
		expect( combineScheduleDateTime( '2026-07-23', '19:14' ) ).toBe(
			'2026-07-23 19:14:00'
		);
		expect( combineScheduleDateTime( '2026-07-23', '' ) ).toBe(
			'2026-07-23 00:00:00'
		);
		expect( combineScheduleDateTime( '', '19:14' ) ).toBe( '' );
	} );
} );

describe( 'isRecordsRequestLoading', () => {
	test( 'keeps unresolved and active requests in loading state', () => {
		expect( isRecordsRequestLoading( null, null, false, false ) ).toBe(
			true
		);
		expect( isRecordsRequestLoading( null, null, false, true ) ).toBe(
			true
		);
	} );

	test( 'stops loading after a failure or completed resolution', () => {
		expect(
			isRecordsRequestLoading(
				null,
				new Error( 'request failed' ),
				true,
				false
			)
		).toBe( false );
		expect( isRecordsRequestLoading( null, null, true, false ) ).toBe(
			false
		);
	} );
} );

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

	test( 'treats a source-less video as incomplete content, not a delivery-rule failure', () => {
		expect(
			getFirstRunGuideState( {
				postStatus: 'draft',
				preflightIssues: [ 'video_source_missing' ],
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

	test( 'keeps delivery incomplete when selected terms are unavailable', () => {
		expect(
			getFirstRunGuideState( {
				postStatus: 'draft',
				preflightIssues: [],
				previewTargetId: 12,
				deliveryNeedsAttention: true,
			} )
		).toMatchObject( {
			delivery: 'incomplete',
			previewAndPublish: 'blocked',
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
