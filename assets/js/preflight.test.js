import {
	getBlockType,
	registerBlockType,
	unregisterBlockType,
} from '@wordpress/blocks';

import {
	contentScopeForPlacement,
	effectiveParagraphNumber,
	getEffectivePromotionTargetIds,
	getEffectivePromotionTermSelection,
	getPotentiallyOverlappingPromotionIds,
	getPromotionPreflightIssues,
	hasUnmutedAutoplayVideo,
	inspectParagraphAnchor,
} from './preflight';

describe( 'contentScopeForPlacement', () => {
	test.each( [ 'posts', 'pages', 'terms' ] )(
		'resets automatic %s scope for manual block placement',
		( contentScope ) => {
			expect( contentScopeForPlacement( contentScope, 'block' ) ).toBe(
				'all'
			);
		}
	);

	test( 'preserves manual-safe and automatic-placement scopes', () => {
		expect( contentScopeForPlacement( 'all', 'block' ) ).toBe( 'all' );
		expect( contentScopeForPlacement( 'selected', 'block' ) ).toBe(
			'selected'
		);
		expect( contentScopeForPlacement( 'terms', 'content_after' ) ).toBe(
			'terms'
		);
	} );
} );

/**
 * Build one complete automatic Promotion rule.
 *
 * @param {Object} overrides Rule values to replace.
 * @return {Object} Complete test rule.
 */
function promotionRule( overrides = {} ) {
	return {
		id: 1,
		location: 'content_after',
		contentScope: 'all',
		includeIds: [],
		excludeIds: [],
		categoryIds: [],
		tagIds: [],
		termsValid: true,
		device: 'all',
		paragraphNumber: 3,
		startAt: '',
		endAt: '',
		scheduleValid: true,
		...overrides,
	};
}

describe( 'getPotentiallyOverlappingPromotionIds', () => {
	test( 'mirrors automatic location, device, validity, and half-open schedule gates', () => {
		const candidate = promotionRule( {
			device: 'desktop',
			startAt: '2027-01-01 00:00:00',
			endAt: '2027-01-10 00:00:00',
		} );

		expect(
			getPotentiallyOverlappingPromotionIds( candidate, [
				promotionRule( { id: 2 } ),
				promotionRule( { id: 2 } ),
				promotionRule( { id: 3, location: 'content_before' } ),
				promotionRule( { id: 4, device: 'mobile' } ),
				promotionRule( {
					id: 5,
					startAt: '2027-01-10 00:00:00',
				} ),
				promotionRule( { id: 6, scheduleValid: false } ),
				promotionRule( { id: 1 } ),
			] )
		).toEqual( [ 2 ] );
	} );

	test( 'compares effective selected IDs after both exclusions', () => {
		const candidate = promotionRule( {
			contentScope: 'selected',
			includeIds: [ 10, 11 ],
			excludeIds: [ 11 ],
		} );

		expect(
			getPotentiallyOverlappingPromotionIds( candidate, [
				promotionRule( {
					id: 2,
					contentScope: 'selected',
					includeIds: [ 11, 12 ],
				} ),
				promotionRule( {
					id: 3,
					contentScope: 'selected',
					includeIds: [ 10 ],
				} ),
				promotionRule( { id: 4, excludeIds: [ 10 ] } ),
				promotionRule( { id: 5, excludeIds: [ 11 ] } ),
			] )
		).toEqual( [ 3, 5 ] );
	} );

	test( 'applies all-scope exclusions to the other selected rule', () => {
		const candidate = promotionRule( { excludeIds: [ 10 ] } );

		expect(
			getPotentiallyOverlappingPromotionIds( candidate, [
				promotionRule( {
					id: 2,
					contentScope: 'selected',
					includeIds: [ 10, 11 ],
					excludeIds: [ 11 ],
				} ),
				promotionRule( {
					id: 3,
					contentScope: 'selected',
					includeIds: [ 12 ],
				} ),
			] )
		).toEqual( [ 3 ] );
	} );

	test( 'never warns for manual block placement', () => {
		expect(
			getPotentiallyOverlappingPromotionIds(
				promotionRule( { location: 'block' } ),
				[ promotionRule( { id: 2 } ) ]
			)
		).toEqual( [] );
	} );

	test( 'page bars overlap only at the same bar location', () => {
		expect(
			getPotentiallyOverlappingPromotionIds(
				promotionRule( { location: 'bar_top' } ),
				[
					promotionRule( { id: 2, location: 'bar_top' } ),
					promotionRule( { id: 3, location: 'bar_bottom' } ),
					promotionRule( { id: 4, location: 'content_before' } ),
				]
			)
		).toEqual( [ 2 ] );
	} );

	test( 'paragraph placement overlaps only at the same valid effective anchor', () => {
		const candidate = promotionRule( {
			location: 'content_after_paragraph',
			paragraphNumber: 3,
		} );

		expect(
			getPotentiallyOverlappingPromotionIds( candidate, [
				promotionRule( {
					id: 2,
					location: 'content_after_paragraph',
					paragraphNumber: 3,
				} ),
				promotionRule( {
					id: 3,
					location: 'content_after_paragraph',
					paragraphNumber: 4,
				} ),
				promotionRule( {
					id: 4,
					location: 'content_after_paragraph',
					paragraphNumber: 0,
				} ),
				promotionRule( {
					id: 5,
					location: 'content_after_paragraph',
					paragraphNumber: undefined,
				} ),
				promotionRule( { id: 6 } ),
			] )
		).toEqual( [ 2, 5 ] );

		expect(
			getPotentiallyOverlappingPromotionIds(
				{ ...candidate, paragraphNumber: 21 },
				[
					promotionRule( {
						id: 2,
						location: 'content_after_paragraph',
						paragraphNumber: 21,
					} ),
				]
			)
		).toEqual( [] );
	} );

	test( 'proves disjoint canonical post, page, and term scopes', () => {
		expect(
			getPotentiallyOverlappingPromotionIds(
				promotionRule( { contentScope: 'posts' } ),
				[
					promotionRule( { id: 2, contentScope: 'pages' } ),
					promotionRule( {
						id: 3,
						contentScope: 'terms',
						categoryIds: [ 10 ],
					} ),
					promotionRule( { id: 4 } ),
				]
			)
		).toEqual( [ 3, 4 ] );

		expect(
			getPotentiallyOverlappingPromotionIds(
				promotionRule( { contentScope: 'pages' } ),
				[
					promotionRule( { id: 2, contentScope: 'posts' } ),
					promotionRule( {
						id: 3,
						contentScope: 'terms',
						categoryIds: [ 10 ],
					} ),
					promotionRule( { id: 4 } ),
				]
			)
		).toEqual( [ 4 ] );
	} );

	test( 'keeps different valid term sets conservative and ignores invalid terms', () => {
		const candidate = promotionRule( {
			contentScope: 'terms',
			categoryIds: [ 10 ],
		} );

		expect(
			getPotentiallyOverlappingPromotionIds( candidate, [
				promotionRule( {
					id: 2,
					contentScope: 'terms',
					tagIds: [ 20 ],
				} ),
				promotionRule( {
					id: 3,
					contentScope: 'terms',
					categoryIds: [ 10 ],
					termsValid: false,
				} ),
			] )
		).toEqual( [ 2 ] );

		expect(
			getPotentiallyOverlappingPromotionIds(
				{ ...candidate, termsValid: false },
				[ promotionRule( { id: 2 } ) ]
			)
		).toEqual( [] );
		expect(
			getPotentiallyOverlappingPromotionIds(
				{ ...candidate, categoryIds: [] },
				[ promotionRule( { id: 2 } ) ]
			)
		).toEqual( [] );
	} );
} );

describe( 'current Promotion term normalization', () => {
	test( 'confirms stored and session-selected terms without hiding invalid IDs', () => {
		expect(
			getEffectivePromotionTermSelection(
				[ 10, 99, 10 ],
				[ 20 ],
				[ 10 ],
				[ 20 ]
			)
		).toEqual( {
			categoryIds: [ 10 ],
			tagIds: [ 20 ],
			termsValid: false,
		} );

		expect(
			getEffectivePromotionTermSelection(
				[ 10, 99 ],
				[ 20 ],
				[ 10, 99 ],
				[ 20 ]
			)
		).toEqual( {
			categoryIds: [ 10, 99 ],
			tagIds: [ 20 ],
			termsValid: true,
		} );
	} );

	test( 'flags an empty effective terms scope without affecting other scopes', () => {
		expect(
			getPromotionPreflightIssues( {
				content: 'Creative',
				contentScope: 'terms',
				includeIds: [],
				excludeIds: [],
				categoryIds: [],
				tagIds: [],
			} )
		).toContain( 'terms_scope_without_terms' );

		expect(
			getPromotionPreflightIssues( {
				content: 'Creative',
				contentScope: 'posts',
				includeIds: [],
				excludeIds: [],
				categoryIds: [],
				tagIds: [],
			} )
		).not.toContain( 'terms_scope_without_terms' );
	} );
} );

describe( 'current Promotion target normalization', () => {
	test( 'invalid or custom-post-type IDs cannot satisfy preflight or overlap', () => {
		const effective = getEffectivePromotionTargetIds( [ 900 ], [], [] );

		expect(
			getPromotionPreflightIssues( {
				content: 'Creative',
				contentScope: 'selected',
				...effective,
			} )
		).toContain( 'selected_scope_without_targets' );
		expect(
			getPotentiallyOverlappingPromotionIds(
				promotionRule( {
					contentScope: 'selected',
					...effective,
				} ),
				[ promotionRule( { id: 2 } ) ]
			)
		).toEqual( [] );
	} );

	test( 'a confirmed public current ID can satisfy preflight and overlap', () => {
		const effective = getEffectivePromotionTargetIds(
			[ 10, 900 ],
			[],
			[ 10 ]
		);

		expect(
			getPromotionPreflightIssues( {
				content: 'Creative',
				contentScope: 'selected',
				...effective,
			} )
		).not.toContain( 'selected_scope_without_targets' );
		expect(
			getPotentiallyOverlappingPromotionIds(
				promotionRule( {
					contentScope: 'selected',
					...effective,
				} ),
				[
					promotionRule( {
						id: 2,
						contentScope: 'selected',
						includeIds: [ 10 ],
					} ),
				]
			)
		).toEqual( [ 2 ] );
	} );
} );

describe( 'video source preflight', () => {
	const promotionInput = ( content ) => ( {
		content,
		contentScope: 'all',
		includeIds: [],
		excludeIds: [],
	} );

	test.each( [
		[ 'an empty self-closing core Video block', '<!-- wp:video /-->' ],
		[
			'an empty explicit core namespace Video block',
			'<!-- wp:core/video /-->',
		],
		[
			'a paired core Video block without a source',
			'<!-- wp:video --><figure class="wp-block-video"><video controls></video></figure><!-- /wp:video -->',
		],
		[ 'a raw video without a source', '<video controls></video>' ],
		[
			'source text inside a double-quoted attribute',
			'<video title="foo src=/fake.mp4"></video>',
		],
		[
			'source text inside a single-quoted attribute',
			"<video title='foo src=https://example.com/fake.mp4'></video>",
		],
		[
			'a video whose source uses a blocked scheme',
			'<video src="javascript:alert(1)"></video>',
		],
		[
			'a video whose child source uses a blocked scheme',
			'<video><source src="data:video/mp4;base64,AAAA"></video>',
		],
		[
			'a video whose only source is a safe child element',
			'<video><source src="https://example.com/promotion.webm"></video>',
		],
		[
			'a core Video block whose only video is inside a template',
			'<!-- wp:video --><template><video src="promotion.mp4"></video></template><!-- /wp:video -->',
		],
		[
			'a video whose source uses the VBScript scheme',
			'<video src="vbscript:msgbox(1)"></video>',
		],
		[
			'a video whose blocked scheme uses character references',
			'<video src="java&#x73;cript&colon;alert(1)"></video>',
		],
		[
			'a video whose blocked scheme uses a control character reference',
			'<video src="jav&#x0D;ascript:alert(1)"></video>',
		],
		[
			'an otherwise safe source with a trailing line-feed reference',
			'<video src="https://example.com/promotion.mp4&#10;"></video>',
		],
		[
			'a video whose blocked scheme is double encoded',
			'<video src="java&amp;#x73;cript:alert(1)"></video>',
		],
		[
			'a video whose blocked scheme contains a null entity',
			'<video src="java&#0;script:alert(1)"></video>',
		],
		[
			'a bare relative video source',
			'<video src="media/promotion.mp4"></video>',
		],
		[
			'a parent-relative video source',
			'<video src="../media/promotion.mp4"></video>',
		],
		[
			'a protocol-relative video source',
			'<video src="//cdn.example.com/promotion.mp4"></video>',
		],
		[
			'a colon in a relative video path',
			'<video src="./media/foo:bar.mp4"></video>',
		],
		[ 'an HTTP scheme without a host', '<video src="http://"></video>' ],
		[ 'an HTTPS scheme without a host', '<video src="https://"></video>' ],
		[ 'the site root without a media path', '<video src="/"></video>' ],
		[ 'a colon-only host', '<video src="https://:/x.mp4"></video>' ],
		[
			'an empty host after userinfo',
			'<video src="https://@/x.mp4"></video>',
		],
		[
			'a non-numeric port',
			'<video src="https://host:bad/x.mp4"></video>',
		],
		[
			'an out-of-range port',
			'<video src="https://host:99999/x.mp4"></video>',
		],
		[
			'an invalid encoded host',
			'<video src="https://%zz/x.mp4"></video>',
		],
		[
			'a repaired triple-slash URL',
			'<video src="https:///evil.example/x.mp4"></video>',
		],
		[
			'a repaired single-slash URL',
			'<video src="https:/evil.example/x.mp4"></video>',
		],
		[
			'a repaired slash-less URL',
			'<video src="https:evil.example/x.mp4"></video>',
		],
		[
			'a backslash authority URL',
			'<video src="https:\\evil.example\\x.mp4"></video>',
		],
		[
			'an out-of-range IPv4 host',
			'<video src="https://256.256.256.256/x.mp4"></video>',
		],
	] )(
		'blocks publishing for %s without also reporting empty content',
		( _, content ) => {
			expect(
				getPromotionPreflightIssues( promotionInput( content ) )
			).toEqual( [ 'video_source_missing' ] );
		}
	);

	test.each( [
		[
			'an absolute-path video source',
			'<video src="/wp-content/uploads/promotion.mp4"></video>',
		],
		[
			'an HTTP video source',
			'<video src="http://example.com/promotion.mp4"></video>',
		],
		[
			'a paired core Video block with an HTTPS source',
			'<!-- wp:video --><figure class="wp-block-video"><video src="https://example.com/promotion.mp4"></video></figure><!-- /wp:video -->',
		],
		[
			'a local HTTP source with a port',
			'<video src="http://localhost:8080/promotion.mp4"></video>',
		],
		[
			'an IPv4 HTTPS source',
			'<video src="https://127.0.0.1/promotion.mp4"></video>',
		],
		[
			'a real source after source text in another attribute',
			'<video title="greater > src=/fake.mp4" src="/promotion.mp4"></video>',
		],
	] )( 'accepts %s', ( _, content ) => {
		expect(
			getPromotionPreflightIssues( promotionInput( content ) )
		).toEqual( [] );
	} );

	test.each( [
		[ 'a video-playlist block', '<!-- wp:video-playlist /-->' ],
		[ 'a core/video-poster block', '<!-- wp:core/video-poster /-->' ],
	] )(
		'does not misclassify %s as a source-less Video block',
		( _, block ) => {
			expect(
				getPromotionPreflightIssues(
					promotionInput( `<p>Promotion</p>${ block }` )
				)
			).toEqual( [] );
		}
	);

	test( 'reports one invalid video even when other text and video are valid', () => {
		const issues = getPromotionPreflightIssues(
			promotionInput(
				'<p>Promotion</p><video src="/valid.mp4"></video><video controls></video>'
			)
		);

		expect( issues ).toEqual( [ 'video_source_missing' ] );
	} );
} );

describe( 'video autoplay advisory', () => {
	test( 'identifies autoplay without a muted attribute', () => {
		expect(
			hasUnmutedAutoplayVideo(
				'<video autoplay src="/promotion.mp4"></video>'
			)
		).toBe( true );
	} );

	test.each( [
		'<video autoplay muted src="/promotion.mp4"></video>',
		'<video controls src="/promotion.mp4"></video>',
		'<!-- <video autoplay src="/promotion.mp4"></video> -->',
		'<template><video autoplay src="/promotion.mp4"></video></template>',
	] )( 'does not advise for %s', ( content ) => {
		expect( hasUnmutedAutoplayVideo( content ) ).toBe( false );
	} );
} );

describe( 'paragraph placement preflight', () => {
	test.each( [ 0, 21, 2.5 ] )(
		'preserves explicit invalid value %s as an error',
		( paragraphNumber ) => {
			expect( effectiveParagraphNumber( paragraphNumber ) ).toBe(
				paragraphNumber
			);
			expect(
				getPromotionPreflightIssues( {
					content: 'Creative',
					location: 'content_after_paragraph',
					contentScope: 'all',
					includeIds: [],
					excludeIds: [],
					paragraphNumber,
				} )
			).toContain( 'invalid_paragraph_number' );
		}
	);

	test.each( [ undefined, 1, 20 ] )(
		'accepts bounded value %s and defaults only missing metadata',
		( paragraphNumber ) => {
			expect(
				getPromotionPreflightIssues( {
					content: 'Creative',
					location: 'content_after_paragraph',
					contentScope: 'all',
					includeIds: [],
					excludeIds: [],
					paragraphNumber,
				} )
			).not.toContain( 'invalid_paragraph_number' );
		}
	);

	test( 'does not apply paragraph validation to other placements', () => {
		expect(
			getPromotionPreflightIssues( {
				content: 'Creative',
				location: 'content_after',
				contentScope: 'all',
				includeIds: [],
				excludeIds: [],
				paragraphNumber: 0,
			} )
		).not.toContain( 'invalid_paragraph_number' );
	} );
} );

describe( 'inspectParagraphAnchor', () => {
	const registeredForTest = [];

	beforeAll( () => {
		for ( const [ name, title ] of [
			[ 'core/paragraph', 'Paragraph' ],
			[ 'core/group', 'Group' ],
		] ) {
			if ( ! getBlockType( name ) ) {
				registerBlockType( name, {
					apiVersion: 3,
					title,
					category: 'text',
					save: () => null,
				} );
				registeredForTest.push( name );
			}
		}
	} );

	afterAll( () => {
		for ( const name of registeredForTest ) {
			unregisterBlockType( name );
		}
	} );

	test( 'counts only top-level Gutenberg paragraph blocks', () => {
		const content = [
			'<!-- wp:paragraph /-->',
			'<!-- wp:group -->',
			'<!-- wp:paragraph /-->',
			'<!-- /wp:group -->',
			'<!-- wp:paragraph /-->',
		].join( '' );

		expect( inspectParagraphAnchor( content, 2 ) ).toEqual( {
			state: 'available',
			source: 'blocks',
			paragraphCount: 2,
		} );
		expect( inspectParagraphAnchor( content, 3 ) ).toEqual( {
			state: 'missing',
			source: 'blocks',
			paragraphCount: 2,
		} );
	} );

	test( 'counts actual paragraph elements in Classic HTML', () => {
		const content = '<p>One</p><section><p>Two</p></section>';

		expect( inspectParagraphAnchor( content, 2 ) ).toEqual( {
			state: 'available',
			source: 'html',
			paragraphCount: 2,
		} );
		expect( inspectParagraphAnchor( content, 3 ) ).toEqual( {
			state: 'missing',
			source: 'html',
			paragraphCount: 2,
		} );
	} );

	test.each( [
		[ 'separated plain text', '<p>One</p>\n\nTwo' ],
		[ 'adjacent plain text', '<p>One</p>Inline' ],
		[ 'an inline element', '<p>One</p><span>Two</span>' ],
	] )(
		'reports Classic content with %s as unavailable instead of false missing',
		( _description, content ) => {
			expect( inspectParagraphAnchor( content, 2 ) ).toEqual( {
				state: 'unavailable',
			} );
		}
	);

	test( 'keeps a verified Classic anchor available despite ambiguous trailing content', () => {
		const content = '<p>One</p><p>Two</p>\n\nThree';

		expect( inspectParagraphAnchor( content, 2 ) ).toEqual( {
			state: 'available',
			source: 'html',
			paragraphCount: 2,
		} );
	} );

	test( 'does not claim wpautop-dependent plain text has a missing anchor', () => {
		expect( inspectParagraphAnchor( 'One\n\nTwo', 3 ) ).toEqual( {
			state: 'unavailable',
		} );
	} );

	test( 'reports unregistered Gutenberg content as unavailable', () => {
		expect(
			inspectParagraphAnchor( '<!-- wp:unknown/widget /-->', 1 )
		).toEqual( {
			state: 'unavailable',
		} );
	} );
} );
