import { useId, useState } from 'react';
import { Link } from '../components/Link';
import { nb } from '../typography';
import { setHistoryConsent, useHistoryConsent, type HistoryConsent } from './consent';
import './privacy.css';

export const CONSENT_TEXTS = {
	label: 'Prywatność',
	body: 'Mylik nie śledzi i nie używa plików cookie do reklam ani statystyk. Może zapamiętać w tej przeglądarce Twoje ostatnie sprawdzenia, żebyś łatwo do nich wrócił.',
	accept: 'Zapamiętuj',
	decline: 'Nie zapamiętuj',
	more: 'Więcej o prywatności',
	savedGranted: 'Zapisano wybór: zapamiętuję Twoje ostatnie sprawdzenia w tej przeglądarce.',
	savedDenied: 'Zapisano wybór: nie zapamiętuję. Usunąłem zapisane sprawdzenia z tej przeglądarki.',
} as const;

export function ConsentBanner() {
	const consent = useHistoryConsent();
	const [announcement, setAnnouncement] = useState('');
	const bodyId = useId();

	function choose(choice: Exclude<HistoryConsent, 'unset'>) {
		setHistoryConsent(choice);
		setAnnouncement(choice === 'granted' ? CONSENT_TEXTS.savedGranted : CONSENT_TEXTS.savedDenied);
		document.getElementById('main')?.focus();
	}

	return (
		<>
			{consent === 'unset' && (
				<section className="consent-banner" aria-label={CONSENT_TEXTS.label} aria-describedby={bodyId}>
					<p id={bodyId} className="consent-banner__text">
						{nb(CONSENT_TEXTS.body)}{' '}
						<Link to="/prywatnosc" className="consent-banner__more">
							{nb(CONSENT_TEXTS.more)}
						</Link>
					</p>
					<div className="consent-banner__actions">
						<button type="button" className="button" onClick={() => choose('granted')}>
							{CONSENT_TEXTS.accept}
						</button>
						<button type="button" className="button" onClick={() => choose('denied')}>
							{CONSENT_TEXTS.decline}
						</button>
					</div>
				</section>
			)}
			<p className="visually-hidden" role="status" aria-live="polite">
				{announcement}
			</p>
		</>
	);
}
