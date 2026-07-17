/**
 * Attach a current-document-only close action to rendered Promotion bars.
 *
 * No dismissal state is persisted. A later navigation receives the normal
 * server-rendered bar again and remains independent of caches or consent state.
 *
 * @param root Event target used by the current document.
 * @return Cleanup callback.
 */
export function attachPageBarDismissal(
	root: Document = document
): () => void {
	const dismiss = ( event: Event ) => {
		if ( ! ( event.target instanceof Element ) ) {
			return;
		}

		const button = event.target.closest( '[data-npcink-ad-dismiss]' );
		const bar = button?.closest( '[data-npcink-ad-bar]' );
		if ( bar instanceof HTMLElement ) {
			bar.querySelectorAll< HTMLMediaElement >( 'audio, video' ).forEach(
				( media ) => media.pause()
			);
			bar.hidden = true;
		}
	};

	root.addEventListener( 'click', dismiss );

	return () => root.removeEventListener( 'click', dismiss );
}
