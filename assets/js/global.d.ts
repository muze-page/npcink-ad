declare module '*.css';

interface Window {
	NpcinkAdEditorSettings?: {
		previewUrl: string;
		nonce: string;
		defaultTargetId: number;
		publicContentIds: number[];
		publishedAutomaticPromotions: Array< {
			id: number;
			location:
				| 'content_before'
				| 'content_after'
				| 'content_after_paragraph';
			pageScope: 'all' | 'selected';
			includeIds: number[];
			excludeIds: number[];
			device: 'all' | 'desktop' | 'mobile';
			paragraphNumber: number;
			startAt: string;
			endAt: string;
			scheduleValid: boolean;
		} >;
	};
}
