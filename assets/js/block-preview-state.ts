export type BlockPreviewMode =
	| 'no-selection'
	| 'server-side-render'
	| 'preview-disabled';

export function getBlockPreviewMode(
	promotionId: number,
	preview: boolean
): BlockPreviewMode {
	if ( promotionId <= 0 ) {
		return 'no-selection';
	}

	return preview ? 'server-side-render' : 'preview-disabled';
}
