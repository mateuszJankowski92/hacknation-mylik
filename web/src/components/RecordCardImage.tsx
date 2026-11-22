import { useState } from 'react';
import { VERDICT_LABELS_PL, type Verdict } from '../../../src/contracts/verdict';
import './record.css';

export function cardImagePath(id: string, claimNumber = 1): string {
	const base = `/api/records/${encodeURIComponent(id)}/card.svg`;
	return claimNumber > 1 ? `${base}?claim=${claimNumber}` : base;
}

type ShareState = 'idle' | 'copied' | 'shared' | 'failed';

/** Adres strony wyniku (bez parametrów): to on idzie do schowka i do okna udostępniania. */
function resultUrl(id: string): string {
	const origin = typeof window === 'undefined' ? '' : window.location.origin;
	return `${origin}/r/${encodeURIComponent(id)}`;
}

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

export function RecordCardImage({
	id,
	claimNumber = 1,
	verdict,
}: {
	id: string;
	claimNumber?: number;
	verdict?: Verdict;
}) {
	const [state, setState] = useState<ShareState>('idle');
	const src = cardImagePath(id, claimNumber);
	const downloadHref = `${src}${src.includes('?') ? '&' : '?'}download=1`;
	const alt = verdict
		? `Karta do udostępnienia. Ocena: ${VERDICT_LABELS_PL[verdict]}.`
		: 'Karta do udostępnienia.';

	async function copyLink() {
		setState((await copyText(resultUrl(id))) ? 'copied' : 'failed');
	}

	async function share() {
		const url = resultUrl(id);
		if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
			try {
				await navigator.share({ title: 'Mylik: wynik sprawdzenia', url });
				setState('shared');
				return;
			} catch {
				// Okno udostępniania zamknięte albo niedostępne: zostaje kopiowanie adresu.
			}
		}
		setState((await copyText(url)) ? 'copied' : 'failed');
	}

	return (
		<section className="record-card record-claim__group-block" aria-label="Karta do udostępnienia">
			<h2>Karta do udostępnienia</h2>
			<img className="record-card__image" src={src} alt={alt} width={1200} height={630} loading="lazy" />
			<div className="record-card__actions">
				<button type="button" className="button" onClick={share}>
					Udostępnij
				</button>
				<button type="button" className="button" onClick={copyLink}>
					Kopiuj link do wyniku
				</button>
				<a className="record-card__download" href={downloadHref} download={`mylik-${id.slice(0, 8)}.svg`}>
					Pobierz kartę
				</a>
			</div>
			<p className="record-card__status" role="status" aria-live="polite">
				{state === 'copied' && 'Skopiowałem link do schowka.'}
				{state === 'shared' && 'Otworzyłem okno udostępniania.'}
				{state === 'failed' && 'Nie udało się skopiować. Skopiuj adres z paska przeglądarki.'}
			</p>
		</section>
	);
}
