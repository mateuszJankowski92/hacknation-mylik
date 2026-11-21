import { useState, type MouseEvent } from 'react';
import type { VerificationRecord } from '../../../src/contracts/record';
import { pickLayoutEvidence } from '../../../src/render/layout';
import { DRAFT_KEY, FOCUS_FIELD_KEY, navigate, recordUrlPath } from '../route';
import { Link } from './Link';
import './sheet.css';
import { nb } from '../typography';

type CopyStatus = 'idle' | 'copied' | 'failed';

export const RESULT_ACTION_TEXTS = {
	source: 'Zobacz źródło',
	rephrase: 'Zapytaj inaczej',
	copy: 'Kopiuj link',
	next: 'Sprawdź następną',
	share: 'Wyślij dalej',
	opensInNewTab: ' (otworzy się w nowej karcie)',
	copied: 'Link skopiowany.',
} as const;

export function absoluteRecordUrl(id: string): string {
	return `${window.location.origin}${recordUrlPath(id)}`;
}

export function mainSourceUrl(record: VerificationRecord): string | null {
	for (const claim of record.claims) {
		const evidence = pickLayoutEvidence(claim) ?? claim.evidence[0];
		if (evidence?.source.url) return evidence.source.url;
	}
	return null;
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
	return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function ResultActions({ record, question }: { record: VerificationRecord; question: string }) {
	const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
	const [shareFailed, setShareFailed] = useState(false);
	const id = record.id;
	const link = absoluteRecordUrl(id);
	const sourceUrl = mainSourceUrl(record);
	const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(link);
			setCopyStatus('copied');
		} catch {
			setCopyStatus('failed');
		}
	}

	async function shareLink() {
		setShareFailed(false);
		try {
			await navigator.share({
				title: 'Mylik: sprawdzona informacja',
				text: 'Zobacz, co o tej informacji mówią źródła.',
				url: link,
			});
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			setShareFailed(true);
		}
	}

	function backToForm(event: MouseEvent<HTMLAnchorElement>, draft: string) {
		if (isModifiedClick(event)) return;
		event.preventDefault();
		navigate('/', { state: { [DRAFT_KEY]: draft, [FOCUS_FIELD_KEY]: true } });
	}

	return (
		<section className="result-actions" aria-label="Co dalej z tym wynikiem">
			<div className="result-actions__buttons">
				{sourceUrl && (
					<a className="button" href={sourceUrl} target="_blank" rel="noopener noreferrer">
						{RESULT_ACTION_TEXTS.source}
						<span className="visually-hidden">{RESULT_ACTION_TEXTS.opensInNewTab}</span>
					</a>
				)}
				<Link to="/" className="button" onClick={(event) => backToForm(event, question)}>
					{RESULT_ACTION_TEXTS.rephrase}
				</Link>
				<button type="button" className="button" onClick={copyLink}>
					{RESULT_ACTION_TEXTS.copy}
				</button>
			</div>
			<div className="result-actions__next">
				<Link to="/" className="button button--primary" onClick={(event) => backToForm(event, '')}>
					{RESULT_ACTION_TEXTS.next}
				</Link>
			</div>
			{canShare && (
				<div className="result-actions__more">
					<button type="button" className="text-button" onClick={shareLink}>
						{RESULT_ACTION_TEXTS.share}
					</button>
				</div>
			)}
			<p className="result-actions__status" role="status" aria-live="polite">
				{copyStatus === 'copied' && RESULT_ACTION_TEXTS.copied}
				{copyStatus === 'failed' && nb('Nie udało się skopiować. Zaznacz adres poniżej i skopiuj go ręcznie.')}
				{shareFailed && nb('Nie udało się wysłać. Skopiuj link i wyślij go sam.')}
			</p>
			{copyStatus === 'failed' && (
				<p className="result-actions__link">
					<label htmlFor="result-link" className="visually-hidden">
						Adres tego sprawdzenia
					</label>
					<input id="result-link" type="text" readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
				</p>
			)}
		</section>
	);
}
