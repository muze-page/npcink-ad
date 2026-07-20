/* @jsxRuntime classic */

import * as React from 'react';
import { Button, Spinner } from '@wordpress/components';

interface SelectionCardProps {
	clearLabel?: string;
	clearText?: string;
	isLoading?: boolean;
	label: string;
	onClear?: () => void;
	testId?: string;
	value: string;
}

/**
 * Present one current single-selection value separately from its search action.
 *
 * @param root0            Current selection-card properties.
 * @param root0.clearLabel Accessible label for the optional clear action.
 * @param root0.clearText  Visible label for the optional clear action.
 * @param root0.isLoading  Whether the selected record is still loading.
 * @param root0.label      Short label describing the selected value.
 * @param root0.onClear    Optional clear callback.
 * @param root0.testId     Optional end-to-end test identifier.
 * @param root0.value      Current selected value.
 */
export function SelectionCard( {
	clearLabel,
	clearText,
	isLoading = false,
	label,
	onClear,
	testId,
	value,
}: SelectionCardProps ) {
	return (
		<div className="npcink-ad-selection-card" data-testid={ testId }>
			<div
				className="npcink-ad-selection-card__copy"
				role="status"
				aria-live="polite"
			>
				<span className="npcink-ad-selection-card__label">
					{ label }
				</span>
				<strong
					className="npcink-ad-selection-card__value"
					title={ value }
				>
					{ value }
				</strong>
			</div>
			{ isLoading && <Spinner /> }
			{ onClear && clearText && (
				<Button
					variant="tertiary"
					size="compact"
					onClick={ onClear }
					aria-label={ clearLabel }
				>
					{ clearText }
				</Button>
			) }
		</div>
	);
}
