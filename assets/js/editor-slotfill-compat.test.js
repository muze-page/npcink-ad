import { selectEditorSlotFill } from './editor-slotfill-compat';

describe( 'selectEditorSlotFill', () => {
	test( 'prefers the current editor export', () => {
		const current = () => null;
		const legacy = () => null;

		expect( selectEditorSlotFill( current, legacy ) ).toBe( current );
	} );

	test( 'falls back to the legacy edit-post export', () => {
		const legacy = () => null;

		expect( selectEditorSlotFill( undefined, legacy ) ).toBe( legacy );
	} );
} );
