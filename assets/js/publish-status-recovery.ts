export type PublishTargetStatus = 'publish' | 'future';

export interface PublishStatusRecoverySnapshot {
	isSaving: boolean;
	isAutosaving: boolean;
	persistedStatus: string;
	editedStatus: string;
}

export interface PublishStatusRecoveryState {
	wasNonAutosaveSaving: boolean;
	attemptedStatus: PublishTargetStatus | null;
}

export interface PublishStatusRecoveryTransition {
	state: PublishStatusRecoveryState;
	restoreStatus: string | null;
}

const publishTargetStatuses = new Set< PublishTargetStatus >( [
	'publish',
	'future',
] );

export function createPublishStatusRecoveryState(): PublishStatusRecoveryState {
	return {
		wasNonAutosaveSaving: false,
		attemptedStatus: null,
	};
}

/**
 * Track one public-status save attempt across its real saving transition.
 *
 * A pre-save filter can reject after the editor starts saving but before
 * core-data makes a request. Completion is therefore determined by whether
 * the Core persisted status reached the attempted status, not by a core-data
 * request-error flag.
 *
 * @param state    Previous transition state.
 * @param snapshot Current public editor-store values.
 */
export function advancePublishStatusRecovery(
	state: PublishStatusRecoveryState,
	snapshot: PublishStatusRecoverySnapshot
): PublishStatusRecoveryTransition {
	const isNonAutosaveSaving = snapshot.isSaving && ! snapshot.isAutosaving;
	let attemptedStatus = state.attemptedStatus;
	let restoreStatus: string | null = null;

	if ( ! state.wasNonAutosaveSaving && isNonAutosaveSaving ) {
		attemptedStatus =
			publishTargetStatuses.has(
				snapshot.editedStatus as PublishTargetStatus
			) && snapshot.editedStatus !== snapshot.persistedStatus
				? ( snapshot.editedStatus as PublishTargetStatus )
				: null;
	} else if ( state.wasNonAutosaveSaving && ! isNonAutosaveSaving ) {
		if (
			attemptedStatus !== null &&
			snapshot.editedStatus === attemptedStatus &&
			snapshot.persistedStatus !== '' &&
			snapshot.persistedStatus !== attemptedStatus
		) {
			restoreStatus = snapshot.persistedStatus;
		}

		attemptedStatus = null;
	} else if ( ! isNonAutosaveSaving ) {
		attemptedStatus = null;
	}

	return {
		state: {
			wasNonAutosaveSaving: isNonAutosaveSaving,
			attemptedStatus,
		},
		restoreStatus,
	};
}
