import {
	advancePublishStatusRecovery,
	createPublishStatusRecoveryState,
} from './publish-status-recovery';

const idleDraft = {
	isSaving: false,
	isAutosaving: false,
	persistedStatus: 'draft',
	editedStatus: 'draft',
};

function advance( state, overrides = {} ) {
	return advancePublishStatusRecovery( state, {
		...idleDraft,
		...overrides,
	} );
}

describe( 'advancePublishStatusRecovery', () => {
	test.each( [ 'draft', 'auto-draft' ] )(
		'restores Core persisted %s status after a failed publish',
		( persistedStatus ) => {
			const started = advance( createPublishStatusRecoveryState(), {
				isSaving: true,
				persistedStatus,
				editedStatus: 'publish',
			} );

			expect( started.restoreStatus ).toBeNull();
			expect( started.state.attemptedStatus ).toBe( 'publish' );

			const finished = advance( started.state, {
				persistedStatus,
				editedStatus: 'publish',
			} );

			expect( finished.restoreStatus ).toBe( persistedStatus );
			expect( finished.state ).toEqual(
				createPublishStatusRecoveryState()
			);
		}
	);

	test( 'restores pending after a failed scheduling attempt', () => {
		const started = advance( createPublishStatusRecoveryState(), {
			isSaving: true,
			persistedStatus: 'pending',
			editedStatus: 'future',
		} );
		const finished = advance( started.state, {
			persistedStatus: 'pending',
			editedStatus: 'future',
		} );

		expect( finished.restoreStatus ).toBe( 'pending' );
	} );

	test.each( [
		[ 'publish', 'future' ],
		[ 'future', 'publish' ],
	] )(
		'restores %s after a failed transition to %s',
		( persistedStatus, editedStatus ) => {
			const started = advance( createPublishStatusRecoveryState(), {
				isSaving: true,
				persistedStatus,
				editedStatus,
			} );
			const finished = advance( started.state, {
				persistedStatus,
				editedStatus,
			} );

			expect( finished.restoreStatus ).toBe( persistedStatus );
		}
	);

	test.each( [
		[ 'absent', {} ],
		[ 'false', { didFail: false } ],
	] )(
		'restores a pre-save rejection when the core-data didFail signal is %s',
		( _description, failureSignal ) => {
			const started = advance( createPublishStatusRecoveryState(), {
				isSaving: true,
				editedStatus: 'publish',
			} );
			const finished = advance( started.state, {
				...failureSignal,
				editedStatus: 'publish',
			} );

			expect( finished.restoreStatus ).toBe( 'draft' );
		}
	);

	test( 'ignores stale idle status and waits for the next retry transition', () => {
		const idle = advance( createPublishStatusRecoveryState(), {
			editedStatus: 'publish',
		} );

		expect( idle.restoreStatus ).toBeNull();

		const retryStarted = advance( idle.state, {
			isSaving: true,
			editedStatus: 'publish',
		} );

		expect( retryStarted.restoreStatus ).toBeNull();
		expect( retryStarted.state.attemptedStatus ).toBe( 'publish' );

		const retrySucceeded = advance( retryStarted.state, {
			persistedStatus: 'publish',
			editedStatus: 'publish',
		} );

		expect( retrySucceeded.restoreStatus ).toBeNull();
	} );

	test.each( [ 'publish', 'future' ] )(
		'does not roll back a successful %s save',
		( targetStatus ) => {
			const started = advance( createPublishStatusRecoveryState(), {
				isSaving: true,
				editedStatus: targetStatus,
			} );
			const finished = advance( started.state, {
				persistedStatus: targetStatus,
				editedStatus: targetStatus,
			} );

			expect( finished.restoreStatus ).toBeNull();
		}
	);

	test( 'does not track autosaves, draft saves, or published updates', () => {
		const autosave = advance( createPublishStatusRecoveryState(), {
			isSaving: true,
			isAutosaving: true,
			editedStatus: 'publish',
		} );
		const draftSave = advance( createPublishStatusRecoveryState(), {
			isSaving: true,
			editedStatus: 'draft',
		} );
		const publishedUpdate = advance( createPublishStatusRecoveryState(), {
			isSaving: true,
			persistedStatus: 'publish',
			editedStatus: 'publish',
		} );
		const publishedUpdateFinished = advance( publishedUpdate.state, {
			persistedStatus: 'publish',
			editedStatus: 'publish',
		} );

		expect( autosave.state.attemptedStatus ).toBeNull();
		expect( draftSave.state.attemptedStatus ).toBeNull();
		expect( publishedUpdate.state.attemptedStatus ).toBeNull();
		expect( publishedUpdateFinished.restoreStatus ).toBeNull();
	} );

	test( 'does not overwrite a later status edit when a request finishes', () => {
		const started = advance( createPublishStatusRecoveryState(), {
			isSaving: true,
			editedStatus: 'publish',
		} );
		const finished = advance( started.state, {
			editedStatus: 'pending',
		} );

		expect( finished.restoreStatus ).toBeNull();
	} );
} );
