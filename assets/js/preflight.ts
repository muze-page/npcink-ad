import { getBlockType, parse, type BlockInstance } from '@wordpress/blocks';

export type PromotionPreflightIssueCode =
	| 'empty_content'
	| 'video_source_missing'
	| 'selected_scope_without_targets'
	| 'terms_scope_without_terms'
	| 'invalid_schedule_order'
	| 'invalid_paragraph_number';

export type PromotionContentScope =
	| 'all'
	| 'posts'
	| 'pages'
	| 'terms'
	| 'selected';

export type PromotionLocation =
	| 'block'
	| 'content_before'
	| 'content_after'
	| 'content_after_paragraph';

interface PromotionPreflightInput {
	content: string;
	location?: PromotionLocation;
	contentScope: PromotionContentScope;
	includeIds: readonly number[];
	excludeIds: readonly number[];
	categoryIds?: readonly number[];
	tagIds?: readonly number[];
	paragraphNumber?: number;
	startAt?: string;
	endAt?: string;
}

export interface PromotionOverlapRule {
	id?: number;
	location: PromotionLocation;
	contentScope: PromotionContentScope;
	includeIds: readonly number[];
	excludeIds: readonly number[];
	categoryIds: readonly number[];
	tagIds: readonly number[];
	termsValid: boolean;
	device: 'all' | 'desktop' | 'mobile';
	paragraphNumber?: number;
	startAt?: string;
	endAt?: string;
	scheduleValid?: boolean;
}

export interface EffectivePromotionTargetIds {
	includeIds: number[];
	excludeIds: number[];
}

export interface EffectivePromotionTermSelection {
	categoryIds: number[];
	tagIds: number[];
	termsValid: boolean;
}

export type ParagraphAnchorInspection =
	| {
			state: 'available' | 'missing';
			source: 'blocks' | 'html';
			paragraphCount: number;
	  }
	| {
			state: 'unavailable';
	  };

export const DEFAULT_PARAGRAPH_NUMBER = 3;
export const MIN_PARAGRAPH_NUMBER = 1;
export const MAX_PARAGRAPH_NUMBER = 20;

/**
 * Keep manual block placement inside its intentionally smaller scope contract.
 * Advanced automatic selections are reset in the same editor transaction that
 * changes placement, while their term metadata remains stored but inactive.
 *
 * @param contentScope Current canonical content scope.
 * @param location     Next placement.
 */
export function contentScopeForPlacement(
	contentScope: PromotionContentScope,
	location: PromotionLocation
): PromotionContentScope {
	return location === 'block' &&
		[ 'posts', 'pages', 'terms' ].includes( contentScope )
		? 'all'
		: contentScope;
}

const meaningfulElementPattern =
	/<(?:img|picture|video|audio|iframe|object|embed|svg|canvas|input)\b/i;
const customDynamicBlockPattern =
	/<!--\s+wp:(?!core\/)[a-z0-9-]+\/[a-z0-9-]+(?:\s+\{[\s\S]*?\})?\s*\/-->/i;
const meaningfulCoreBlockPattern =
	/<!--\s+wp:(?:archives|calendar|categories|latest-comments|latest-posts|loginout|page-list|post-author|post-author-biography|post-comments-form|post-content|post-date|post-excerpt|post-featured-image|post-terms|post-title|query|rss|search|site-logo|site-tagline|site-title|tag-cloud)\b/i;
function selectHtmlElements( html: string, selector: string ): Element[] {
	return Array.from(
		new DOMParser()
			.parseFromString( html, 'text/html' )
			.body.querySelectorAll( selector )
	);
}

function hasValidVideoSource( source: string ): boolean {
	if (
		/[\u0000-\u0020\u007f\ufffd]/.test( source ) ||
		source.includes( '\\' ) ||
		/%(?![0-9a-f]{2})/i.test( source )
	) {
		return false;
	}
	if ( /^\/(?!\/).+/.test( source ) ) {
		return true;
	}

	const match = source.match(
		/^https?:\/\/([a-z0-9.-]+)(?::([0-9]{1,5}))?(?:[/?#][^\\]*)?$/i
	);
	if ( ! match ) {
		return false;
	}

	const hostname = match[ 1 ];
	const labelsValid =
		hostname.length <= 253 &&
		hostname
			.split( '.' )
			.every( ( label ) =>
				/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test( label )
			);
	const ipv4Valid =
		! /^[0-9.]+$/.test( hostname ) ||
		( hostname.split( '.' ).length === 4 &&
			hostname
				.split( '.' )
				.every( ( octet ) => Number( octet ) <= 255 ) );
	const port = match[ 2 ] ? Number( match[ 2 ] ) : 1;

	return labelsValid && ipv4Valid && port > 0 && port <= 65535;
}

/**
 * Identify video markup that asks the browser to autoplay without muted.
 *
 * This is an editor-only advisory. Browser and Core Video behavior remain
 * authoritative, and the result never changes publication eligibility.
 *
 * @param content Serialized promotion post content.
 */
export function hasUnmutedAutoplayVideo( content: string ): boolean {
	return (
		selectHtmlElements( content, 'video[autoplay]:not([muted])' ).length > 0
	);
}

function hasVideoWithoutValidSource( content: string ): boolean {
	return (
		[
			...content.matchAll(
				/<!--\s+wp:(?:core\/)?video(?=\s|\/-->|-->)[^>]*(?:\/-->|-->([\s\S]*?)<!--\s+\/wp:(?:core\/)?video\s*-->)/gi
			),
		].some(
			( videoBlock ) =>
				! videoBlock[ 1 ] ||
				selectHtmlElements( videoBlock[ 1 ], 'video' ).length === 0
		) ||
		selectHtmlElements( content, 'video' ).some(
			( video ) =>
				! hasValidVideoSource( video.getAttribute( 'src' ) ?? '' )
		)
	);
}

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

/**
 * Keep only term IDs confirmed by the server for stored metadata or by a
 * TermPicker choice made during this editor session.
 *
 * A terms scope is valid only when it contains at least one term and every
 * configured term is confirmed. PHP remains authoritative at publication.
 *
 * @param categoryIds      Current raw category IDs.
 * @param tagIds           Current raw tag IDs.
 * @param validCategoryIds Confirmed category IDs.
 * @param validTagIds      Confirmed tag IDs.
 */
export function getEffectivePromotionTermSelection(
	categoryIds: readonly number[],
	tagIds: readonly number[],
	validCategoryIds: readonly number[],
	validTagIds: readonly number[]
): EffectivePromotionTermSelection {
	const categories = [ ...new Set( categoryIds ) ].filter( ( id ) => id > 0 );
	const tags = [ ...new Set( tagIds ) ].filter( ( id ) => id > 0 );
	const validCategories = new Set( validCategoryIds );
	const validTags = new Set( validTagIds );
	const effectiveCategories = categories.filter( ( id ) =>
		validCategories.has( id )
	);
	const effectiveTags = tags.filter( ( id ) => validTags.has( id ) );

	return {
		categoryIds: effectiveCategories,
		tagIds: effectiveTags,
		termsValid:
			categories.length + tags.length > 0 &&
			effectiveCategories.length === categories.length &&
			effectiveTags.length === tags.length,
	};
}

/**
 * Validate a paragraph anchor without coercing explicit invalid values to the
 * default. Missing metadata is the only case that receives the default of 3.
 *
 * @param value Stored or edited paragraph number.
 */
export function effectiveParagraphNumber( value?: number ): number {
	return value === undefined ? DEFAULT_PARAGRAPH_NUMBER : value;
}

/**
 * Check the bounded paragraph-number contract.
 *
 * @param value Paragraph number to validate.
 */
export function isValidParagraphNumber( value: number ): boolean {
	return (
		Number.isInteger( value ) &&
		value >= MIN_PARAGRAPH_NUMBER &&
		value <= MAX_PARAGRAPH_NUMBER
	);
}

function blocksAreReliable( blocks: readonly BlockInstance[] ): boolean {
	return blocks.every(
		( block ) => block.isValid && blocksAreReliable( block.innerBlocks )
	);
}

function serializedBlockNamesAreRegistered( content: string ): boolean {
	const blockNames = content.matchAll(
		/<!--\s+wp:([a-z0-9-]+(?:\/[a-z0-9-]+)?)(?=\s|\/?-->)/gi
	);
	let foundOpeningDelimiter = false;

	for ( const match of blockNames ) {
		foundOpeningDelimiter = true;
		const name = match[ 1 ].includes( '/' )
			? match[ 1 ]
			: `core/${ match[ 1 ] }`;
		if ( ! getBlockType( name ) ) {
			return false;
		}
	}

	return foundOpeningDelimiter;
}

/**
 * Confirm that Classic source contains no material outside explicit paragraphs
 * that wpautop could turn into another paragraph.
 *
 * This deliberately recognizes only complete p elements, WordPress's own
 * wpautop block boundaries, and HTML whitespace. Text, comments, entities,
 * inline elements, malformed markup, and unfamiliar wrappers all remain
 * unverified instead of being reimplemented as a browser-side wpautop clone.
 *
 * @param content Serialized Classic post content.
 */
function canVerifyClassicMissingAnchor( content: string ): boolean {
	const withoutExplicitParagraphs = content.replace(
		/<p(?:\s[^>]*)?>[\s\S]*?<\/p\s*>/gi,
		''
	);
	const withoutWpautopBlockBoundaries = withoutExplicitParagraphs.replace(
		/<\/?(?:table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|area|blockquote|address|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|footer|nav|figure|figcaption|details|menu|summary)\b[^>]*>/gi,
		''
	);

	return /^[\t\n\f\r ]*$/.test( withoutWpautopBlockBoundaries );
}

/**
 * Inspect a saved post/page body for the requested paragraph anchor.
 *
 * Gutenberg content counts only top-level core/paragraph blocks. Content
 * without block delimiters uses the browser HTML parser and counts explicit p
 * elements. Existing elements can prove an anchor available, while a missing
 * result is reported only when no remaining source could be paragraphized by
 * wpautop. Parser failures and ambiguous Classic source are unavailable.
 *
 * @param content         Serialized target post/page content.
 * @param paragraphNumber Requested top-level paragraph number.
 */
export function inspectParagraphAnchor(
	content: string,
	paragraphNumber: number
): ParagraphAnchorInspection {
	if ( ! isValidParagraphNumber( paragraphNumber ) ) {
		return { state: 'unavailable' };
	}

	if ( /<!--\s+wp:/i.test( content ) ) {
		try {
			if ( ! serializedBlockNamesAreRegistered( content ) ) {
				return { state: 'unavailable' };
			}

			const blocks = parse( content );
			if ( blocks.length === 0 || ! blocksAreReliable( blocks ) ) {
				return { state: 'unavailable' };
			}

			const paragraphCount = blocks.filter(
				( block ) => block.name === 'core/paragraph'
			).length;

			return {
				state:
					paragraphCount >= paragraphNumber ? 'available' : 'missing',
				source: 'blocks',
				paragraphCount,
			};
		} catch {
			return { state: 'unavailable' };
		}
	}

	if ( typeof DOMParser === 'undefined' ) {
		return { state: 'unavailable' };
	}
	if ( ! /<p(?:\s|>)/i.test( content ) ) {
		return { state: 'unavailable' };
	}

	try {
		const paragraphCount = selectHtmlElements( content, 'p' ).length;
		if ( paragraphCount >= paragraphNumber ) {
			return {
				state: 'available',
				source: 'html',
				paragraphCount,
			};
		}
		if ( ! canVerifyClassicMissingAnchor( content ) ) {
			return { state: 'unavailable' };
		}

		return {
			state: 'missing',
			source: 'html',
			paragraphCount,
		};
	} catch {
		return { state: 'unavailable' };
	}
}

function effectiveSelectedIds( rule: PromotionOverlapRule ): number[] {
	const excludedIds = new Set( rule.excludeIds );

	return [ ...new Set( rule.includeIds ) ].filter(
		( id ) => id > 0 && ! excludedIds.has( id )
	);
}

function scopeHasPossibleTargets( rule: PromotionOverlapRule ): boolean {
	if ( rule.contentScope === 'selected' ) {
		return effectiveSelectedIds( rule ).length > 0;
	}

	if ( rule.contentScope !== 'terms' ) {
		return true;
	}

	return rule.termsValid && rule.categoryIds.length + rule.tagIds.length > 0;
}

function contentScopesMayOverlap(
	candidate: PromotionOverlapRule,
	published: PromotionOverlapRule
): boolean {
	if (
		! scopeHasPossibleTargets( candidate ) ||
		! scopeHasPossibleTargets( published )
	) {
		return false;
	}

	if (
		candidate.contentScope === 'selected' &&
		published.contentScope === 'selected'
	) {
		const publishedIds = new Set( effectiveSelectedIds( published ) );

		return effectiveSelectedIds( candidate ).some( ( id ) =>
			publishedIds.has( id )
		);
	}

	if (
		candidate.contentScope === 'selected' ||
		published.contentScope === 'selected'
	) {
		const selected =
			candidate.contentScope === 'selected' ? candidate : published;
		const broad =
			candidate.contentScope === 'selected' ? published : candidate;
		const broadExclusions = new Set( broad.excludeIds );

		return effectiveSelectedIds( selected ).some(
			( id ) => ! broadExclusions.has( id )
		);
	}

	if (
		candidate.contentScope === 'all' ||
		published.contentScope === 'all'
	) {
		return true;
	}

	if (
		( candidate.contentScope === 'posts' &&
			published.contentScope === 'pages' ) ||
		( candidate.contentScope === 'pages' &&
			published.contentScope === 'posts' ) ||
		( candidate.contentScope === 'pages' &&
			published.contentScope === 'terms' ) ||
		( candidate.contentScope === 'terms' &&
			published.contentScope === 'pages' )
	) {
		return false;
	}

	// Different category/tag sets may still match the same multi-term post.
	return true;
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
					if ( candidate.location === 'content_after_paragraph' ) {
						const candidateParagraph = effectiveParagraphNumber(
							candidate.paragraphNumber
						);
						const publishedParagraph = effectiveParagraphNumber(
							published.paragraphNumber
						);
						if (
							! isValidParagraphNumber( candidateParagraph ) ||
							! isValidParagraphNumber( publishedParagraph ) ||
							candidateParagraph !== publishedParagraph
						) {
							return false;
						}
					}

					return (
						devicesMayOverlap( candidate, published ) &&
						schedulesMayOverlap( candidate, published ) &&
						contentScopesMayOverlap( candidate, published )
					);
				} )
				.map( ( published ) => published.id as number )
		),
	];
}

export function getPromotionPreflightIssues( {
	content,
	location = 'content_after',
	contentScope,
	includeIds,
	excludeIds,
	categoryIds = [],
	tagIds = [],
	paragraphNumber,
	startAt,
	endAt,
}: PromotionPreflightInput ): PromotionPreflightIssueCode[] {
	const issues: PromotionPreflightIssueCode[] = [];

	if ( hasVideoWithoutValidSource( content ) ) {
		issues.push( 'video_source_missing' );
	} else if ( ! hasMeaningfulPromotionContent( content ) ) {
		issues.push( 'empty_content' );
	}

	const hasEligibleTarget = includeIds.some(
		( id ) => ! excludeIds.includes( id )
	);
	if ( contentScope === 'selected' && ! hasEligibleTarget ) {
		issues.push( 'selected_scope_without_targets' );
	}
	if (
		contentScope === 'terms' &&
		categoryIds.length === 0 &&
		tagIds.length === 0
	) {
		issues.push( 'terms_scope_without_terms' );
	}

	if (
		location === 'content_after_paragraph' &&
		! isValidParagraphNumber( effectiveParagraphNumber( paragraphNumber ) )
	) {
		issues.push( 'invalid_paragraph_number' );
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
