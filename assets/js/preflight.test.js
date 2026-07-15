import {
	getBlockType,
	registerBlockType,
	unregisterBlockType,
} from '@wordpress/blocks';

import {
	effectiveParagraphNumber,
	getEffectivePromotionTargetIds,
	getPotentiallyOverlappingPromotionIds,
	getPromotionPreflightIssues,
	inspectParagraphAnchor,
} from './preflight';

/**
 * Build one complete automatic Promotion rule.
 *
 * @param {Object} overrides Rule values to replace.
 * @return {Object} Complete test rule.
 */
function promotionRule( overrides = {} ) {
	return {
		id: 1,
		location: 'content_after',
		pageScope: 'all',
		includeIds: [],
		excludeIds: [],
		device: 'all',
		paragraphNumber: 3,
		startAt: '',
		endAt: '',
		scheduleValid: true,
		...overrides,
	};
}

describe( 'getPotentiallyOverlappingPromotionIds', () => {
	test( 'mirrors automatic location, device, validity, and half-open schedule gates', () => {
		const candidate = promotionRule( {
			device: 'desktop',
			startAt: '2027-01-01 00:00:00',
			endAt: '2027-01-10 00:00:00',
		} );

		expect(
			getPotentiallyOverlappingPromotionIds( candidate, [
				promotionRule( { id: 2 } ),
				promotionRule( { id: 2 } ),
				promotionRule( { id: 3, location: 'content_before' } ),
				promotionRule( { id: 4, device: 'mobile' } ),
				promotionRule( {
					id: 5,
					startAt: '2027-01-10 00:00:00',
				} ),
				promotionRule( { id: 6, scheduleValid: false } ),
				promotionRule( { id: 1 } ),
			] )
		).toEqual( [ 2 ] );
	} );

	test( 'compares effective selected IDs after both exclusions', () => {
		const candidate = promotionRule( {
			pageScope: 'selected',
			includeIds: [ 10, 11 ],
			excludeIds: [ 11 ],
		} );

		expect(
			getPotentiallyOverlappingPromotionIds( candidate, [
				promotionRule( {
					id: 2,
					pageScope: 'selected',
					includeIds: [ 11, 12 ],
				} ),
				promotionRule( {
					id: 3,
					pageScope: 'selected',
					includeIds: [ 10 ],
				} ),
				promotionRule( { id: 4, excludeIds: [ 10 ] } ),
				promotionRule( { id: 5, excludeIds: [ 11 ] } ),
			] )
		).toEqual( [ 3, 5 ] );
	} );

	test( 'applies all-scope exclusions to the other selected rule', () => {
		const candidate = promotionRule( { excludeIds: [ 10 ] } );

		expect(
			getPotentiallyOverlappingPromotionIds( candidate, [
				promotionRule( {
					id: 2,
					pageScope: 'selected',
					includeIds: [ 10, 11 ],
					excludeIds: [ 11 ],
				} ),
				promotionRule( {
					id: 3,
					pageScope: 'selected',
					includeIds: [ 12 ],
				} ),
			] )
		).toEqual( [ 3 ] );
	} );

	test( 'never warns for manual block placement', () => {
		expect(
			getPotentiallyOverlappingPromotionIds(
				promotionRule( { location: 'block' } ),
				[ promotionRule( { id: 2 } ) ]
			)
		).toEqual( [] );
	} );

	test( 'paragraph placement overlaps only at the same valid effective anchor', () => {
		const candidate = promotionRule( {
			location: 'content_after_paragraph',
			paragraphNumber: 3,
		} );

		expect(
			getPotentiallyOverlappingPromotionIds( candidate, [
				promotionRule( {
					id: 2,
					location: 'content_after_paragraph',
					paragraphNumber: 3,
				} ),
				promotionRule( {
					id: 3,
					location: 'content_after_paragraph',
					paragraphNumber: 4,
				} ),
				promotionRule( {
					id: 4,
					location: 'content_after_paragraph',
					paragraphNumber: 0,
				} ),
				promotionRule( {
					id: 5,
					location: 'content_after_paragraph',
					paragraphNumber: undefined,
				} ),
				promotionRule( { id: 6 } ),
			] )
		).toEqual( [ 2, 5 ] );

		expect(
			getPotentiallyOverlappingPromotionIds(
				{ ...candidate, paragraphNumber: 21 },
				[
					promotionRule( {
						id: 2,
						location: 'content_after_paragraph',
						paragraphNumber: 21,
					} ),
				]
			)
		).toEqual( [] );
	} );
} );

describe( 'current Promotion target normalization', () => {
	test( 'invalid or custom-post-type IDs cannot satisfy preflight or overlap', () => {
		const effective = getEffectivePromotionTargetIds( [ 900 ], [], [] );

		expect(
			getPromotionPreflightIssues( {
				content: 'Creative',
				pageScope: 'selected',
				...effective,
			} )
		).toContain( 'selected_scope_without_targets' );
		expect(
			getPotentiallyOverlappingPromotionIds(
				promotionRule( {
					pageScope: 'selected',
					...effective,
				} ),
				[ promotionRule( { id: 2 } ) ]
			)
		).toEqual( [] );
	} );

	test( 'a confirmed public current ID can satisfy preflight and overlap', () => {
		const effective = getEffectivePromotionTargetIds(
			[ 10, 900 ],
			[],
			[ 10 ]
		);

		expect(
			getPromotionPreflightIssues( {
				content: 'Creative',
				pageScope: 'selected',
				...effective,
			} )
		).not.toContain( 'selected_scope_without_targets' );
		expect(
			getPotentiallyOverlappingPromotionIds(
				promotionRule( {
					pageScope: 'selected',
					...effective,
				} ),
				[
					promotionRule( {
						id: 2,
						pageScope: 'selected',
						includeIds: [ 10 ],
					} ),
				]
			)
		).toEqual( [ 2 ] );
	} );
} );

describe( 'paragraph placement preflight', () => {
	test.each( [ 0, 21, 2.5 ] )(
		'preserves explicit invalid value %s as an error',
		( paragraphNumber ) => {
			expect( effectiveParagraphNumber( paragraphNumber ) ).toBe(
				paragraphNumber
			);
			expect(
				getPromotionPreflightIssues( {
					content: 'Creative',
					location: 'content_after_paragraph',
					pageScope: 'all',
					includeIds: [],
					excludeIds: [],
					paragraphNumber,
				} )
			).toContain( 'invalid_paragraph_number' );
		}
	);

	test.each( [ undefined, 1, 20 ] )(
		'accepts bounded value %s and defaults only missing metadata',
		( paragraphNumber ) => {
			expect(
				getPromotionPreflightIssues( {
					content: 'Creative',
					location: 'content_after_paragraph',
					pageScope: 'all',
					includeIds: [],
					excludeIds: [],
					paragraphNumber,
				} )
			).not.toContain( 'invalid_paragraph_number' );
		}
	);

	test( 'does not apply paragraph validation to other placements', () => {
		expect(
			getPromotionPreflightIssues( {
				content: 'Creative',
				location: 'content_after',
				pageScope: 'all',
				includeIds: [],
				excludeIds: [],
				paragraphNumber: 0,
			} )
		).not.toContain( 'invalid_paragraph_number' );
	} );
} );

describe( 'inspectParagraphAnchor', () => {
	const registeredForTest = [];

	beforeAll( () => {
		for ( const [ name, title ] of [
			[ 'core/paragraph', 'Paragraph' ],
			[ 'core/group', 'Group' ],
		] ) {
			if ( ! getBlockType( name ) ) {
				registerBlockType( name, {
					apiVersion: 3,
					title,
					category: 'text',
					save: () => null,
				} );
				registeredForTest.push( name );
			}
		}
	} );

	afterAll( () => {
		for ( const name of registeredForTest ) {
			unregisterBlockType( name );
		}
	} );

	test( 'counts only top-level Gutenberg paragraph blocks', () => {
		const content = [
			'<!-- wp:paragraph /-->',
			'<!-- wp:group -->',
			'<!-- wp:paragraph /-->',
			'<!-- /wp:group -->',
			'<!-- wp:paragraph /-->',
		].join( '' );

		expect( inspectParagraphAnchor( content, 2 ) ).toEqual( {
			state: 'available',
			source: 'blocks',
			paragraphCount: 2,
		} );
		expect( inspectParagraphAnchor( content, 3 ) ).toEqual( {
			state: 'missing',
			source: 'blocks',
			paragraphCount: 2,
		} );
	} );

	test( 'counts actual paragraph elements in Classic HTML', () => {
		const content = '<p>One</p><section><p>Two</p></section>';

		expect( inspectParagraphAnchor( content, 2 ) ).toEqual( {
			state: 'available',
			source: 'html',
			paragraphCount: 2,
		} );
		expect( inspectParagraphAnchor( content, 3 ) ).toEqual( {
			state: 'missing',
			source: 'html',
			paragraphCount: 2,
		} );
	} );

	test.each( [
		[ 'separated plain text', '<p>One</p>\n\nTwo' ],
		[ 'adjacent plain text', '<p>One</p>Inline' ],
		[ 'an inline element', '<p>One</p><span>Two</span>' ],
	] )(
		'reports Classic content with %s as unavailable instead of false missing',
		( _description, content ) => {
			expect( inspectParagraphAnchor( content, 2 ) ).toEqual( {
				state: 'unavailable',
			} );
		}
	);

	test( 'keeps a verified Classic anchor available despite ambiguous trailing content', () => {
		const content = '<p>One</p><p>Two</p>\n\nThree';

		expect( inspectParagraphAnchor( content, 2 ) ).toEqual( {
			state: 'available',
			source: 'html',
			paragraphCount: 2,
		} );
	} );

	test( 'does not claim wpautop-dependent plain text has a missing anchor', () => {
		expect( inspectParagraphAnchor( 'One\n\nTwo', 3 ) ).toEqual( {
			state: 'unavailable',
		} );
	} );

	test( 'reports unregistered Gutenberg content as unavailable', () => {
		expect(
			inspectParagraphAnchor( '<!-- wp:unknown/widget /-->', 1 )
		).toEqual( { state: 'unavailable' } );
	} );
} );
