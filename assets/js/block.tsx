/* @jsxRuntime classic */

import * as React from 'react';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	registerBlockType,
	type BlockConfiguration,
	type BlockEditProps,
} from '@wordpress/blocks';
import {
	PanelBody,
	Placeholder,
	RangeControl,
	SelectControl,
	Spinner,
	ToggleControl,
} from '@wordpress/components';
import { store as coreDataStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';

import metadata from '../blocks/npcink-ad-promotion/block.json';
import { getBlockPreviewMode } from './block-preview-state';
import {
	formatPromotionOptionLabel,
	type PromotionLocation,
} from './promotion-option';

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

const promotionQuery = {
	context: 'edit',
	order: 'asc',
	orderby: 'title',
	per_page: 100,
	status: [ 'publish', 'draft', 'future', 'private' ],
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

function Edit( {
	attributes,
	setAttributes,
}: BlockEditProps< BlockAttributes > ) {
	const promotions = useSelect(
		( select ) =>
			select( coreDataStore ).getEntityRecords(
				'postType',
				'npcink_promotion',
				promotionQuery
			) as PromotionRecord[] | null,
		[]
	);

	const promotionOptions = [
		{
			label: __( 'Select a promotion', 'npcink-ad' ),
			value: '0',
		},
		...( promotions ?? [] ).map( ( promotion ) => {
			const promotionTitle = getPromotionTitle( promotion );
			const publicationLabel =
				promotion.status === 'publish'
					? promotionTitle
					: sprintf(
							/* translators: %s: Promotion title followed by its ID. */
							__( '%s (Not published)', 'npcink-ad' ),
							promotionTitle
					  );

			return {
				label: formatPromotionOptionLabel(
					publicationLabel,
					promotion.meta?._npcink_ad_location,
					/* translators: Marker appended to a Promotion option whose placement is not Manual block. */ __(
						'(Not configured for Manual block)',
						'npcink-ad'
					)
				),
				value: String( promotion.id ),
			};
		} ),
	];

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
					{ promotions === null ? (
						<Spinner />
					) : (
						<SelectControl
							__next40pxDefaultSize
							label={ __( 'Promotion', 'npcink-ad' ) }
							value={ String( attributes.promotionId ) }
							options={ promotionOptions }
							onChange={ ( value ) =>
								setAttributes( {
									promotionId:
										Number.parseInt( value, 10 ) || 0,
								} )
							}
							help={
								/* translators: Explains the contract of the Promotion selected by a manual block. */ __(
									'Choose a saved Promotion configured for Manual block. This block controls the live position; the Promotion rules decide whether it displays.',
									'npcink-ad'
								)
							}
						/>
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
