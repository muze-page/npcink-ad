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
	PluginDocumentSettingPanel,
	store as editorStore,
} from '@wordpress/editor';
import { __, sprintf } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

interface PromotionMeta {
	_npcink_ad_location?: 'block' | 'content_before' | 'content_after';
	_npcink_ad_page_scope?: 'all' | 'selected';
	_npcink_ad_include_ids?: number[];
	_npcink_ad_exclude_ids?: number[];
	_npcink_ad_device?: 'all' | 'desktop' | 'mobile';
	_npcink_ad_start_at?: string;
	_npcink_ad_end_at?: string;
}

interface ContentRecord {
	id: number;
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
	const isSaving = useSelect(
		( select ) =>
			select( editorStore ).isSavingPost() ||
			select( editorStore ).isAutosavingPost(),
		[]
	);
	const { editPost, savePost } = useDispatch( editorStore );
	const [ previewTarget, setPreviewTarget ] = React.useState( 0 );
	const [ previewError, setPreviewError ] = React.useState( '' );

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
	const settings = window.NpcinkAdEditorSettings;
	const effectivePreviewTarget =
		previewTarget || includeIds[ 0 ] || settings?.defaultTargetId || 0;

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
			await savePost();
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
				<SelectControl
					__next40pxDefaultSize
					label={ __( 'Placement', 'npcink-ad' ) }
					value={ meta._npcink_ad_location || 'content_after' }
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
							label: __( 'Manual block', 'npcink-ad' ),
							value: 'block',
						},
					] }
					onChange={ ( value ) =>
						updateMeta(
							'_npcink_ad_location',
							value as PromotionMeta[ '_npcink_ad_location' ]
						)
					}
				/>
				<SelectControl
					__next40pxDefaultSize
					label={ __( 'Pages', 'npcink-ad' ) }
					value={ meta._npcink_ad_page_scope || 'all' }
					options={ [
						{
							label: __( 'All posts and pages', 'npcink-ad' ),
							value: 'all',
						},
						{
							label: __( 'Only selected content', 'npcink-ad' ),
							value: 'selected',
						},
					] }
					onChange={ ( value ) =>
						updateMeta(
							'_npcink_ad_page_scope',
							value as PromotionMeta[ '_npcink_ad_page_scope' ]
						)
					}
				/>
				{ ( meta._npcink_ad_page_scope || 'all' ) === 'selected' && (
					<ContentPicker
						label={ __( 'Included content', 'npcink-ad' ) }
						help={ __(
							'The promotion can appear only on these published posts and pages.',
							'npcink-ad'
						) }
						selectedIds={ includeIds }
						onAdd={ ( id ) =>
							updateMeta( '_npcink_ad_include_ids', [
								...includeIds,
								id,
							] )
						}
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
					help={ __(
						'Optional. Uses the site timezone.',
						'npcink-ad'
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
					help={ __(
						'Optional. Uses the site timezone.',
						'npcink-ad'
					) }
				/>
				<PanelBody
					title={ __( 'Advanced page exclusions', 'npcink-ad' ) }
					initialOpen={ false }
				>
					<ContentPicker
						label={ __( 'Excluded content', 'npcink-ad' ) }
						help={ __(
							'The promotion never appears on these posts and pages.',
							'npcink-ad'
						) }
						selectedIds={ excludeIds }
						onAdd={ ( id ) =>
							updateMeta( '_npcink_ad_exclude_ids', [
								...excludeIds,
								id,
							] )
						}
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
				{ previewError && (
					<Notice status="warning" isDismissible={ false }>
						{ previewError }
					</Notice>
				) }
				<Button
					variant="secondary"
					disabled={ isSaving || ! settings }
					isBusy={ isSaving }
					onClick={ openPreview }
				>
					{ __( 'Save and open preview', 'npcink-ad' ) }
				</Button>
			</PluginDocumentSettingPanel>
		</>
	);
}

registerPlugin( 'npcink-ad-editor', {
	render: PromotionSettings,
	icon: 'megaphone',
} );
