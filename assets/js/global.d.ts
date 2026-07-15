declare module '*.css';

interface Window {
	NpcinkAdEditorSettings?: {
		previewUrl: string;
		nonce: string;
		defaultTargetId: number;
		publicContentIds: number[];
		publishedAutomaticPromotions: Array< {
			id: number;
			location: 'content_before' | 'content_after';
			pageScope: 'all' | 'selected';
			includeIds: number[];
			excludeIds: number[];
			device: 'all' | 'desktop' | 'mobile';
			startAt: string;
			endAt: string;
			scheduleValid: boolean;
		} >;
	};
}
