declare module '*.css';

interface Window {
	NpcinkAdEditorSettings?: {
		previewUrl: string;
		nonce: string;
		defaultTargetId: number;
		hasCompletedFirstPublish: boolean;
		promotionListUrl: string;
		publicContentIds: number[];
		validCategoryIds: number[];
		validTagIds: number[];
		hasAdvancedPageCache: boolean;
		publishedAutomaticPromotions: Array< {
			id: number;
			location:
				| 'content_before'
				| 'content_after'
				| 'content_after_paragraph'
				| 'bar_top'
				| 'bar_bottom';
			contentScope: 'all' | 'posts' | 'pages' | 'terms' | 'selected';
			includeIds: number[];
			excludeIds: number[];
			categoryIds: number[];
			tagIds: number[];
			termsValid: boolean;
			device: 'all' | 'desktop' | 'mobile';
			paragraphNumber: number;
			startAt: string;
			endAt: string;
			scheduleValid: boolean;
		} >;
	};
}
