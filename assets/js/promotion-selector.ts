export interface PromotionSelectorRecord {
	id: number;
}

export const PROMOTION_SELECTOR_PAGE_SIZE = 20;
export const PROMOTION_SELECTOR_SEARCH_DELAY = 300;

export interface PromotionSelectorState {
	filterInput: string;
	committedSearch: string;
	loadedPageCount: number;
}

export type PromotionSelectorAction =
	| {
			type: 'filter_change';
			value: string;
			ignoreFocusReset?: boolean;
	  }
	| { type: 'commit_search' }
	| { type: 'load_more' }
	| { type: 'reset_filter' };

export function createPromotionSelectorState(): PromotionSelectorState {
	return {
		filterInput: '',
		committedSearch: '',
		loadedPageCount: 1,
	};
}

export function promotionSelectorReducer(
	state: PromotionSelectorState,
	action: PromotionSelectorAction
): PromotionSelectorState {
	if ( action.type === 'filter_change' ) {
		if ( action.ignoreFocusReset && action.value === '' ) {
			return state;
		}

		return {
			...state,
			filterInput: action.value,
		};
	}

	if ( action.type === 'commit_search' ) {
		return {
			...state,
			committedSearch: normalizePromotionSearch( state.filterInput ),
			loadedPageCount: 1,
		};
	}

	if ( action.type === 'reset_filter' ) {
		return createPromotionSelectorState();
	}

	return {
		...state,
		loadedPageCount: state.loadedPageCount + 1,
	};
}

export type PromotionSelectionDecision = 'reject' | 'noop' | 'select';

export function decidePromotionSelection( {
	candidateId,
	currentId,
	filterInput,
	committedSearch,
	resolvedIds,
}: {
	candidateId: number;
	currentId: number;
	filterInput: string;
	committedSearch: string;
	resolvedIds: readonly number[];
} ): PromotionSelectionDecision {
	if ( candidateId === currentId ) {
		return 'noop';
	}

	if ( candidateId === 0 ) {
		return 'select';
	}

	if ( normalizePromotionSearch( filterInput ) !== committedSearch ) {
		return 'reject';
	}

	return resolvedIds.includes( candidateId ) ? 'select' : 'reject';
}

export function normalizePromotionSearch( value: string ): string {
	return value.trim().replace( /\s+/g, ' ' );
}

export function createPromotionSelectorQuery( search: string, page: number ) {
	const normalizedSearch = normalizePromotionSearch( search );

	return {
		context: 'edit',
		_fields: 'id,status,title,meta',
		order: 'asc',
		orderby: 'title',
		page: Math.max( 1, Math.trunc( page ) || 1 ),
		per_page: PROMOTION_SELECTOR_PAGE_SIZE,
		status: [ 'publish', 'draft', 'future', 'private' ],
		...( normalizedSearch
			? {
					search: normalizedSearch,
					search_columns: [ 'post_title' ],
			  }
			: {} ),
	};
}

export function mergePromotionRecords< T extends PromotionSelectorRecord >(
	selectedRecord: T | null | undefined,
	...pages: Array< readonly T[] | null | undefined >
): T[] {
	const records = new Map< number, T >();

	if ( selectedRecord ) {
		records.set( selectedRecord.id, selectedRecord );
	}

	for ( const page of pages ) {
		for ( const record of page ?? [] ) {
			if ( ! records.has( record.id ) ) {
				records.set( record.id, record );
			}
		}
	}

	return [ ...records.values() ];
}

export function promotionSelectorPageNumbers( pageCount: number ): number[] {
	return Array.from(
		{ length: Math.max( 1, Math.trunc( pageCount ) || 1 ) },
		( _, index ) => index + 1
	);
}
