import {
	createPromotionSelectorQuery,
	createPromotionSelectorState,
	decidePromotionSelection,
	mergePromotionRecords,
	normalizePromotionSearch,
	PROMOTION_SELECTOR_PAGE_SIZE,
	promotionSelectorReducer,
	promotionSelectorPageNumbers,
} from './promotion-selector';

describe( 'promotionSelectorReducer', () => {
	test( 'commits normalized search and atomically resets pagination', () => {
		expect(
			promotionSelectorReducer(
				{
					filterInput: '  new   offer ',
					committedSearch: 'old',
					loadedPageCount: 4,
				},
				{ type: 'commit_search' }
			)
		).toEqual( {
			filterInput: '  new   offer ',
			committedSearch: 'new offer',
			loadedPageCount: 1,
		} );
	} );

	test( 'loads one additional real page without changing the search', () => {
		expect(
			promotionSelectorReducer(
				{
					filterInput: 'summer',
					committedSearch: 'summer',
					loadedPageCount: 2,
				},
				{ type: 'load_more' }
			)
		).toEqual( {
			filterInput: 'summer',
			committedSearch: 'summer',
			loadedPageCount: 3,
		} );
	} );

	test( 'preserves a page-two search when WP 6.5 emits empty on focus', () => {
		const state = {
			filterInput: 'shared keyword',
			committedSearch: 'shared keyword',
			loadedPageCount: 2,
		};

		expect(
			promotionSelectorReducer( state, {
				type: 'filter_change',
				value: '',
				ignoreFocusReset: true,
			} )
		).toBe( state );
	} );

	test( 'allows an explicit empty input to clear search on commit', () => {
		const filtered = promotionSelectorReducer(
			{
				filterInput: 'summer',
				committedSearch: 'summer',
				loadedPageCount: 2,
			},
			{ type: 'filter_change', value: '' }
		);

		expect(
			promotionSelectorReducer( filtered, { type: 'commit_search' } )
		).toEqual( {
			filterInput: '',
			committedSearch: '',
			loadedPageCount: 1,
		} );
	} );

	test( 'starts from an unfiltered first page', () => {
		expect( createPromotionSelectorState() ).toEqual( {
			filterInput: '',
			committedSearch: '',
			loadedPageCount: 1,
		} );
	} );
} );

describe( 'decidePromotionSelection', () => {
	test( 'rejects an old suggestion while a new search is pending', () => {
		expect(
			decidePromotionSelection( {
				candidateId: 12,
				currentId: 0,
				filterInput: 'new search',
				committedSearch: 'old search',
				resolvedIds: [ 12 ],
			} )
		).toBe( 'reject' );
	} );

	test( 'rejects a candidate absent from the resolved current search', () => {
		expect(
			decidePromotionSelection( {
				candidateId: 12,
				currentId: 0,
				filterInput: 'current',
				committedSearch: 'current',
				resolvedIds: [ 13 ],
			} )
		).toBe( 'reject' );
	} );

	test( 'accepts a candidate from a resolved page-two search', () => {
		expect(
			decidePromotionSelection( {
				candidateId: 32,
				currentId: 0,
				filterInput: 'shared keyword',
				committedSearch: 'shared keyword',
				resolvedIds: [ 1, 32 ],
			} )
		).toBe( 'select' );
	} );

	test( 'allows an explicit reset while a search is pending', () => {
		expect(
			decidePromotionSelection( {
				candidateId: 0,
				currentId: 12,
				filterInput: 'pending',
				committedSearch: '',
				resolvedIds: [],
			} )
		).toBe( 'select' );
	} );

	test( 'makes reselecting the current value a true no-op', () => {
		expect(
			decidePromotionSelection( {
				candidateId: 12,
				currentId: 12,
				filterInput: 'pending',
				committedSearch: '',
				resolvedIds: [],
			} )
		).toBe( 'noop' );
	} );
} );

describe( 'normalizePromotionSearch', () => {
	test( 'trims and collapses whitespace before querying the server', () => {
		expect( normalizePromotionSearch( '  summer   offer  ' ) ).toBe(
			'summer offer'
		);
	} );
} );

describe( 'createPromotionSelectorQuery', () => {
	test( 'uses a stable title-ordered first page without an empty search', () => {
		expect( createPromotionSelectorQuery( '   ', 0 ) ).toEqual( {
			context: 'edit',
			_fields: 'id,status,title,meta',
			order: 'asc',
			orderby: 'title',
			page: 1,
			per_page: PROMOTION_SELECTOR_PAGE_SIZE,
			status: [ 'publish', 'draft', 'future', 'private' ],
		} );
	} );

	test( 'adds a title-only server search with stable title order', () => {
		expect( createPromotionSelectorQuery( '  summer  ', 3 ) ).toMatchObject(
			{
				order: 'asc',
				orderby: 'title',
				page: 3,
				per_page: 20,
				search: 'summer',
				search_columns: [ 'post_title' ],
			}
		);
	} );
} );

describe( 'mergePromotionRecords', () => {
	test( 'injects the independently resolved selection before result pages', () => {
		expect(
			mergePromotionRecords( { id: 120 }, [ { id: 1 }, { id: 2 } ] )
		).toEqual( [ { id: 120 }, { id: 1 }, { id: 2 } ] );
	} );

	test( 'deduplicates records across the selection and paged responses', () => {
		expect(
			mergePromotionRecords(
				{ id: 2, source: 'selected' },
				[ { id: 1 }, { id: 2, source: 'page' } ],
				[ { id: 2 }, { id: 3 } ]
			)
		).toEqual( [ { id: 2, source: 'selected' }, { id: 1 }, { id: 3 } ] );
	} );

	test( 'ignores unresolved pages while retaining resolved page order', () => {
		expect(
			mergePromotionRecords( null, [ { id: 1 } ], null, [ { id: 3 } ] )
		).toEqual( [ { id: 1 }, { id: 3 } ] );
	} );
} );

describe( 'promotionSelectorPageNumbers', () => {
	test( 'returns every requested page for one core-data selection', () => {
		expect( promotionSelectorPageNumbers( 3 ) ).toEqual( [ 1, 2, 3 ] );
	} );

	test( 'always requests at least the first page', () => {
		expect( promotionSelectorPageNumbers( 0 ) ).toEqual( [ 1 ] );
	} );
} );
