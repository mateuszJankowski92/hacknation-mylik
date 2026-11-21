import { useState } from 'react';
import { recordUrlPath } from '../route';
import { cardImagePath } from './RecordCardImage';
import './home.css';
import { nb } from '../typography';

type CopyStatus = 'idle' | 'copied' | 'failed';

export function absoluteRecordUrl(id: string): string {
	return `${window.location.origin}${recordUrlPath(id)}`;
}

export function ResultActions({ id }: { id: string }) {
	const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
	const [shareFailed, setShareFailed] = useState(false);
	const link = absoluteRecordUrl(id);
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

	const downloadHref = `${cardImagePath(id)}?download=1`;

	return (
		<section className="result-actions" aria-label="Udostępnianie wyniku">
			<h3>{nb('Pokaż to innym')}</h3>
			<div className="result-actions__buttons">
				<button type="button" className="button button--primary" onClick={copyLink}>
					Kopiuj link
				</button>
				{canShare && (
					<button type="button" className="button" onClick={shareLink}>
						Wyślij dalej
					</button>
				)}
				<a className="button" href={downloadHref} download={`mylik-${id.slice(0, 8)}.svg`}>
					Pobierz obraz-kartę
				</a>
			</div>
			<p className="result-actions__status" role="status" aria-live="polite">
				{copyStatus === 'copied' && 'Link skopiowany.'}
				{copyStatus === 'failed' && nb('Nie udało się skopiować. Zaznacz adres poniżej i skopiuj go ręcznie.')}
				{shareFailed && nb('Nie udało się wysłać. Skopiuj link i wyślij go sam.')}
			</p>
			<p className="result-actions__link">
				<label htmlFor="result-link" className="visually-hidden">
					Adres tego sprawdzenia
				</label>
				<input id="result-link" type="text" readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
			</p>
		</section>
	);
}
