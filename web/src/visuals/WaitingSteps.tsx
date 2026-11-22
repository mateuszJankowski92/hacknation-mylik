import { useEffect, useRef, type CSSProperties } from 'react';
import type { VerificationRecord } from '../../../src/contracts/record';
import type { Role } from '../roles/config';
import { currentRole } from '../roles/resolve';
import { useStage } from '../stage/StageContext';
import { StageSlot } from '../stage/StageSlot';
import { nb } from '../typography';
import { INITIAL_PROGRESS, type ProgressState } from './progress';
import { WAITING_TEXTS, WAITING_TIMING } from './waitingConfig';
import { cachedLines, waitingLines } from './waitingLines';
import './waiting.css';

export { WAITING_TEXTS };

export interface WaitingStepsProps {
	progress?: ProgressState;
	role?: Role;
	record?: VerificationRecord | null;
	cached?: boolean;
	ready?: boolean;
	onCancel?: () => void;
}

function passedQuotes(record: VerificationRecord | null | undefined): number | undefined {
	if (!record) return undefined;
	return record.claims.reduce((sum, result) => sum + result.evidence.length, 0);
}

export function WaitingSteps({
	progress = INITIAL_PROGRESS,
	role = currentRole(),
	record = null,
	cached = false,
	ready = false,
	onCancel,
}: WaitingStepsProps) {
	const { setProgress } = useStage();
	const sectionRef = useRef<HTMLElement>(null);

	useEffect(() => {
		sectionRef.current?.focus({ preventScroll: true });
	}, []);

	useEffect(() => {
		setProgress(progress);
	}, [progress, setProgress]);

	const lines = cached && record ? cachedLines(record.createdAt, progress.checkedAt) : waitingLines(progress, { passedQuotes: passedQuotes(record) });
	const style = {
		'--waiting-fade': `${WAITING_TIMING.homeFadeMs}ms`,
		'--waiting-steps-fade': `${WAITING_TIMING.stepsFadeMs}ms`,
	} as CSSProperties;

	return (
		<section ref={sectionRef} tabIndex={-1} className="waiting-steps" aria-label={WAITING_TEXTS.region} data-role={role} data-ready={ready ? 'true' : 'false'} style={style}>
			<div className="waiting-steps__scene">
				<StageSlot kind="foreground" />
			</div>
			<div className="waiting-steps__text">
				<div className="waiting-steps__stack" role="status" aria-live="polite">
					{lines.length === 0 && !ready && (
						<p className="waiting-steps__pending">
							<span className="visually-hidden">{WAITING_TEXTS.working}</span>
							<span className="waiting-steps__dots" aria-hidden="true" />
						</p>
					)}
					<ol className="waiting-steps__list">
						{lines.map((line) => (
							<li key={line.id} className="waiting-steps__line" data-status={line.status}>
								<span className="waiting-steps__mark" aria-hidden="true" />
								<span className="waiting-steps__text-line">{nb(line.text)}</span>
							</li>
						))}
					</ol>
					{ready && <p className="waiting-steps__ready">{WAITING_TEXTS.ready}</p>}
				</div>
				{!ready && onCancel && (
					<button type="button" className="waiting-steps__cancel" onClick={onCancel}>
						{WAITING_TEXTS.cancel}
					</button>
				)}
			</div>
		</section>
	);
}
