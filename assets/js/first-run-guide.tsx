/* @jsxRuntime classic */

import * as React from 'react';
import { __ } from '@wordpress/i18n';

import { PluginDocumentSettingPanel } from './editor-panels';
import type { PromotionPreflightIssueCode } from './preflight';

type FirstRunGuideStepState = 'complete' | 'incomplete' | 'ready' | 'blocked';

export interface FirstRunGuideState {
	isVisible: boolean;
	content: FirstRunGuideStepState;
	delivery: FirstRunGuideStepState;
	previewAndPublish: FirstRunGuideStepState;
	hasPreviewTarget: boolean;
}

interface FirstRunGuideInput {
	deliveryNeedsAttention?: boolean;
	hasCompletedFirstPublish?: boolean;
	postStatus: string;
	preflightIssues: readonly PromotionPreflightIssueCode[];
	previewTargetId: number;
}

/**
 * Derive the first-run checklist from the same preflight result used by the
 * delivery panel and server-side publish validation. Scheduled Promotions have
 * already completed the publish flow, so they leave the checklist with
 * published Promotions.
 *
 * @param input                          Current checklist inputs.
 * @param input.deliveryNeedsAttention   Whether server-backed delivery data is invalid.
 * @param input.hasCompletedFirstPublish Whether this Promotion has completed its first publish.
 * @param input.postStatus               Persisted WordPress post status.
 * @param input.preflightIssues          Issues from the canonical editor preflight.
 * @param input.previewTargetId          Effective real-page preview target ID.
 */
export function getFirstRunGuideState( {
	deliveryNeedsAttention = false,
	hasCompletedFirstPublish = false,
	postStatus,
	preflightIssues,
	previewTargetId,
}: FirstRunGuideInput ): FirstRunGuideState {
	const isContentIssue = ( issue: PromotionPreflightIssueCode ) =>
		issue === 'empty_content' || issue === 'video_source_missing';
	const isVisible =
		! hasCompletedFirstPublish &&
		postStatus !== 'publish' &&
		postStatus !== 'future';
	const contentComplete = ! preflightIssues.some( isContentIssue );
	const deliveryComplete =
		! deliveryNeedsAttention && preflightIssues.every( isContentIssue );
	const hasPreviewTarget = previewTargetId > 0;

	return {
		isVisible,
		content: contentComplete ? 'complete' : 'incomplete',
		delivery: deliveryComplete ? 'complete' : 'incomplete',
		previewAndPublish:
			contentComplete && deliveryComplete && hasPreviewTarget
				? 'ready'
				: 'blocked',
		hasPreviewTarget,
	};
}

export function FirstRunGuide( { state }: { state: FirstRunGuideState } ) {
	if ( ! state.isVisible ) {
		return null;
	}

	let previewStatus: string = __( 'Next', 'npcink-ad' );
	if ( state.previewAndPublish === 'ready' ) {
		previewStatus = __( 'Ready', 'npcink-ad' );
	} else if (
		state.content === 'complete' &&
		state.delivery === 'complete' &&
		! state.hasPreviewTarget
	) {
		previewStatus = __( 'Choose a page', 'npcink-ad' );
	}

	return (
		<PluginDocumentSettingPanel
			name="npcink-ad-first-run"
			title={ __( 'Publish in three steps', 'npcink-ad' ) }
			className="npcink-ad-editor-panel npcink-ad-first-run-guide"
		>
			<p className="npcink-ad-first-run-guide__intro">
				{ __(
					'This checklist follows the current content and delivery preflight.',
					'npcink-ad'
				) }
			</p>
			<ol
				className="npcink-ad-first-run-guide__steps"
				data-testid="npcink-ad-first-run-guide"
			>
				<li
					data-testid="npcink-ad-first-run-step-content"
					data-state={ state.content }
				>
					<span
						className="npcink-ad-first-run-guide__number"
						aria-hidden="true"
					>
						1
					</span>
					<span className="npcink-ad-first-run-guide__label">
						{ __( 'Add promotion content', 'npcink-ad' ) }
					</span>
					<span className="npcink-ad-first-run-guide__status">
						{ state.content === 'complete'
							? __( 'Done', 'npcink-ad' )
							: __( 'Needs content', 'npcink-ad' ) }
					</span>
				</li>
				<li
					data-testid="npcink-ad-first-run-step-delivery"
					data-state={ state.delivery }
				>
					<span
						className="npcink-ad-first-run-guide__number"
						aria-hidden="true"
					>
						2
					</span>
					<span className="npcink-ad-first-run-guide__label">
						{ __( 'Confirm delivery rules', 'npcink-ad' ) }
					</span>
					<span className="npcink-ad-first-run-guide__status">
						{ state.delivery === 'complete'
							? __( 'Ready', 'npcink-ad' )
							: __( 'Needs attention', 'npcink-ad' ) }
					</span>
				</li>
				<li
					data-testid="npcink-ad-first-run-step-preview-publish"
					data-state={ state.previewAndPublish }
				>
					<span
						className="npcink-ad-first-run-guide__number"
						aria-hidden="true"
					>
						3
					</span>
					<span className="npcink-ad-first-run-guide__label">
						{ __( 'Preview a real page and publish', 'npcink-ad' ) }
					</span>
					<span className="npcink-ad-first-run-guide__status">
						{ previewStatus }
					</span>
				</li>
			</ol>
		</PluginDocumentSettingPanel>
	);
}
