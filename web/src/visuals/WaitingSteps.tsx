import { useEffect, useState } from 'react';
import { DEFAULT_ETA_SECONDS } from '../api';
import type { Role } from '../roles/config';
import { currentRole } from '../roles/resolve';
import { useStage } from '../stage/StageContext';
import { StageSlot } from '../stage/StageSlot';
import { nb } from '../typography';
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
	layout?: 'page' | 'hero';
}

export function WaitingSteps({
	progress = INITIAL_PROGRESS,
	etaSeconds = DEFAULT_ETA_SECONDS,
	elapsedSeconds,
	role = currentRole(),
	layout = 'page',
}: WaitingStepsProps) {
	const { setProgress } = useStage();
	const clock = useElapsedSeconds();
	const elapsed = elapsedSeconds ?? clock;
	const overtime = elapsed > etaSeconds;

	useEffect(() => {
		setProgress(progress);
	}, [progress, setProgress]);

	return (
		<section className={`waiting-steps waiting-steps--${layout}`} aria-label="Postęp sprawdzania" data-role={role}>
			<div className="waiting-steps__scene">
				<StageSlot kind="foreground" />
			</div>
			<div className="waiting-steps__text">
				<div className="waiting-steps__row">
					<p className="waiting-steps__status" role="status" aria-live="polite">
						{nb(describeProgress(progress))}
					</p>
					<p className="waiting-steps__elapsed">Minęło: {elapsed} s</p>
				</div>
				<p className="waiting-steps__eta">{nb(overtime ? WAITING_TEXTS.overtime : etaSentence(etaSeconds))}</p>
			</div>
		</section>
	);
}
