/* @jsxRuntime classic */

import * as React from 'react';
import {
	Button,
	ComboboxControl,
	Notice,
	PanelBody,
	SelectControl,
	Spinner,
	TextControl,
} from '@wordpress/components';
import { store as coreDataStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	PluginDocumentSettingPanel as LegacyPluginDocumentSettingPanel,
	PluginPrePublishPanel as LegacyPluginPrePublishPanel,
} from '@wordpress/edit-post';
import {
	PluginDocumentSettingPanel as CurrentPluginDocumentSettingPanel,
	PluginPrePublishPanel as CurrentPluginPrePublishPanel,
	store as editorStore,
} from '@wordpress/editor';
import { __, _n, sprintf } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

import {
	contentContainsPromotionBlock,
	contentScopeForPlacement,
	effectiveParagraphNumber,
	getEffectivePromotionTermSelection,
	getEffectivePromotionTargetIds,
	getPotentiallyOverlappingPromotionIds,
	getPromotionPreflightIssues,
	inspectParagraphAnchor,
	isValidParagraphNumber,
	MAX_PARAGRAPH_NUMBER,
	MIN_PARAGRAPH_NUMBER,
	type PromotionContentScope,
	type PromotionLocation,
	type PromotionPreflightIssueCode,
} from './preflight';
import {
	advancePublishStatusRecovery,
	createPublishStatusRecoveryState,
} from './publish-status-recovery';
import { selectEditorSlotFill } from './editor-slotfill-compat';

const PluginDocumentSettingPanel = selectEditorSlotFill(
	CurrentPluginDocumentSettingPanel,
	LegacyPluginDocumentSettingPanel
);
const PluginPrePublishPanel = selectEditorSlotFill(
	CurrentPluginPrePublishPanel,
	LegacyPluginPrePublishPanel
);

interface PromotionMeta {
	_npcink_ad_location?: PromotionLocation;
	_npcink_ad_content_scope?: PromotionContentScope;
	_npcink_ad_include_ids?: number[];
	_npcink_ad_exclude_ids?: number[];
	_npcink_ad_category_ids?: number[];
	_npcink_ad_tag_ids?: number[];
	_npcink_ad_device?: 'all' | 'desktop' | 'mobile';
	_npcink_ad_paragraph_number?: number;
	_npcink_ad_start_at?: string;
	_npcink_ad_end_at?: string;
}

interface ContentRecord {
	id: number;
	content?: {
		raw?: string;
	};
	status?: string;
	type?: string;
	title?:
		| string
		| {
				raw?: string;
				rendered?: string;
		  };
}

interface ContentOption {
	label: string;
	value: string;
}

interface TermRecord {
	id: number;
	name: string;
}

interface SiteBaseRecord {
	gmt_offset?: number | string;
	timezone_string?: string;
}

interface ResolutionSelectors {
	hasFinishedResolution: (
		selectorName: string,
		args?: readonly unknown[]
	) => boolean;
}

type ManualBlockInspectionState =
	| 'not_applicable'
	| 'no_target'
	| 'loading'
	| 'found'
	| 'missing'
	| 'unavailable';

type ParagraphAnchorNoticeState =
	| {
			state:
				| 'not_applicable'
				| 'no_target'
				| 'loading'
				| 'invalid_number'
				| 'unavailable';
	  }
	| {
			state: 'available' | 'missing';
			source: 'blocks' | 'html';
			paragraphCount: number;
			paragraphNumber: number;
	  };

const editContextQuery = { context: 'edit' } as const;

function recordTitle( record: ContentRecord ): string {
	if ( typeof record.title === 'string' ) {
		return record.title;
	}

	return record.title?.raw || record.title?.rendered || `#${ record.id }`;
}

function normalizeIds( value: unknown ): number[] {
	if ( ! Array.isArray( value ) ) {
		return [];
	}

	return [
		...new Set(
			value
				.map( ( item ) => Number.parseInt( String( item ), 10 ) )
				.filter( ( item ) => Number.isInteger( item ) && item > 0 )
		),
	].slice( 0, 50 );
}

function toInputDate( value: string | undefined ): string {
	return value ? value.replace( ' ', 'T' ).slice( 0, 16 ) : '';
}

function fromInputDate( value: string ): string {
	if ( ! value ) {
		return '';
	}

	const normalized = value.replace( 'T', ' ' );
	return normalized.length === 16 ? `${ normalized }:00` : normalized;
}

function siteTimezoneLabel( site: SiteBaseRecord | null ): string {
	if ( site?.timezone_string?.trim() ) {
		return site.timezone_string.trim();
	}

	const offset = Number( site?.gmt_offset );
	if ( Number.isFinite( offset ) ) {
		const absoluteMinutes = Math.round( Math.abs( offset ) * 60 );
		const hours = String( Math.floor( absoluteMinutes / 60 ) ).padStart(
			2,
			'0'
		);
		const minutes = String( absoluteMinutes % 60 ).padStart( 2, '0' );
		const sign = offset >= 0 ? '+' : '-';

		return `UTC${ sign }${ hours }:${ minutes }`;
	}

	return __( 'configured in WordPress', 'npcink-ad' );
}

function preflightIssueMessage( issue: PromotionPreflightIssueCode ): string {
	switch ( issue ) {
		case 'empty_content':
			return __(
				'Add promotion content before publishing.',
				'npcink-ad'
			);
		case 'selected_scope_without_targets':
			return __(
				'Add at least one valid included post or page that is not also excluded when Content scope is set to Only selected content.',
				'npcink-ad'
			);
		case 'terms_scope_without_terms':
			return __(
				'Choose at least one available category or tag when Content scope is set to Posts in selected categories or tags.',
				'npcink-ad'
			);
		case 'invalid_schedule_order':
			return __(
				'Stop showing must be later than Start showing.',
				'npcink-ad'
			);
		case 'invalid_paragraph_number':
			return sprintf(
				/* translators: 1: minimum paragraph number, 2: maximum paragraph number. */
				__(
					'Paragraph number must be a whole number from %1$d to %2$d.',
					'npcink-ad'
				),
				MIN_PARAGRAPH_NUMBER,
				MAX_PARAGRAPH_NUMBER
			);
	}
}

function ManualBlockInspectionNotice( {
	state,
}: {
	state: ManualBlockInspectionState;
} ) {
	switch ( state ) {
		case 'not_applicable':
			return null;
		case 'no_target':
			return (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'Choose a published page or post in Real-page preview before checking manual block placement.',
						'npcink-ad'
					) }
				</Notice>
			);
		case 'loading': {
			const spokenMessage = __(
				'Checking the selected page body for a matching promotion block…',
				'npcink-ad'
			);

			return (
				<Notice
					status="info"
					isDismissible={ false }
					spokenMessage={ spokenMessage }
				>
					<Spinner />
					{ spokenMessage }
				</Notice>
			);
		}
		case 'found':
			return (
				<Notice status="success" isDismissible={ false }>
					{ __(
						'A matching promotion block was found in the selected page body.',
						'npcink-ad'
					) }
				</Notice>
			);
		case 'missing':
			return (
				<Notice status="warning" isDismissible={ false }>
					{
						/* translators: [npcink_ad promotion="ID"] is an example shortcode and must not be translated. */ __(
							'This promotion block was not found in the selected page body. A template, synced pattern, or [npcink_ad promotion="ID"] shortcode may still provide the manual insertion, so verify the result with the real-page preview.',
							'npcink-ad'
						)
					}
				</Notice>
			);
		case 'unavailable':
			return (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'The selected page body could not be inspected from the editor data. This does not mean the block is missing; verify with the real-page preview.',
						'npcink-ad'
					) }
				</Notice>
			);
	}
}

function ParagraphAnchorNotice( {
	inspection,
}: {
	inspection: ParagraphAnchorNoticeState;
} ) {
	switch ( inspection.state ) {
		case 'not_applicable':
			return null;
		case 'no_target':
			return (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'Choose a published page or post in Real-page preview before checking the paragraph anchor.',
						'npcink-ad'
					) }
				</Notice>
			);
		case 'loading': {
			const spokenMessage = __(
				'Checking the selected page body for the paragraph anchor…',
				'npcink-ad'
			);

			return (
				<Notice
					status="info"
					isDismissible={ false }
					spokenMessage={ spokenMessage }
				>
					<Spinner />
					{ spokenMessage }
				</Notice>
			);
		}
		case 'invalid_number':
			return (
				<Notice status="warning" isDismissible={ false }>
					{ sprintf(
						/* translators: 1: minimum paragraph number, 2: maximum paragraph number. */
						__(
							'Enter a whole paragraph number from %1$d to %2$d before checking this anchor.',
							'npcink-ad'
						),
						MIN_PARAGRAPH_NUMBER,
						MAX_PARAGRAPH_NUMBER
					) }
				</Notice>
			);
		case 'available': {
			const message =
				inspection.source === 'blocks'
					? /* translators: 1: paragraph count, 2: requested paragraph number. */
					  __(
							'The saved page body has %1$d top-level paragraph blocks, so the anchor after paragraph %2$d is available.',
							'npcink-ad'
					  )
					: /* translators: 1: paragraph count, 2: requested paragraph number. */
					  __(
							'The saved Classic page body has %1$d actual paragraph elements, so the anchor after paragraph %2$d is available.',
							'npcink-ad'
					  );

			return (
				<Notice status="success" isDismissible={ false }>
					{ sprintf(
						message,
						inspection.paragraphCount,
						inspection.paragraphNumber
					) }
				</Notice>
			);
		}
		case 'missing': {
			const message =
				inspection.source === 'blocks'
					? /* translators: 1: paragraph count, 2: requested paragraph number. */
					  __(
							'The saved page body has only %1$d top-level paragraph blocks, so the anchor after paragraph %2$d was not found.',
							'npcink-ad'
					  )
					: /* translators: 1: paragraph count, 2: requested paragraph number. */
					  __(
							'The saved Classic page body has only %1$d actual paragraph elements, so the anchor after paragraph %2$d was not found.',
							'npcink-ad'
					  );

			return (
				<Notice status="warning" isDismissible={ false }>
					{ sprintf(
						message,
						inspection.paragraphCount,
						inspection.paragraphNumber
					) }{ ' ' }
					{ __(
						'This anchor check is advisory and does not block publishing.',
						'npcink-ad'
					) }
				</Notice>
			);
		}
		case 'unavailable':
			return (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'The selected page body could not be inspected reliably for this paragraph anchor. This does not prove the anchor is missing; verify the result with the real-page preview.',
						'npcink-ad'
					) }
				</Notice>
			);
	}
}

function ContentPicker( {
	label,
	help,
	selectedIds,
	onAdd,
	onRemove,
}: {
	label: string;
	help: string;
	selectedIds: number[];
	onAdd: ( id: number ) => void;
	onRemove: ( id: number ) => void;
} ) {
	const [ filter, setFilter ] = React.useState( '' );
	const query = React.useMemo(
		() => ( {
			context: 'edit',
			order: 'desc',
			orderby: filter ? 'relevance' : 'date',
			per_page: 20,
			search: filter || undefined,
			status: 'publish',
		} ),
		[ filter ]
	);

	const records = useSelect(
		( select ) => {
			const posts = select( coreDataStore ).getEntityRecords(
				'postType',
				'post',
				query
			) as ContentRecord[] | null;
			const pages = select( coreDataStore ).getEntityRecords(
				'postType',
				'page',
				query
			) as ContentRecord[] | null;

			if ( posts === null || pages === null ) {
				return null;
			}

			return [
				...pages.map( ( page ) => ( { ...page, type: 'page' } ) ),
				...posts.map( ( post ) => ( { ...post, type: 'post' } ) ),
			];
		},
		[ query ]
	);

	const options: ContentOption[] = ( records ?? [] )
		.filter( ( record ) => ! selectedIds.includes( record.id ) )
		.map( ( record ) => ( {
			label: sprintf(
				/* translators: 1: content title, 2: content type. */
				__( '%1$s — %2$s', 'npcink-ad' ),
				recordTitle( record ),
				record.type === 'page'
					? __( 'Page', 'npcink-ad' )
					: __( 'Post', 'npcink-ad' )
			),
			value: String( record.id ),
		} ) );

	const labels = new Map(
		( records ?? [] ).map( ( record ) => [
			record.id,
			recordTitle( record ),
		] )
	);

	return (
		<div className="npcink-ad-content-picker">
			<ComboboxControl
				__next40pxDefaultSize
				label={ label }
				help={ help }
				value={ null }
				options={ options }
				isLoading={ records === null }
				onFilterValueChange={ setFilter }
				onChange={ ( value ) => {
					const id = Number.parseInt( value || '', 10 );
					if ( id > 0 ) {
						onAdd( id );
						setFilter( '' );
					}
				} }
			/>
			{ records === null && <Spinner /> }
			{ selectedIds.length > 0 && (
				<ul className="npcink-ad-content-picker__selected">
					{ selectedIds.map( ( id ) => (
						<li key={ id }>
							<span>{ labels.get( id ) || `#${ id }` }</span>
							<Button
								variant="tertiary"
								isDestructive
								onClick={ () => onRemove( id ) }
								aria-label={ sprintf(
									/* translators: %s: content title. */
									__( 'Remove %s', 'npcink-ad' ),
									labels.get( id ) || `#${ id }`
								) }
							>
								{ __( 'Remove', 'npcink-ad' ) }
							</Button>
						</li>
					) ) }
				</ul>
			) }
		</div>
	);
}

function TermPicker( {
	taxonomy,
	label,
	help,
	selectedIds,
	onAdd,
	onRemove,
}: {
	taxonomy: 'category' | 'post_tag';
	label: string;
	help: string;
	selectedIds: number[];
	onAdd: ( id: number ) => void;
	onRemove: ( id: number ) => void;
} ) {
	const [ filter, setFilter ] = React.useState( '' );
	const searchQuery = React.useMemo(
		() => ( {
			context: 'view',
			hide_empty: false,
			order: 'asc',
			orderby: 'name',
			per_page: 20,
			search: filter || undefined,
			_fields: 'id,name',
		} ),
		[ filter ]
	);
	const selectedQuery = React.useMemo(
		() => ( {
			context: 'view',
			hide_empty: false,
			include: selectedIds,
			orderby: 'include',
			per_page: Math.max( selectedIds.length, 1 ),
			_fields: 'id,name',
		} ),
		[ selectedIds ]
	);

	const { searchRecords, selectedRecords } = useSelect(
		( select ) => {
			const coreData = select( coreDataStore );
			return {
				searchRecords: coreData.getEntityRecords(
					'taxonomy',
					taxonomy,
					searchQuery
				) as TermRecord[] | null,
				selectedRecords:
					selectedIds.length === 0
						? []
						: ( coreData.getEntityRecords(
								'taxonomy',
								taxonomy,
								selectedQuery
						  ) as TermRecord[] | null ),
			};
		},
		[ taxonomy, searchQuery, selectedQuery, selectedIds.length ]
	);

	const records = [
		...( selectedRecords ?? [] ),
		...( searchRecords ?? [] ),
	];
	const labels = new Map(
		records.map( ( record ) => [ record.id, record.name ] )
	);
	const options: ContentOption[] = ( searchRecords ?? [] )
		.filter( ( record ) => ! selectedIds.includes( record.id ) )
		.map( ( record ) => ( {
			label: record.name,
			value: String( record.id ),
		} ) );
	const isLoading = searchRecords === null || selectedRecords === null;
	const removeLabel =
		taxonomy === 'category'
			? /* translators: %s: category name. */ __(
					'Remove category %s',
					'npcink-ad'
			  )
			: /* translators: %s: tag name. */ __(
					'Remove tag %s',
					'npcink-ad'
			  );

	return (
		<div className="npcink-ad-content-picker">
			<ComboboxControl
				__next40pxDefaultSize
				label={ label }
				help={ help }
				value={ null }
				options={ options }
				isLoading={ isLoading }
				onFilterValueChange={ setFilter }
				onChange={ ( value ) => {
					const id = Number.parseInt( value || '', 10 );
					if ( id > 0 ) {
						onAdd( id );
						setFilter( '' );
					}
				} }
			/>
			{ isLoading && <Spinner /> }
			{ selectedIds.length > 0 && selectedRecords !== null && (
				<ul className="npcink-ad-content-picker__selected">
					{ selectedIds.map( ( id ) => {
						const termName = labels.get( id ) || `#${ id }`;

						return (
							<li key={ id }>
								<span>{ termName }</span>
								<Button
									variant="tertiary"
									isDestructive
									onClick={ () => onRemove( id ) }
									aria-label={ sprintf(
										removeLabel,
										termName
									) }
								>
									{ __( 'Remove', 'npcink-ad' ) }
								</Button>
							</li>
						);
					} ) }
				</ul>
			) }
		</div>
	);
}

function PromotionSettings() {
	const postType = useSelect(
		( select ) => select( editorStore ).getCurrentPostType(),
		[]
	);

	return postType === 'npcink_promotion' ? <PromotionSettingsPanel /> : null;
}

function PromotionSettingsPanel() {
	const postId = useSelect(
		( select ) => Number( select( editorStore ).getCurrentPostId() ),
		[]
	);
	const meta = useSelect(
		( select ) =>
			( select( editorStore ).getEditedPostAttribute( 'meta' ) ??
				{} ) as PromotionMeta,
		[]
	);
	const content = useSelect(
		( select ) =>
			String( select( editorStore ).getEditedPostContent() ?? '' ),
		[]
	);
	const site = useSelect(
		( select ) =>
			( select( coreDataStore ).getEntityRecord(
				'root',
				'__unstableBase'
			) ?? null ) as SiteBaseRecord | null,
		[]
	);
	const { isSaving, isAutosaving, persistedStatus, editedStatus } = useSelect(
		( select ) => {
			const editor = select( editorStore );
			const currentPost = editor.getCurrentPost() as ContentRecord;

			return {
				isSaving: editor.isSavingPost(),
				isAutosaving: editor.isAutosavingPost(),
				persistedStatus: String( currentPost?.status ?? '' ),
				editedStatus: String(
					editor.getEditedPostAttribute( 'status' ) ?? ''
				),
			};
		},
		[]
	);
	const isDirty = useSelect(
		( select ) => select( editorStore ).isEditedPostDirty(),
		[]
	);
	const { editPost, savePost } = useDispatch( editorStore );
	const publishStatusRecovery = React.useRef(
		createPublishStatusRecoveryState()
	);
	const [ previewTarget, setPreviewTarget ] = React.useState( 0 );
	const [ previewError, setPreviewError ] = React.useState( '' );
	const [ confirmedPublicIds, setConfirmedPublicIds ] = React.useState<
		number[]
	>( [] );
	const [ confirmedCategoryIds, setConfirmedCategoryIds ] = React.useState<
		number[]
	>( [] );
	const [ confirmedTagIds, setConfirmedTagIds ] = React.useState< number[] >(
		[]
	);

	// Reconcile before paint so Core UI does not present a failed status as saved.
	React.useLayoutEffect( () => {
		const transition = advancePublishStatusRecovery(
			publishStatusRecovery.current,
			{
				isSaving,
				isAutosaving,
				persistedStatus,
				editedStatus,
			}
		);
		publishStatusRecovery.current = transition.state;

		if ( transition.restoreStatus !== null ) {
			editPost(
				{ status: transition.restoreStatus },
				{ undoIgnore: true }
			);
		}
	}, [ editPost, editedStatus, isAutosaving, isSaving, persistedStatus ] );

	const updateMeta = < Key extends keyof PromotionMeta >(
		key: Key,
		value: PromotionMeta[ Key ]
	) => {
		editPost( {
			meta: {
				...meta,
				[ key ]: value,
			},
		} );
	};

	const includeIds = normalizeIds( meta._npcink_ad_include_ids );
	const excludeIds = normalizeIds( meta._npcink_ad_exclude_ids );
	const categoryIds = normalizeIds( meta._npcink_ad_category_ids );
	const tagIds = normalizeIds( meta._npcink_ad_tag_ids );
	const location = meta._npcink_ad_location || 'content_after';
	const isManualBlock = location === 'block';
	const rawContentScope = meta._npcink_ad_content_scope || 'all';
	const contentScope = contentScopeForPlacement( rawContentScope, location );
	const paragraphNumber = effectiveParagraphNumber(
		meta._npcink_ad_paragraph_number
	);
	const paragraphNumberValid = isValidParagraphNumber( paragraphNumber );
	const settings = window.NpcinkAdEditorSettings;
	const { includeIds: effectiveIncludeIds, excludeIds: effectiveExcludeIds } =
		getEffectivePromotionTargetIds( includeIds, excludeIds, [
			...( settings?.publicContentIds ?? [] ),
			...confirmedPublicIds,
		] );
	const confirmPublicId = ( id: number ) => {
		setConfirmedPublicIds( ( current ) =>
			current.includes( id ) ? current : [ ...current, id ]
		);
	};
	const {
		categoryIds: effectiveCategoryIds,
		tagIds: effectiveTagIds,
		termsValid,
	} = getEffectivePromotionTermSelection(
		categoryIds,
		tagIds,
		[ ...( settings?.validCategoryIds ?? [] ), ...confirmedCategoryIds ],
		[ ...( settings?.validTagIds ?? [] ), ...confirmedTagIds ]
	);
	const confirmCategoryId = ( id: number ) => {
		setConfirmedCategoryIds( ( current ) =>
			current.includes( id ) ? current : [ ...current, id ]
		);
	};
	const confirmTagId = ( id: number ) => {
		setConfirmedTagIds( ( current ) =>
			current.includes( id ) ? current : [ ...current, id ]
		);
	};
	const termsNeedAttention =
		contentScope === 'terms' &&
		( ! termsValid ||
			effectiveCategoryIds.length + effectiveTagIds.length === 0 );
	const preflightIssues = getPromotionPreflightIssues( {
		content,
		location,
		contentScope,
		includeIds: effectiveIncludeIds,
		excludeIds: effectiveExcludeIds,
		categoryIds: effectiveCategoryIds,
		tagIds: effectiveTagIds,
		paragraphNumber,
		startAt: meta._npcink_ad_start_at,
		endAt: meta._npcink_ad_end_at,
	} );
	const hasSchedule = Boolean(
		meta._npcink_ad_start_at || meta._npcink_ad_end_at
	);
	const timezone = siteTimezoneLabel( site );
	const potentiallyOverlappingIds = getPotentiallyOverlappingPromotionIds(
		{
			id: postId,
			location,
			contentScope,
			includeIds: effectiveIncludeIds,
			excludeIds: effectiveExcludeIds,
			categoryIds: effectiveCategoryIds,
			tagIds: effectiveTagIds,
			termsValid,
			device: meta._npcink_ad_device || 'all',
			paragraphNumber,
			startAt: meta._npcink_ad_start_at,
			endAt: meta._npcink_ad_end_at,
		},
		settings?.publishedAutomaticPromotions ?? []
	);
	const effectivePreviewTarget =
		previewTarget ||
		effectiveIncludeIds[ 0 ] ||
		settings?.defaultTargetId ||
		0;
	const isParagraphLocation = location === 'content_after_paragraph';
	const manualBlockInspection = useSelect(
		( select ): ManualBlockInspectionState => {
			if ( ! isManualBlock ) {
				return 'not_applicable';
			}

			if ( ! effectivePreviewTarget ) {
				return 'no_target';
			}

			if ( ! postId ) {
				return 'unavailable';
			}

			const coreData = select( coreDataStore );
			const resolution = coreData as typeof coreData &
				ResolutionSelectors;
			const postArgs = [
				'postType',
				'post',
				effectivePreviewTarget,
				editContextQuery,
			] as const;
			const pageArgs = [
				'postType',
				'page',
				effectivePreviewTarget,
				editContextQuery,
			] as const;
			const post = coreData.getEntityRecord( ...postArgs ) as
				| ContentRecord
				| null
				| undefined;
			const page = coreData.getEntityRecord( ...pageArgs ) as
				| ContentRecord
				| null
				| undefined;
			const target = post ?? page;

			if ( target ) {
				const rawContent = target.content?.raw;
				if (
					target.status !== 'publish' ||
					typeof rawContent !== 'string'
				) {
					return 'unavailable';
				}

				try {
					return contentContainsPromotionBlock( rawContent, postId )
						? 'found'
						: 'missing';
				} catch {
					return 'unavailable';
				}
			}

			const postResolved = resolution.hasFinishedResolution(
				'getEntityRecord',
				postArgs
			);
			const pageResolved = resolution.hasFinishedResolution(
				'getEntityRecord',
				pageArgs
			);

			return postResolved && pageResolved ? 'unavailable' : 'loading';
		},
		[ isManualBlock, effectivePreviewTarget, postId ]
	);
	const paragraphAnchorInspection = useSelect(
		( select ): ParagraphAnchorNoticeState => {
			if ( ! isParagraphLocation ) {
				return { state: 'not_applicable' };
			}
			if ( ! paragraphNumberValid ) {
				return { state: 'invalid_number' };
			}
			if ( ! effectivePreviewTarget ) {
				return { state: 'no_target' };
			}

			const coreData = select( coreDataStore );
			const resolution = coreData as typeof coreData &
				ResolutionSelectors;
			const postArgs = [
				'postType',
				'post',
				effectivePreviewTarget,
				editContextQuery,
			] as const;
			const pageArgs = [
				'postType',
				'page',
				effectivePreviewTarget,
				editContextQuery,
			] as const;
			const post = coreData.getEntityRecord( ...postArgs ) as
				| ContentRecord
				| null
				| undefined;
			const page = coreData.getEntityRecord( ...pageArgs ) as
				| ContentRecord
				| null
				| undefined;
			const target = post ?? page;

			if ( target ) {
				const rawContent = target.content?.raw;
				if (
					target.status !== 'publish' ||
					typeof rawContent !== 'string'
				) {
					return { state: 'unavailable' };
				}

				const inspection = inspectParagraphAnchor(
					rawContent,
					paragraphNumber
				);
				return inspection.state === 'unavailable'
					? inspection
					: { ...inspection, paragraphNumber };
			}

			const postResolved = resolution.hasFinishedResolution(
				'getEntityRecord',
				postArgs
			);
			const pageResolved = resolution.hasFinishedResolution(
				'getEntityRecord',
				pageArgs
			);

			return postResolved && pageResolved
				? { state: 'unavailable' }
				: { state: 'loading' };
		},
		[
			isParagraphLocation,
			effectivePreviewTarget,
			paragraphNumber,
			paragraphNumberValid,
		]
	);

	const openPreview = async () => {
		setPreviewError( '' );
		if ( ! settings || ! postId ) {
			setPreviewError(
				__(
					'Save the promotion before opening a preview.',
					'npcink-ad'
				)
			);
			return;
		}
		if ( isParagraphLocation && ! paragraphNumberValid ) {
			setPreviewError(
				sprintf(
					/* translators: 1: minimum paragraph number, 2: maximum paragraph number. */
					__(
						'Enter a whole paragraph number from %1$d to %2$d before opening the real-page preview.',
						'npcink-ad'
					),
					MIN_PARAGRAPH_NUMBER,
					MAX_PARAGRAPH_NUMBER
				)
			);
			return;
		}

		if ( ! effectivePreviewTarget ) {
			setPreviewError(
				__(
					'Choose a published page or post to use as the preview context.',
					'npcink-ad'
				)
			);
			return;
		}

		const previewWindow = window.open( '', 'npcink-ad-preview' );
		if ( ! previewWindow ) {
			setPreviewError(
				__(
					'Allow pop-ups for this site, then try preview again.',
					'npcink-ad'
				)
			);
			return;
		}

		previewWindow.document.title = __( 'Preparing preview…', 'npcink-ad' );
		try {
			if ( isDirty ) {
				await savePost();
			}
		} catch {
			previewWindow.close();
			setPreviewError(
				__(
					'The promotion could not be saved. Resolve the editor error, then try again.',
					'npcink-ad'
				)
			);
			return;
		}
		const url = new URL( settings.previewUrl );
		url.searchParams.set( 'promotion', String( postId ) );
		url.searchParams.set( 'target', String( effectivePreviewTarget ) );
		url.searchParams.set( 'device', 'desktop' );
		url.searchParams.set( '_wpnonce', settings.nonce );
		previewWindow.location.replace( url.toString() );
	};

	return (
		<>
			<PluginDocumentSettingPanel
				name="npcink-ad-delivery"
				title={ __( 'Npcink Ad delivery', 'npcink-ad' ) }
				className="npcink-ad-editor-panel"
			>
				{ preflightIssues.length > 0 && (
					<Notice status="error" isDismissible={ false }>
						{ sprintf(
							/* translators: %d: number of delivery configuration errors. */
							_n(
								'%d delivery configuration error needs review before publishing.',
								'%d delivery configuration errors need review before publishing.',
								preflightIssues.length,
								'npcink-ad'
							),
							preflightIssues.length
						) }
					</Notice>
				) }
				<SelectControl
					__next40pxDefaultSize
					label={ __( 'Placement', 'npcink-ad' ) }
					value={ location }
					help={
						isManualBlock
							? /* translators: [npcink_ad promotion="ID"] is an example shortcode and must not be translated. */ __(
									'Manual delivery is not inserted automatically. Save this Promotion first, then insert the Npcink Ad Promotion block where it should appear and select this Promotion. The block position is the live position; verify it with Real-page preview. The existing [npcink_ad promotion="ID"] shortcode remains an expert manual-insertion path.',
									'npcink-ad'
							  )
							: undefined
					}
					options={ [
						{
							label: __( 'After post content', 'npcink-ad' ),
							value: 'content_after',
						},
						{
							label: __( 'Before post content', 'npcink-ad' ),
							value: 'content_before',
						},
						{
							label: __( 'After paragraph N', 'npcink-ad' ),
							value: 'content_after_paragraph',
						},
						{
							label: __( 'Manual block', 'npcink-ad' ),
							value: 'block',
						},
					] }
					onChange={ ( value ) => {
						const nextLocation = value as PromotionLocation;
						const nextContentScope = contentScopeForPlacement(
							rawContentScope,
							nextLocation
						);

						editPost( {
							meta: {
								...meta,
								_npcink_ad_location: nextLocation,
								_npcink_ad_content_scope: nextContentScope,
							},
						} );
					} }
				/>
				<SelectControl
					__next40pxDefaultSize
					label={ __( 'Content scope', 'npcink-ad' ) }
					value={ contentScope }
					help={
						isManualBlock
							? /* translators: [npcink_ad promotion="ID"] is an example shortcode and must not be translated. */ __(
									'Manual delivery still requires the Npcink Ad Promotion block or [npcink_ad promotion="ID"] shortcode. "Only selected posts and pages" adds an allow-list; explicit exclusions always take priority.',
									'npcink-ad'
							  )
							: undefined
					}
					options={
						isManualBlock
							? [
									{
										/* translators: Content scope option for a Promotion inserted by a block or shortcode. */
										label: __(
											'Wherever manually inserted',
											'npcink-ad'
										),
										value: 'all',
									},
									{
										/* translators: Content scope option that limits manual delivery to an explicit post/page allow-list. */
										label: __(
											'Only selected posts and pages',
											'npcink-ad'
										),
										value: 'selected',
									},
							  ]
							: [
									{
										label: __(
											'All posts and pages',
											'npcink-ad'
										),
										value: 'all',
									},
									{
										label: __( 'All posts', 'npcink-ad' ),
										value: 'posts',
									},
									{
										label: __( 'All pages', 'npcink-ad' ),
										value: 'pages',
									},
									{
										label: __(
											'Posts in selected categories or tags',
											'npcink-ad'
										),
										value: 'terms',
									},
									{
										label: __(
											'Only selected content',
											'npcink-ad'
										),
										value: 'selected',
									},
							  ]
					}
					onChange={ ( value ) =>
						updateMeta(
							'_npcink_ad_content_scope',
							value as PromotionMeta[ '_npcink_ad_content_scope' ]
						)
					}
				/>
				{ isParagraphLocation && (
					<TextControl
						__next40pxDefaultSize
						type="number"
						label={ __( 'Paragraph number', 'npcink-ad' ) }
						value={ String( paragraphNumber ) }
						min={ MIN_PARAGRAPH_NUMBER }
						max={ MAX_PARAGRAPH_NUMBER }
						step={ 1 }
						onChange={ ( value ) => {
							const parsed =
								value.trim() === '' ? 0 : Number( value );
							updateMeta(
								'_npcink_ad_paragraph_number',
								Number.isFinite( parsed ) ? parsed : 0
							);
						} }
						help={ sprintf(
							/* translators: 1: minimum paragraph number, 2: maximum paragraph number. */
							__(
								'Required. Enter a whole number from %1$d to %2$d. The default is 3.',
								'npcink-ad'
							),
							MIN_PARAGRAPH_NUMBER,
							MAX_PARAGRAPH_NUMBER
						) }
					/>
				) }
				{ contentScope === 'selected' && (
					<ContentPicker
						label={ __( 'Included content', 'npcink-ad' ) }
						help={ __(
							'The promotion can appear only on these published posts and pages.',
							'npcink-ad'
						) }
						selectedIds={ includeIds }
						onAdd={ ( id ) => {
							confirmPublicId( id );
							updateMeta( '_npcink_ad_include_ids', [
								...includeIds,
								id,
							] );
						} }
						onRemove={ ( id ) =>
							updateMeta(
								'_npcink_ad_include_ids',
								includeIds.filter( ( item ) => item !== id )
							)
						}
					/>
				) }
				<SelectControl
					__next40pxDefaultSize
					label={ __( 'Device', 'npcink-ad' ) }
					value={ meta._npcink_ad_device || 'all' }
					help={
						/* translators: 782px is the fixed desktop minimum; 781px is the fixed mobile maximum. */ __(
							'The All devices option shows the Promotion at every width. Desktop shows it at viewport widths of 782px and above; Mobile shows it at 781px and below. CSS applies this fixed breakpoint, with no separate tablet target.',
							'npcink-ad'
						)
					}
					options={ [
						{
							label: __( 'All devices', 'npcink-ad' ),
							value: 'all',
						},
						{
							label: __( 'Desktop', 'npcink-ad' ),
							value: 'desktop',
						},
						{ label: __( 'Mobile', 'npcink-ad' ), value: 'mobile' },
					] }
					onChange={ ( value ) =>
						updateMeta(
							'_npcink_ad_device',
							value as PromotionMeta[ '_npcink_ad_device' ]
						)
					}
				/>
				<TextControl
					__next40pxDefaultSize
					type="datetime-local"
					label={ __( 'Start showing', 'npcink-ad' ) }
					value={ toInputDate( meta._npcink_ad_start_at ) }
					onChange={ ( value ) =>
						updateMeta(
							'_npcink_ad_start_at',
							fromInputDate( value )
						)
					}
					help={ sprintf(
						/* translators: %s: site timezone name or UTC offset. */
						__(
							'Optional. Uses the site timezone: %s.',
							'npcink-ad'
						),
						timezone
					) }
				/>
				<TextControl
					__next40pxDefaultSize
					type="datetime-local"
					label={ __( 'Stop showing', 'npcink-ad' ) }
					value={ toInputDate( meta._npcink_ad_end_at ) }
					onChange={ ( value ) =>
						updateMeta(
							'_npcink_ad_end_at',
							fromInputDate( value )
						)
					}
					help={ sprintf(
						/* translators: %s: site timezone name or UTC offset. */
						__(
							'Optional. Uses the site timezone: %s.',
							'npcink-ad'
						),
						timezone
					) }
				/>
				<PanelBody
					title={
						termsNeedAttention
							? __(
									'Advanced editorial scope — needs attention',
									'npcink-ad'
							  )
							: __( 'Advanced editorial scope', 'npcink-ad' )
					}
					initialOpen={ false }
				>
					{ contentScope === 'terms' && (
						<>
							<p>
								{ __(
									'Categories and tags use ANY matching and apply only to standard posts. Exact excluded content always takes priority.',
									'npcink-ad'
								) }
							</p>
							{ ! termsValid &&
								categoryIds.length + tagIds.length > 0 && (
									<Notice
										status="warning"
										isDismissible={ false }
									>
										{ __(
											'Some selected categories or tags are no longer available. Remove them before publishing.',
											'npcink-ad'
										) }
									</Notice>
								) }
							<TermPicker
								taxonomy="category"
								label={ __( 'Categories', 'npcink-ad' ) }
								help={ __(
									'Choose one or more categories.',
									'npcink-ad'
								) }
								selectedIds={ categoryIds }
								onAdd={ ( id ) => {
									confirmCategoryId( id );
									updateMeta( '_npcink_ad_category_ids', [
										...categoryIds,
										id,
									] );
								} }
								onRemove={ ( id ) =>
									updateMeta(
										'_npcink_ad_category_ids',
										categoryIds.filter(
											( item ) => item !== id
										)
									)
								}
							/>
							<TermPicker
								taxonomy="post_tag"
								label={ __( 'Tags', 'npcink-ad' ) }
								help={ __(
									'Choose one or more tags.',
									'npcink-ad'
								) }
								selectedIds={ tagIds }
								onAdd={ ( id ) => {
									confirmTagId( id );
									updateMeta( '_npcink_ad_tag_ids', [
										...tagIds,
										id,
									] );
								} }
								onRemove={ ( id ) =>
									updateMeta(
										'_npcink_ad_tag_ids',
										tagIds.filter( ( item ) => item !== id )
									)
								}
							/>
						</>
					) }
					<ContentPicker
						label={ __( 'Excluded content', 'npcink-ad' ) }
						help={ __(
							'The promotion never appears on these posts and pages.',
							'npcink-ad'
						) }
						selectedIds={ excludeIds }
						onAdd={ ( id ) => {
							confirmPublicId( id );
							updateMeta( '_npcink_ad_exclude_ids', [
								...excludeIds,
								id,
							] );
						} }
						onRemove={ ( id ) =>
							updateMeta(
								'_npcink_ad_exclude_ids',
								excludeIds.filter( ( item ) => item !== id )
							)
						}
					/>
				</PanelBody>
			</PluginDocumentSettingPanel>

			<PluginDocumentSettingPanel
				name="npcink-ad-preview"
				title={ __( 'Real-page preview', 'npcink-ad' ) }
				className="npcink-ad-editor-panel"
			>
				<ContentPicker
					label={ __( 'Preview page', 'npcink-ad' ) }
					help={ __(
						'Choose the real post or page whose theme and layout should be used.',
						'npcink-ad'
					) }
					selectedIds={
						effectivePreviewTarget ? [ effectivePreviewTarget ] : []
					}
					onAdd={ setPreviewTarget }
					onRemove={ () => setPreviewTarget( 0 ) }
				/>
				<ManualBlockInspectionNotice state={ manualBlockInspection } />
				{ previewError && (
					<Notice status="warning" isDismissible={ false }>
						{ previewError }
					</Notice>
				) }
				{ isParagraphLocation && ! paragraphNumberValid && (
					<Notice status="warning" isDismissible={ false }>
						{ sprintf(
							/* translators: 1: minimum paragraph number, 2: maximum paragraph number. */
							__(
								'Enter a whole paragraph number from %1$d to %2$d before opening the real-page preview.',
								'npcink-ad'
							),
							MIN_PARAGRAPH_NUMBER,
							MAX_PARAGRAPH_NUMBER
						) }
					</Notice>
				) }
				<Button
					variant="secondary"
					disabled={
						isSaving ||
						! settings ||
						( isParagraphLocation && ! paragraphNumberValid )
					}
					isBusy={ isSaving }
					onClick={ openPreview }
				>
					{ isDirty
						? __( 'Save and open preview', 'npcink-ad' )
						: __( 'Open preview', 'npcink-ad' ) }
				</Button>
			</PluginDocumentSettingPanel>

			<PluginPrePublishPanel
				title={ __( 'Npcink Ad delivery preflight', 'npcink-ad' ) }
				initialOpen={
					preflightIssues.length > 0 ||
					potentiallyOverlappingIds.length > 0 ||
					hasSchedule ||
					isManualBlock ||
					isParagraphLocation
				}
			>
				{ preflightIssues.length > 0 ? (
					preflightIssues.map( ( issue ) => (
						<Notice
							key={ issue }
							status="error"
							isDismissible={ false }
						>
							{ preflightIssueMessage( issue ) }
						</Notice>
					) )
				) : (
					<Notice status="info" isDismissible={ false }>
						{ __(
							'No empty-scope, schedule, content, or paragraph errors were found in the current editor fields. Public selected targets and category or tag availability are confirmed by the server when publishing or scheduling.',
							'npcink-ad'
						) }
					</Notice>
				) }
				{ potentiallyOverlappingIds.length > 0 && (
					<Notice status="warning" isDismissible={ false }>
						{ sprintf(
							/* translators: %d: number of other published promotions that may share a delivery context. */
							_n(
								'This promotion may appear together with %d other published promotion in some post or page contexts.',
								'This promotion may appear together with %d other published promotions in some post or page contexts.',
								potentiallyOverlappingIds.length,
								'npcink-ad'
							),
							potentiallyOverlappingIds.length
						) }{ ' ' }
						{ __(
							'This advisory does not block publishing.',
							'npcink-ad'
						) }
					</Notice>
				) }
				{ hasSchedule && (
					<Notice status="info" isDismissible={ false }>
						{ sprintf(
							/* translators: %s: site timezone name or UTC offset. */
							__(
								'Schedule times use the site timezone (%s). Full-page caches and CDNs need an appropriate TTL or purge; minute-level switching cannot be guaranteed while a cached page remains in use.',
								'npcink-ad'
							),
							timezone
						) }
					</Notice>
				) }
				<ManualBlockInspectionNotice state={ manualBlockInspection } />
				<ParagraphAnchorNotice
					inspection={ paragraphAnchorInspection }
				/>
				<p>
					{ __(
						'These editor checks do not block saving. PHP delivery evaluation and Core REST responses remain authoritative.',
						'npcink-ad'
					) }
				</p>
			</PluginPrePublishPanel>
		</>
	);
}

registerPlugin( 'npcink-ad-editor', {
	render: PromotionSettings,
	icon: 'megaphone',
} );
