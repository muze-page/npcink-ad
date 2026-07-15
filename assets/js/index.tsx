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

import metadata from '../blocks/magick-ad-ad/block.json';
import './index.css';

type PlacementStatus = 'publish' | 'draft';

interface PlacementRecord {
	id: number;
	status: PlacementStatus;
	title?:
		| string
		| {
				raw?: string;
				rendered?: string;
		  };
}

interface BlockAttributes {
	placementId: number;
	reserveHeight: number;
	preview: boolean;
}

const placementQuery = {
	context: 'edit',
	order: 'asc',
	orderby: 'title',
	per_page: 100,
	status: [ 'publish', 'draft' ],
} as const;

function getPlacementTitle( placement: PlacementRecord ): string {
	const { title } = placement;

	if ( typeof title === 'string' ) {
		return title;
	}

	return title?.raw || title?.rendered || `#${ placement.id }`;
}

function Edit( {
	attributes,
	setAttributes,
}: BlockEditProps< BlockAttributes > ) {
	const placements = useSelect(
		( select ) =>
			select( coreDataStore ).getEntityRecords(
				'postType',
				'magick_ad_placement',
				placementQuery
			) as PlacementRecord[] | null,
		[]
	);

	const placementOptions = [
		{
			label: __( 'Select a placement', 'magick-ad' ),
			value: '0',
		},
		...( placements ?? [] ).map( ( placement ) => ( {
			label:
				placement.status === 'draft'
					? `${ getPlacementTitle( placement ) } ${ __(
							'(Draft)',
							'magick-ad'
					  ) }`
					: getPlacementTitle( placement ),
			value: String( placement.id ),
		} ) ),
	];

	const blockProps = useBlockProps( {
		className: 'magick-ad-block-editor',
	} );

	const placeholder = (
		<Placeholder
			className="magick-ad-block-editor__placeholder"
			icon="megaphone"
			label={ __( 'Magick AD placement', 'magick-ad' ) }
			instructions={
				attributes.placementId > 0
					? __(
							'Preview is disabled. The selected placement will render on the site.',
							'magick-ad'
					  )
					: __(
							'Select a placement in the block settings.',
							'magick-ad'
					  )
			}
		/>
	);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Placement settings', 'magick-ad' ) }
					initialOpen
				>
					{ placements === null ? (
						<Spinner />
					) : (
						<SelectControl
							label={ __( 'Placement', 'magick-ad' ) }
							value={ String( attributes.placementId ) }
							options={ placementOptions }
							onChange={ ( value ) =>
								setAttributes( {
									placementId:
										Number.parseInt( value, 10 ) || 0,
								} )
							}
							help={ __(
								'Published and draft placements are available in the editor.',
								'magick-ad'
							) }
						/>
					) }
					<RangeControl
						label={ __( 'Reserved height', 'magick-ad' ) }
						help={ __(
							'Reserve vertical space to reduce layout shift.',
							'magick-ad'
						) }
						min={ 0 }
						max={ 600 }
						value={ attributes.reserveHeight }
						onChange={ ( value ) =>
							setAttributes( { reserveHeight: value ?? 0 } )
						}
					/>
					<ToggleControl
						label={ __( 'Show live preview', 'magick-ad' ) }
						checked={ attributes.preview }
						onChange={ ( preview ) => setAttributes( { preview } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				{ attributes.preview ? (
					<ServerSideRender
						block="magick-ad/ad"
						attributes={ attributes }
						LoadingResponsePlaceholder={ () => (
							<Placeholder
								className="magick-ad-block-editor__placeholder"
								icon="megaphone"
								label={ __( 'Loading preview…', 'magick-ad' ) }
							/>
						) }
						EmptyResponsePlaceholder={ () => placeholder }
						ErrorResponsePlaceholder={ () => (
							<Placeholder
								className="magick-ad-block-editor__placeholder"
								icon="warning"
								label={ __(
									'Preview unavailable',
									'magick-ad'
								) }
								instructions={ __(
									'Check that the selected placement is configured.',
									'magick-ad'
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
