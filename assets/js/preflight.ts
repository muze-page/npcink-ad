import { parse, type BlockInstance } from '@wordpress/blocks';

export type PromotionPreflightIssueCode =
	| 'empty_content'
	| 'selected_scope_without_targets'
	| 'invalid_schedule_order';

interface PromotionPreflightInput {
	content: string;
	pageScope: 'all' | 'selected';
	includeIds: readonly number[];
	excludeIds: readonly number[];
	startAt?: string;
	endAt?: string;
}

export interface PromotionOverlapRule {
	id?: number;
	location: 'block' | 'content_before' | 'content_after';
	pageScope: 'all' | 'selected';
	includeIds: readonly number[];
	excludeIds: readonly number[];
	device: 'all' | 'desktop' | 'mobile';
	startAt?: string;
	endAt?: string;
	scheduleValid?: boolean;
}

export interface EffectivePromotionTargetIds {
	includeIds: number[];
	excludeIds: number[];
}

const meaningfulElementPattern =
	/<(?:img|picture|video|audio|iframe|object|embed|svg|canvas|input)\b/i;
const customDynamicBlockPattern =
	/<!--\s+wp:(?!core\/)[a-z0-9-]+\/[a-z0-9-]+(?:\s+\{[\s\S]*?\})?\s*\/-->/i;
const meaningfulCoreBlockPattern =
	/<!--\s+wp:(?:archives|calendar|categories|latest-comments|latest-posts|loginout|page-list|post-author|post-author-biography|post-comments-form|post-content|post-date|post-excerpt|post-featured-image|post-terms|post-title|query|rss|search|site-logo|site-tagline|site-title|tag-cloud)\b/i;

function hasMeaningfulBackgroundImage( content: string ): boolean {
	const urlDeclarations = content.matchAll(
		/\bbackground-image\s*:\s*url\(([^)]*)\)/gi
	);

	for ( const declaration of urlDeclarations ) {
		const value = declaration[ 1 ]
			.trim()
			.replace( /^(["'])([\s\S]*)\1$/, '$2' )
			.trim();
		if ( value !== '' ) {
			return true;
		}
	}

	return /\bbackground-image\s*:\s*(?:(?:repeating-)?(?:linear|radial|conic)-gradient|(?:-webkit-)?image-set|cross-fade|element|image|var)\s*\(/i.test(
		content
	);
}

/**
 * Treat only content that can produce visible or dynamic creative as meaningful.
 *
 * The checks intentionally avoid treating block delimiters and layout wrappers as
 * content while preserving media, form controls, CSS background images, and
 * server-rendered blocks that may have no saved inner HTML.
 *
 * @param content Serialized promotion post content.
 */
export function hasMeaningfulPromotionContent( content: string ): boolean {
	if ( content.trim() === '' ) {
		return false;
	}

	if (
		customDynamicBlockPattern.test( content ) ||
		meaningfulCoreBlockPattern.test( content )
	) {
		return true;
	}

	const renderableMarkup = content
		.replace(
			/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)>/gi,
			''
		)
		.replace( /<!--[\s\S]*?-->/g, '' );

	if (
		meaningfulElementPattern.test( renderableMarkup ) ||
		hasMeaningfulBackgroundImage( renderableMarkup )
	) {
		return true;
	}

	const visibleText = renderableMarkup
		.replace( /<[^>]*>/g, '' )
		.replace( /&(?:nbsp|ensp|emsp|thinsp|zwnj|zwj);/gi, '' )
		.replace(
			/&#(?:160|8192|8193|8194|8195|8196|8197|8198|8199|8200|8201|8202|8203);/g,
			''
		)
		.replace( /&#x(?:a0|200[0-9a-b]);/gi, '' )
		.replace( /[\s\u00a0\u2000-\u200d\u2060\ufeff]/g, '' );

	return visibleText !== '';
}

function blocksContainPromotion(
	blocks: readonly BlockInstance[],
	promotionId: number
): boolean {
	return blocks.some(
		( block ) =>
			( block.name === 'npcink-ad/promotion' &&
				block.attributes.promotionId === promotionId ) ||
			blocksContainPromotion( block.innerBlocks, promotionId )
	);
}

export function contentContainsPromotionBlock(
	content: string,
	promotionId: number
): boolean {
	return blocksContainPromotion( parse( content ), promotionId );
}

function localDateTimeValue( value: string ): number | null {
	const match = value
		.trim()
		.match( /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/ );

	if ( ! match ) {
		return null;
	}

	const year = Number( match[ 1 ] );
	const month = Number( match[ 2 ] );
	const day = Number( match[ 3 ] );
	const hour = Number( match[ 4 ] );
	const minute = Number( match[ 5 ] );
	const second = Number( match[ 6 ] ?? 0 );
	const parsed = new Date( 0 );
	parsed.setUTCFullYear( year, month - 1, day );
	parsed.setUTCHours( hour, minute, second, 0 );

	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() !== month - 1 ||
		parsed.getUTCDate() !== day ||
		parsed.getUTCHours() !== hour ||
		parsed.getUTCMinutes() !== minute ||
		parsed.getUTCSeconds() !== second
	) {
		return null;
	}

	return parsed.getTime();
}

/**
 * Keep only targets confirmed as public standard posts/pages by the server or
 * by a ContentPicker selection made during this editor session.
 *
 * @param includeIds       Current raw include IDs.
 * @param excludeIds       Current raw exclude IDs.
 * @param publicContentIds IDs confirmed as public posts/pages.
 */
export function getEffectivePromotionTargetIds(
	includeIds: readonly number[],
	excludeIds: readonly number[],
	publicContentIds: readonly number[]
): EffectivePromotionTargetIds {
	const publicLookup = new Set( publicContentIds );

	return {
		includeIds: [ ...new Set( includeIds ) ].filter(
			( id ) => id > 0 && publicLookup.has( id )
		),
		excludeIds: [ ...new Set( excludeIds ) ].filter(
			( id ) => id > 0 && publicLookup.has( id )
		),
	};
}

function effectiveSelectedIds( rule: PromotionOverlapRule ): number[] {
	const excludedIds = new Set( rule.excludeIds );

	return [ ...new Set( rule.includeIds ) ].filter(
		( id ) => id > 0 && ! excludedIds.has( id )
	);
}

function pageScopesMayOverlap(
	candidate: PromotionOverlapRule,
	published: PromotionOverlapRule
): boolean {
	if ( candidate.pageScope === 'all' && published.pageScope === 'all' ) {
		return true;
	}

	if (
		candidate.pageScope === 'selected' &&
		published.pageScope === 'selected'
	) {
		const publishedIds = new Set( effectiveSelectedIds( published ) );

		return effectiveSelectedIds( candidate ).some( ( id ) =>
			publishedIds.has( id )
		);
	}

	const selected = candidate.pageScope === 'selected' ? candidate : published;
	const all = candidate.pageScope === 'all' ? candidate : published;
	const allExclusions = new Set( all.excludeIds );

	return effectiveSelectedIds( selected ).some(
		( id ) => ! allExclusions.has( id )
	);
}

function schedulesMayOverlap(
	candidate: PromotionOverlapRule,
	published: PromotionOverlapRule
): boolean {
	if (
		candidate.scheduleValid === false ||
		published.scheduleValid === false
	) {
		return false;
	}

	const candidateStart = candidate.startAt
		? localDateTimeValue( candidate.startAt )
		: 0;
	const candidateEnd = candidate.endAt
		? localDateTimeValue( candidate.endAt )
		: 0;
	const publishedStart = published.startAt
		? localDateTimeValue( published.startAt )
		: 0;
	const publishedEnd = published.endAt
		? localDateTimeValue( published.endAt )
		: 0;

	if (
		candidateStart === null ||
		candidateEnd === null ||
		publishedStart === null ||
		publishedEnd === null ||
		( candidateStart > 0 &&
			candidateEnd > 0 &&
			candidateEnd <= candidateStart ) ||
		( publishedStart > 0 &&
			publishedEnd > 0 &&
			publishedEnd <= publishedStart )
	) {
		return false;
	}

	return ! (
		( candidateEnd > 0 && candidateEnd <= publishedStart ) ||
		( publishedEnd > 0 && publishedEnd <= candidateStart )
	);
}

function devicesMayOverlap(
	candidate: PromotionOverlapRule,
	published: PromotionOverlapRule
): boolean {
	return (
		candidate.device === 'all' ||
		published.device === 'all' ||
		candidate.device === published.device
	);
}

/**
 * Mirror the server overlap policy for immediate, non-blocking editor advice.
 *
 * PHP remains authoritative. This intentionally answers only whether two
 * automatic rules may share a standard post/page context; it does not select a
 * winner or change publication eligibility.
 *
 * @param candidate           Current unsaved editor rule.
 * @param publishedPromotions Other published automatic rules from the server.
 */
export function getPotentiallyOverlappingPromotionIds(
	candidate: PromotionOverlapRule,
	publishedPromotions: readonly PromotionOverlapRule[]
): number[] {
	if ( candidate.location === 'block' ) {
		return [];
	}

	return [
		...new Set(
			publishedPromotions
				.filter( ( published ) => {
					if (
						! published.id ||
						published.id === candidate.id ||
						published.location !== candidate.location ||
						published.location === 'block'
					) {
						return false;
					}

					return (
						devicesMayOverlap( candidate, published ) &&
						schedulesMayOverlap( candidate, published ) &&
						pageScopesMayOverlap( candidate, published )
					);
				} )
				.map( ( published ) => published.id as number )
		),
	];
}

export function getPromotionPreflightIssues( {
	content,
	pageScope,
	includeIds,
	excludeIds,
	startAt,
	endAt,
}: PromotionPreflightInput ): PromotionPreflightIssueCode[] {
	const issues: PromotionPreflightIssueCode[] = [];

	if ( ! hasMeaningfulPromotionContent( content ) ) {
		issues.push( 'empty_content' );
	}

	const hasEligibleTarget = includeIds.some(
		( id ) => ! excludeIds.includes( id )
	);
	if ( pageScope === 'selected' && ! hasEligibleTarget ) {
		issues.push( 'selected_scope_without_targets' );
	}

	if ( startAt && endAt ) {
		const start = localDateTimeValue( startAt );
		const end = localDateTimeValue( endAt );

		if ( start !== null && end !== null && end <= start ) {
			issues.push( 'invalid_schedule_order' );
		}
	}

	return issues;
}
