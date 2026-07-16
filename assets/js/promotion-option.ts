export type PromotionLocation =
	| 'block'
	| 'content_before'
	| 'content_after'
	| 'content_after_paragraph';

const DEFAULT_PROMOTION_LOCATION: PromotionLocation = 'content_after';

export function formatPromotionOptionLabel(
	baseLabel: string,
	location: PromotionLocation | undefined,
	nonManualMarker: string
): string {
	const effectiveLocation = location ?? DEFAULT_PROMOTION_LOCATION;

	return effectiveLocation === 'block'
		? baseLabel
		: `${ baseLabel } ${ nonManualMarker }`;
}
