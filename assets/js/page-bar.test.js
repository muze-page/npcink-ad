import { attachPageBarDismissal } from './page-bar';

describe( 'page bar dismissal', () => {
	afterEach( () => {
		document.body.innerHTML = '';
		jest.restoreAllMocks();
	} );

	test( 'pauses media and hides only the selected bar for the current document', () => {
		document.body.innerHTML = `
			<div data-npcink-ad-bar id="first">
				<video></video>
				<button data-npcink-ad-dismiss><span id="icon">×</span></button>
			</div>
			<div data-npcink-ad-bar id="second"></div>
		`;
		const pause = jest
			.spyOn( window.HTMLMediaElement.prototype, 'pause' )
			.mockImplementation();
		const detach = attachPageBarDismissal();

		document.getElementById( 'icon' )?.click();

		expect( pause ).toHaveBeenCalledTimes( 1 );
		expect( document.getElementById( 'first' )?.hidden ).toBe( true );
		expect( document.getElementById( 'second' )?.hidden ).toBe( false );
		expect( document.cookie ).toBe( '' );
		detach();
	} );

	test( 'ignores unrelated clicks and supports cleanup', () => {
		document.body.innerHTML = `
			<div data-npcink-ad-bar id="bar">
				<button data-npcink-ad-dismiss id="dismiss">×</button>
			</div>
			<button id="unrelated">Other</button>
		`;
		const detach = attachPageBarDismissal();

		document.getElementById( 'unrelated' )?.click();
		expect( document.getElementById( 'bar' )?.hidden ).toBe( false );

		detach();
		document.getElementById( 'dismiss' )?.click();
		expect( document.getElementById( 'bar' )?.hidden ).toBe( false );
	} );
} );
