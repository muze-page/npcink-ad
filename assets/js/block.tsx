/* @jsxRuntime classic */

import * as React from 'react';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	registerBlockType,
	type BlockConfiguration,
	type BlockEditProps,
} from '@wordpress/blocks';
import {
	Button,
	ComboboxControl,
	Notice,
	PanelBody,
	Placeholder,
	RangeControl,
	Spinner,
	ToggleControl,
} from '@wordpress/components';
import { store as coreDataStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';

import metadata from '../blocks/npcink-ad-promotion/block.json';
import { getBlockPreviewMode } from './block-preview-state';
import {
	formatPromotionOptionLabel,
	type PromotionLocation,
} from './promotion-option';
import {
	createPromotionSelectorQuery,
	createPromotionSelectorState,
	decidePromotionSelection,
	mergePromotionRecords,
	normalizePromotionSearch,
	PROMOTION_SELECTOR_SEARCH_DELAY,
	promotionSelectorReducer,
	promotionSelectorPageNumbers,
} from './promotion-selector';
import { SelectionCard } from './selection-card';

type PromotionStatus = 'publish' | 'draft' | 'future' | 'private';

interface PromotionRecord {
	id: number;
	status: PromotionStatus;
	meta?: {
		_npcink_ad_location?: PromotionLocation;
	};
	title?:
		| string
		| {
				raw?: string;
				rendered?: string;
		  };
}

interface BlockAttributes {
	promotionId: number;
	reserveHeight: number;
	preview: boolean;
}

interface PromotionPageResolution {
	error: unknown;
	hasFinished: boolean;
	isResolving: boolean;
	records: PromotionRecord[] | null;
}

interface ResolutionSelectors {
	getResolutionError: (
		selectorName: string,
		args?: readonly unknown[]
	) => unknown;
	hasFinishedResolution: (
		selectorName: string,
		args?: readonly unknown[]
	) => boolean;
	isResolving: ( selectorName: string, args?: readonly unknown[] ) => boolean;
}

interface ResolutionActions {
	invalidateResolution: (
		selectorName: string,
		args?: readonly unknown[]
	) => void;
}

const selectedPromotionQuery = {
	context: 'edit',
	_fields: 'id,status,title,meta',
} as const;

function getPromotionTitle( promotion: PromotionRecord ): string {
	const { title } = promotion;
	const savedTitle =
		typeof title === 'string' ? title : title?.raw || title?.rendered || '';
	const displayTitle =
		savedTitle.trim() ||
		/* translators: Fallback title for a Promotion that has no title. */ __(
			'Untitled promotion',
			'npcink-ad'
		);

	return sprintf(
		/* translators: 1: Promotion title, 2: Promotion ID. */
		__( '%1$s (#%2$d)', 'npcink-ad' ),
		displayTitle,
		promotion.id
	);
}

function getPromotionOptionLabel( promotion: PromotionRecord ): string {
	const promotionTitle = getPromotionTitle( promotion );
	const publicationLabel =
		promotion.status === 'publish'
			? promotionTitle
			: sprintf(
					/* translators: %s: Promotion title followed by its ID. */
					__( '%s (Not published)', 'npcink-ad' ),
					promotionTitle
			  );

	return formatPromotionOptionLabel(
		publicationLabel,
		promotion.meta?._npcink_ad_location,
		/* translators: Marker appended to a Promotion option whose placement is not Manual block. */ __(
			'(Not configured for Manual block)',
			'npcink-ad'
		)
	);
}

function Edit( {
	attributes,
	setAttributes,
}: BlockEditProps< BlockAttributes > ) {
	const selectedPromotionId = attributes.promotionId;
	const ignoreNextFocusReset = React.useRef( false );
	const [ comboboxResetKey, setComboboxResetKey ] = React.useState( 0 );
	const [ selectorState, dispatchSelectorState ] = React.useReducer(
		promotionSelectorReducer,
		undefined,
		createPromotionSelectorState
	);
	const { filterInput, committedSearch, loadedPageCount } = selectorState;
	const normalizedFilterInput = normalizePromotionSearch( filterInput );
	const isSearchPending = normalizedFilterInput !== committedSearch;

	React.useEffect( () => {
		const timer = window.setTimeout( () => {
			dispatchSelectorState( { type: 'commit_search' } );
		}, PROMOTION_SELECTOR_SEARCH_DELAY );

		return () => window.clearTimeout( timer );
	}, [ filterInput ] );

	const promotionQueries = React.useMemo(
		() =>
			promotionSelectorPageNumbers( loadedPageCount ).map( ( page ) =>
				createPromotionSelectorQuery( committedSearch, page )
			),
		[ committedSearch, loadedPageCount ]
	);
	const selectedResolutionArgs = React.useMemo(
		() =>
			[
				'postType',
				'npcink_promotion',
				selectedPromotionId,
				selectedPromotionQuery,
			] as const,
		[ selectedPromotionId ]
	);

	const { pages, selectedPromotion, selectedResolution, totalPages } =
		useSelect(
			( select ) => {
				const coreData = select( coreDataStore );
				const resolution = coreData as unknown as ResolutionSelectors;
				const resolvedPages: PromotionPageResolution[] =
					promotionQueries.map( ( query ) => {
						const resolutionArgs = [
							'postType',
							'npcink_promotion',
							query,
						] as const;

						return {
							error: resolution.getResolutionError(
								'getEntityRecords',
								resolutionArgs
							),
							hasFinished: resolution.hasFinishedResolution(
								'getEntityRecords',
								resolutionArgs
							),
							isResolving: resolution.isResolving(
								'getEntityRecords',
								resolutionArgs
							),
							records: coreData.getEntityRecords(
								...resolutionArgs
							) as PromotionRecord[] | null,
						};
					} );

				const selected =
					selectedPromotionId > 0
						? ( coreData.getEntityRecord(
								...selectedResolutionArgs
						  ) as PromotionRecord | null )
						: null;
				const selectedState =
					selectedPromotionId > 0
						? {
								error: resolution.getResolutionError(
									'getEntityRecord',
									selectedResolutionArgs
								),
								hasFinished: resolution.hasFinishedResolution(
									'getEntityRecord',
									selectedResolutionArgs
								),
								isResolving: resolution.isResolving(
									'getEntityRecord',
									selectedResolutionArgs
								),
						  }
						: null;

				return {
					pages: resolvedPages,
					selectedPromotion: selected,
					selectedResolution: selectedState,
					totalPages: Number(
						coreData.getEntityRecordsTotalPages(
							'postType',
							'npcink_promotion',
							promotionQueries[ 0 ]
						) ?? 0
					),
				};
			},
			[ promotionQueries, selectedPromotionId, selectedResolutionArgs ]
		);
	const { invalidateResolution } = useDispatch(
		coreDataStore
	) as unknown as ResolutionActions;

	const pagedPromotions = mergePromotionRecords(
		null,
		...pages.map( ( page ) => page.records )
	).filter( ( promotion ) => promotion.id !== selectedPromotionId );
	const promotions = mergePromotionRecords(
		null,
		isSearchPending ? [] : pagedPromotions
	);
	const selectedIsLoading = Boolean(
		selectedPromotionId > 0 &&
			! selectedPromotion &&
			! selectedResolution?.error &&
			( selectedResolution?.isResolving ||
				! selectedResolution?.hasFinished )
	);
	const selectedFallbackLabel = selectedIsLoading
		? sprintf(
				/* translators: %d: Promotion ID. */
				__( 'Promotion #%d (Loading details…)', 'npcink-ad' ),
				selectedPromotionId
		  )
		: sprintf(
				/* translators: %d: Promotion ID. */
				__( 'Promotion #%d (Details unavailable)', 'npcink-ad' ),
				selectedPromotionId
		  );
	const promotionOptions = promotions.map( ( promotion ) => ( {
		label: getPromotionOptionLabel( promotion ),
		value: String( promotion.id ),
	} ) );

	if ( selectedPromotionId > 0 && ! selectedPromotion ) {
		promotionOptions.unshift( {
			label: selectedFallbackLabel,
			value: String( selectedPromotionId ),
		} );
	}

	const selectedOptionLabel = selectedPromotion
		? getPromotionOptionLabel( selectedPromotion )
		: selectedFallbackLabel;
	const firstPage = pages[ 0 ];
	const pageError = pages.find( ( page ) => page.error );
	const isPageLoading =
		isSearchPending ||
		pages.some(
			( page ) =>
				page.isResolving ||
				( ! page.hasFinished && ! page.error && page.records === null )
		);
	const hasNoResults = Boolean(
		! isSearchPending &&
			firstPage?.hasFinished &&
			! firstPage.error &&
			firstPage.records?.length === 0
	);
	const canLoadMore = Boolean(
		! isSearchPending &&
			! isPageLoading &&
			! pageError &&
			totalPages > loadedPageCount
	);
	const handlePromotionFilterChange = ( value: string ) => {
		const ignoreFocusReset = ignoreNextFocusReset.current && value === '';
		ignoreNextFocusReset.current = false;
		dispatchSelectorState( {
			type: 'filter_change',
			value,
			ignoreFocusReset,
		} );
	};
	const handlePromotionChange = ( value: string | null | undefined ) => {
		const candidateId = Number.parseInt( value || '', 10 ) || 0;
		const decision = decidePromotionSelection( {
			candidateId,
			currentId: selectedPromotionId,
			filterInput,
			committedSearch,
			resolvedIds: pagedPromotions.map( ( promotion ) => promotion.id ),
		} );

		if ( decision !== 'select' ) {
			return;
		}

		setAttributes( { promotionId: candidateId } );
		dispatchSelectorState( { type: 'reset_filter' } );
		setComboboxResetKey( ( key ) => key + 1 );
	};
	const clearPromotionSearch = () => {
		dispatchSelectorState( { type: 'reset_filter' } );
		setComboboxResetKey( ( key ) => key + 1 );
	};
	const retryPromotionPages = () => {
		pages.forEach( ( page, index ) => {
			if ( page.error ) {
				invalidateResolution( 'getEntityRecords', [
					'postType',
					'npcink_promotion',
					promotionQueries[ index ],
				] );
			}
		} );
	};
	const retrySelectedPromotion = () => {
		invalidateResolution( 'getEntityRecord', selectedResolutionArgs );
	};

	const blockProps = useBlockProps( {
		className: 'npcink-ad-block-editor',
	} );
	const previewMode = getBlockPreviewMode(
		attributes.promotionId,
		attributes.preview
	);

	const noSelectionPlaceholder = (
		<Placeholder
			className="npcink-ad-block-editor__placeholder"
			icon="megaphone"
			label={ __( 'Npcink Ad promotion', 'npcink-ad' ) }
			instructions={
				/* translators: Guidance shown before a Promotion is selected for the block. */ __(
					'Select a saved Promotion configured for Manual block in Promotion settings.',
					'npcink-ad'
				)
			}
		/>
	);
	const previewDisabledPlaceholder = (
		<Placeholder
			className="npcink-ad-block-editor__placeholder"
			icon="megaphone"
			label={ __( 'Npcink Ad promotion', 'npcink-ad' ) }
			instructions={
				/* translators: Guidance shown when a selected block has its editor preview turned off. */ __(
					'Editor preview is off. This block still controls the live position, and the selected Promotion renders here only when its rules allow.',
					'npcink-ad'
				)
			}
		/>
	);
	const emptyPreviewPlaceholder = (
		<Placeholder
			className="npcink-ad-block-editor__placeholder"
			icon="megaphone"
			label={
				/* translators: Editor placeholder title for an empty server-side Promotion preview. */ __(
					'No preview content',
					'npcink-ad'
				)
			}
			instructions={
				/* translators: Guidance shown when a selected Promotion returns an empty editor preview. */ __(
					'No editor preview content was returned for the selected Promotion. Confirm that it is saved, still available, and configured for Manual block, then try again.',
					'npcink-ad'
				)
			}
		/>
	);
	const inactivePreviewPlaceholder =
		previewMode === 'no-selection'
			? noSelectionPlaceholder
			: previewDisabledPlaceholder;

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Promotion settings', 'npcink-ad' ) }
					initialOpen
				>
					{ selectedPromotionId > 0 && (
						<SelectionCard
							label={ __( 'Current Promotion', 'npcink-ad' ) }
							value={ selectedOptionLabel }
							isLoading={ selectedIsLoading }
							clearText={ __( 'Clear', 'npcink-ad' ) }
							clearLabel={ __(
								'Clear current Promotion',
								'npcink-ad'
							) }
							onClear={ () => handlePromotionChange( null ) }
							testId="npcink-ad-selected-promotion"
						/>
					) }
					<div
						onFocusCapture={ () => {
							ignoreNextFocusReset.current = true;
						} }
					>
						<ComboboxControl
							key={ comboboxResetKey }
							__next40pxDefaultSize
							label={
								selectedPromotionId > 0
									? __(
											'Search and replace Promotion',
											'npcink-ad'
									  )
									: __( 'Choose Promotion', 'npcink-ad' )
							}
							value={ null }
							options={ promotionOptions }
							allowReset={ false }
							placeholder={ __(
								'Search saved Promotions',
								'npcink-ad'
							) }
							onFilterValueChange={ handlePromotionFilterChange }
							onChange={ handlePromotionChange }
							help={
								/* translators: Explains the contract and server search of the Promotion selected by a manual block. */ __(
									'Choose or search for a saved Promotion configured for Manual block. This block controls the live position; the Promotion rules decide whether it displays.',
									'npcink-ad'
								)
							}
						/>
					</div>
					{ committedSearch && ! isSearchPending && (
						<div className="npcink-ad-promotion-selector__status">
							<span>
								{ sprintf(
									/* translators: %s: Current Promotion title search. */
									__(
										'Showing results for “%s”.',
										'npcink-ad'
									),
									committedSearch
								) }
							</span>
							<Button
								variant="tertiary"
								onClick={ clearPromotionSearch }
							>
								{ __( 'Clear promotion search', 'npcink-ad' ) }
							</Button>
						</div>
					) }
					{ Boolean( selectedResolution?.error ) && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'The selected Promotion details are unavailable. The saved selection has been retained.',
								'npcink-ad'
							) }
							<Button
								variant="secondary"
								onClick={ retrySelectedPromotion }
							>
								{ __(
									'Retry selected promotion',
									'npcink-ad'
								) }
							</Button>
						</Notice>
					) }
					{ isPageLoading && (
						<div
							className="npcink-ad-promotion-selector__status"
							role="status"
							aria-live="polite"
						>
							<Spinner />
							<span>
								{ __( 'Loading promotions…', 'npcink-ad' ) }
							</span>
						</div>
					) }
					{ ! isSearchPending && pageError && (
						<Notice status="error" isDismissible={ false }>
							{ __(
								'Promotions could not be loaded. The current selection has not been changed.',
								'npcink-ad'
							) }
							<Button
								variant="secondary"
								onClick={ retryPromotionPages }
							>
								{ __(
									'Retry loading promotions',
									'npcink-ad'
								) }
							</Button>
						</Notice>
					) }
					{ hasNoResults && (
						<p className="npcink-ad-promotion-selector__empty">
							{ committedSearch
								? __(
										'No matching Promotions were found.',
										'npcink-ad'
								  )
								: __(
										'No Promotions are available.',
										'npcink-ad'
								  ) }
						</p>
					) }
					{ canLoadMore && (
						<Button
							variant="secondary"
							onClick={ () =>
								dispatchSelectorState( { type: 'load_more' } )
							}
						>
							{ __( 'Load more promotions', 'npcink-ad' ) }
						</Button>
					) }
					<RangeControl
						__next40pxDefaultSize
						label={ __( 'Reserved height', 'npcink-ad' ) }
						help={ __(
							'Reserve vertical space to reduce layout shift.',
							'npcink-ad'
						) }
						min={ 0 }
						max={ 600 }
						value={ attributes.reserveHeight }
						onChange={ ( value ) =>
							setAttributes( { reserveHeight: value ?? 0 } )
						}
					/>
					<ToggleControl
						label={ __( 'Show live preview', 'npcink-ad' ) }
						checked={ attributes.preview }
						onChange={ ( preview ) => setAttributes( { preview } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				{ previewMode === 'server-side-render' ? (
					<ServerSideRender
						block="npcink-ad/promotion"
						attributes={ attributes }
						LoadingResponsePlaceholder={ () => (
							<Placeholder
								className="npcink-ad-block-editor__placeholder"
								icon="megaphone"
								label={ __( 'Loading preview…', 'npcink-ad' ) }
							/>
						) }
						EmptyResponsePlaceholder={ () =>
							emptyPreviewPlaceholder
						}
						ErrorResponsePlaceholder={ () => (
							<Placeholder
								className="npcink-ad-block-editor__placeholder"
								icon="warning"
								label={
									/* translators: Editor placeholder title for a failed server-side preview request. */ __(
										'Preview request failed',
										'npcink-ad'
									)
								}
								instructions={
									/* translators: Retry guidance for a failed server-side preview request. */ __(
										'The editor could not load the preview. Try again.',
										'npcink-ad'
									)
								}
							/>
						) }
					/>
				) : (
					inactivePreviewPlaceholder
				) }
			</div>
		</>
	);
}

registerBlockType< BlockAttributes >(
	metadata as BlockConfiguration< BlockAttributes >,
	{
		edit: Edit,
		save: () => null,
	}
);
