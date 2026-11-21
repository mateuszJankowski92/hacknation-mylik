import { useEffect, useState } from 'react';
import { DEFAULT_ETA_SECONDS } from '../api';
import { INITIAL_PROGRESS, describeProgress, progressSteps, type ProgressState } from './progress';
import './visuals.css';

export const WAITING_TEXTS = {
	overtime: 'To trwa dłużej niż zwykle. Jeszcze chwila.',
} as const;

const STEP_MARKS = { done: '✓', current: '…', waiting: '·' } as const;

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
}

export function WaitingSteps({ progress = INITIAL_PROGRESS, etaSeconds = DEFAULT_ETA_SECONDS, elapsedSeconds }: WaitingStepsProps) {
	const clock = useElapsedSeconds();
	const elapsed = elapsedSeconds ?? clock;
	const overtime = elapsed > etaSeconds;

	return (
		<section className="waiting-steps" aria-label="Postęp sprawdzania">
			<p className="waiting-steps__eta" role="status" aria-live="polite">
				{overtime ? WAITING_TEXTS.overtime : etaSentence(etaSeconds)}
			</p>
			<p className="waiting-steps__elapsed">Minęło: {elapsed} s</p>
			<ol className="waiting-steps__list">
				{progressSteps(progress).map((step) => (
					<li
						key={step.id}
						className={`waiting-steps__step waiting-steps__step--${step.status}`}
						aria-current={step.status === 'current' ? 'step' : undefined}
					>
						<span className="waiting-steps__mark" aria-hidden="true">
							{STEP_MARKS[step.status]}
						</span>
						<span>{step.text}</span>
					</li>
				))}
			</ol>
			<p className="waiting-steps__status" role="status" aria-live="polite">
				{describeProgress(progress)}
			</p>
		</section>
	);
}
