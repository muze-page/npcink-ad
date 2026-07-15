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
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';

import metadata from '../blocks/npcink-ad-promotion/block.json';

type PromotionStatus = 'publish' | 'draft' | 'future' | 'private';

interface PromotionRecord {
	id: number;
	status: PromotionStatus;
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

	if ( typeof title === 'string' ) {
		return title;
	}

	return title?.raw || title?.rendered || `#${ promotion.id }`;
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
		...( promotions ?? [] ).map( ( promotion ) => ( {
			label:
				promotion.status === 'publish'
					? getPromotionTitle( promotion )
					: `${ getPromotionTitle( promotion ) } ${ __(
							'(Not published)',
							'npcink-ad'
					  ) }`,
			value: String( promotion.id ),
		} ) ),
	];

	const blockProps = useBlockProps( {
		className: 'npcink-ad-block-editor',
	} );

	const placeholder = (
		<Placeholder
			className="npcink-ad-block-editor__placeholder"
			icon="megaphone"
			label={ __( 'Npcink Ad promotion', 'npcink-ad' ) }
			instructions={
				attributes.promotionId > 0
					? __(
							'Preview is disabled. The selected promotion will render here when eligible.',
							'npcink-ad'
					  )
					: __(
							'Select a promotion in the block settings.',
							'npcink-ad'
					  )
			}
		/>
	);

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
							help={ __(
								'Published and draft promotions are available to editors.',
								'npcink-ad'
							) }
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
				{ attributes.preview ? (
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
						EmptyResponsePlaceholder={ () => placeholder }
						ErrorResponsePlaceholder={ () => (
							<Placeholder
								className="npcink-ad-block-editor__placeholder"
								icon="warning"
								label={ __(
									'Preview unavailable',
									'npcink-ad'
								) }
								instructions={ __(
									'Check that the selected promotion is configured for block placement.',
									'npcink-ad'
								) }
							/>
						) }
					/>
				) : (
					placeholder
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
