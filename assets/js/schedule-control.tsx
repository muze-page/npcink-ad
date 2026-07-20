/* @jsxRuntime classic */

import * as React from 'react';
import { TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export interface SiteBaseRecord {
	gmt_offset?: number | string;
	timezone_string?: string;
}

export function splitScheduleDateTime( value: string = '' ): {
	date: string;
	time: string;
} {
	return { date: value.slice( 0, 10 ), time: value.slice( 11, 16 ) };
}

export function combineScheduleDateTime( date: string, time: string ): string {
	if ( ! date ) {
		return '';
	}

	return `${ date } ${ time || '00:00' }:00`;
}

export function siteTimezoneLabel( site: SiteBaseRecord | null ): string {
	if ( site?.timezone_string?.trim() ) {
		return site.timezone_string.trim();
	}

	const offset = Number( site?.gmt_offset );
	if ( Number.isFinite( offset ) ) {
		const absoluteMinutes = Math.round( Math.abs( offset ) * 60 );
		const hours = String( Math.floor( absoluteMinutes / 60 ) ).padStart(
			2,
			'0'
		);
		const minutes = String( absoluteMinutes % 60 ).padStart( 2, '0' );
		const sign = offset >= 0 ? '+' : '-';

		return `UTC${ sign }${ hours }:${ minutes }`;
	}

	return __( 'configured in WordPress', 'npcink-ad' );
}

export function ScheduleDateTimeControl( {
	label,
	value,
	onChange,
	help,
	hasError,
}: {
	label: string;
	value: string | undefined;
	onChange: ( value: string ) => void;
	help: string;
	hasError: boolean;
} ) {
	const { date, time } = splitScheduleDateTime( value );

	return (
		<fieldset
			className={ `npcink-ad-schedule-control${
				hasError ? ' npcink-ad-control-error' : ''
			}` }
		>
			<legend className="components-base-control__label">
				{ label }
			</legend>
			<div className="npcink-ad-schedule-control__fields">
				<TextControl
					__next40pxDefaultSize
					type="date"
					label={ __( 'Date', 'npcink-ad' ) }
					value={ date }
					onChange={ ( nextDate ) =>
						onChange( combineScheduleDateTime( nextDate, time ) )
					}
				/>
				<TextControl
					__next40pxDefaultSize
					type="time"
					label={ __( 'Time', 'npcink-ad' ) }
					value={ time }
					disabled={ ! date }
					aria-invalid={ hasError }
					help={ help }
					onChange={ ( nextTime ) =>
						onChange( combineScheduleDateTime( date, nextTime ) )
					}
				/>
			</div>
		</fieldset>
	);
}
