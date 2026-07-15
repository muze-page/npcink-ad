import {
	getEffectivePromotionTargetIds,
	getPotentiallyOverlappingPromotionIds,
	getPromotionPreflightIssues,
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
