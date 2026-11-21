import { useEffect, useState } from 'react';
import { DEFAULT_ETA_SECONDS } from '../api';
import { artAlt, type Role } from '../roles/config';
import { currentRole } from '../roles/resolve';
import { RoleArt } from '../roles/RoleArt';
import { INITIAL_PROGRESS, describeProgress, type ProgressState } from './progress';
import './visuals.css';

export const WAITING_TEXTS = {
	overtime: 'To trwa dłużej niż zwykle. Jeszcze chwila.',
} as const;

export function etaSentence(etaSeconds: number): string {
	return `Sprawdzam. Zwykle trwa to około ${etaSeconds} sekund.`;
}

function useElapsedSeconds(): number {
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		const startedAt = Date.now();
		const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
		return () => clearInterval(timer);
	}, []);
	return seconds;
}

export interface WaitingStepsProps {
	progress?: ProgressState;
	etaSeconds?: number;
	elapsedSeconds?: number;
	role?: Role;
}

export function WaitingSteps({
	progress = INITIAL_PROGRESS,
	etaSeconds = DEFAULT_ETA_SECONDS,
	elapsedSeconds,
	role = currentRole(),
}: WaitingStepsProps) {
	const clock = useElapsedSeconds();
	const elapsed = elapsedSeconds ?? clock;
	const overtime = elapsed > etaSeconds;

	return (
		<section className="waiting-steps" aria-label="Postęp sprawdzania" data-role={role}>
			<div className="waiting-steps__scene">
				<RoleArt owner={role} name="praca" alt={artAlt(role, 'praca')} className="waiting-steps__figure" />
			</div>
			<div className="waiting-steps__text">
				<p className="waiting-steps__status" role="status" aria-live="polite">
					{describeProgress(progress)}
				</p>
				<p className="waiting-steps__eta">{overtime ? WAITING_TEXTS.overtime : etaSentence(etaSeconds)}</p>
				<p className="waiting-steps__elapsed">Minęło: {elapsed} s</p>
			</div>
		</section>
	);
}
