import { formatPromotionOptionLabel } from './promotion-option';

const titleWithId = 'Summer campaign (#12)';
const nonManualMarker = '(Not configured for Manual block)';

describe( 'formatPromotionOptionLabel', () => {
	test( 'leaves Manual block Promotions unmarked', () => {
		expect(
			formatPromotionOptionLabel( titleWithId, 'block', nonManualMarker )
		).toBe( titleWithId );
	} );

	test.each( [
		'content_before',
		'content_after',
		'content_after_paragraph',
		'bar_top',
		'bar_bottom',
	] )( 'marks the non-manual %s location', ( location ) => {
		expect(
			formatPromotionOptionLabel( titleWithId, location, nonManualMarker )
		).toBe( `${ titleWithId } ${ nonManualMarker }` );
	} );

	test( 'treats missing REST location meta as content_after', () => {
		expect(
			formatPromotionOptionLabel(
				titleWithId,
				undefined,
				nonManualMarker
			)
		).toBe( `${ titleWithId } ${ nonManualMarker }` );
	} );

	test( 'preserves the unpublished marker before the placement marker', () => {
		const unpublishedLabel = `${ titleWithId } (Not published)`;

		expect(
			formatPromotionOptionLabel(
				unpublishedLabel,
				'content_after',
				nonManualMarker
			)
		).toBe( `${ unpublishedLabel } ${ nonManualMarker }` );
	} );
} );
