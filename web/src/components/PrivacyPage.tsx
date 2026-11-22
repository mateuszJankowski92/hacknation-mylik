import { useState } from 'react';
import { resetSettings } from '../a11y/settings';
import { useDocumentTitle } from '../documentTitle';
import { clearHistory } from '../history';
import { PRIVACY_STORAGE_KEY, setHistoryConsent, useHistoryConsent, type HistoryConsent } from '../privacy/consent';
import { nb } from '../typography';
import { Link } from './Link';
import './doc.css';

export const PRIVACY_DATE = '22.11.2026';
export const PRIVACY_TITLE = 'Prywatność - Mylik';

export const PRIVACY_TEXTS = {
	statusUnset: 'Jeszcze nie wybrano. Nie zapamiętuję Twoich sprawdzeń.',
	statusGranted: 'Zapamiętuję Twoje ostatnie sprawdzenia w tej przeglądarce.',
	statusDenied: 'Nie zapamiętuję Twoich sprawdzeń.',
	accept: 'Zapamiętuj',
	decline: 'Nie zapamiętuj',
	deleteHistory: 'Usuń zapisane sprawdzenia',
	deleteAll: 'Usuń wszystko z tej przeglądarki',
	savedGranted: 'Zapisano: zapamiętuję ostatnie sprawdzenia.',
	savedDenied: 'Zapisano: nie zapamiętuję. Zapisane sprawdzenia usunięto.',
	historyDeleted: 'Zapisane sprawdzenia usunięto.',
	allDeleted: 'Usunięto wszystko, co Mylik zapisał w tej przeglądarce: sprawdzenia, Twój wybór i ustawienia dostępności.',
} as const;

const STATUS: Record<HistoryConsent, string> = {
	unset: PRIVACY_TEXTS.statusUnset,
	granted: PRIVACY_TEXTS.statusGranted,
	denied: PRIVACY_TEXTS.statusDenied,
};

function PrivacySettings() {
	const consent = useHistoryConsent();
	const [message, setMessage] = useState('');

	function choose(choice: Exclude<HistoryConsent, 'unset'>) {
		setHistoryConsent(choice);
		setMessage(choice === 'granted' ? PRIVACY_TEXTS.savedGranted : PRIVACY_TEXTS.savedDenied);
	}

	function handleDeleteHistory() {
		clearHistory();
		setMessage(PRIVACY_TEXTS.historyDeleted);
	}

	function handleDeleteAll() {
		clearHistory();
		resetSettings();
		try {
			window.localStorage.removeItem(PRIVACY_STORAGE_KEY);
		} catch {
			/* przeglądarka blokuje zapis */
		}
		setHistoryConsent('unset');
		setMessage(PRIVACY_TEXTS.allDeleted);
	}

	return (
		<section id="ustawienia" tabIndex={-1} aria-labelledby="ustawienia-title" className="doc__settings">
			<h2 id="ustawienia-title">Ustawienia prywatności</h2>
			<p className="doc__label" id="historia-label">
				Zapamiętywanie ostatnich sprawdzeń w tej przeglądarce
			</p>
			<div className="doc__choices" role="group" aria-labelledby="historia-label">
				<button type="button" className="button doc__choice" aria-pressed={consent === 'granted'} onClick={() => choose('granted')}>
					{PRIVACY_TEXTS.accept}
				</button>
				<button type="button" className="button doc__choice" aria-pressed={consent === 'denied'} onClick={() => choose('denied')}>
					{PRIVACY_TEXTS.decline}
				</button>
			</div>
			<p className="doc__status">
				<strong>Teraz:</strong> {nb(STATUS[consent])}
			</p>
			<div className="doc__choices">
				<button type="button" className="button" onClick={handleDeleteHistory}>
					{PRIVACY_TEXTS.deleteHistory}
				</button>
				<button type="button" className="button" onClick={handleDeleteAll}>
					{PRIVACY_TEXTS.deleteAll}
				</button>
			</div>
			<p className="doc__status" role="status" aria-live="polite">
				{nb(message)}
			</p>
		</section>
	);
}

const SERVER_STORES = [
	'Treść zgłoszenia po zamaskowaniu danych osobowych (PESEL, NIP, numer konta, karta, dowód, telefon, e-mail, adres IP, imię po zwrocie typu „Pan”) oraz wynik sprawdzenia. Maskowanie działa na wzorcach: nazwisko wpisane bez takiego zwrotu może nie zostać zamaskowane, więc nie wpisuj danych osobowych.',
	'Rekord z wynikiem przechowujemy 30 dni, potem jest usuwany. Wynik oparty na ocenie redakcji z indeksu Google przechowujemy 24 godziny.',
	'Gdy Mylik nie znajdzie dowodów, może zapisać to twierdzenie jako „sprawę” do przejrzenia przez człowieka w widoku urzędnika. Zapisujemy wtedy skrócone, ponownie zamaskowane twierdzenie bez dowodów, bez adresu IP i numeru nadawcy. Sprawa żyje do 365 dni od ostatniego zgłoszenia, dłużej niż wynik.',
	'Zdarzenia techniczne (np. czas, stan, kody błędów) zapisujemy bez treści zgłoszeń.',
];

const PROVIDERS = [
	'Do analizy używamy modelu językowego firmy zewnętrznej. Domyślnie jest to Anthropic (USA, poza Europejskim Obszarem Gospodarczym). Trafia tam tylko treść po zamaskowaniu danych osobowych oraz fragmenty źródeł.',
	'Opcjonalnie do sprawdzania cytatów może być użyty inny dostawca (Jev firmy TypeSafe AI w USA albo model Basal na maszynie wskazanej przez operatora). Dostaje wtedy tylko twierdzenie po zamaskowaniu i dosłowny cytat ze źródła publicznego.',
	'Gdy operator włączy oceny redakcji z indeksu Google Fact Check Tools, do Google trafiają krótkie frazy (1 do 3 słów) z twierdzenia po zamaskowaniu.',
	'Szczegóły (co, komu i kiedy) są w dokumentach projektu: docs/MODELE.md, docs/ZALEZNOSCI.md, docs/RYZYKA.md w repozytorium.',
];

const NOT_COLLECTED = [
	'Adresu IP nie zapisujemy na stałe. Serwer używa go tylko w pamięci, żeby ograniczyć liczbę zgłoszeń na minutę, i nie trafia on do bazy ani do logu zdarzeń.',
	'Numeru nadawcy SMS nie zapisujemy.',
	'Nie profilujemy użytkowników, nie mamy kont, reklam ani statystyk odwiedzin.',
	'Strona nie wczytuje skryptów, czcionek ani obrazów z cudzych serwerów i nie wysyła zapytań do stron trzecich. Odnośniki do źródeł otwierają cudze strony dopiero po Twoim kliknięciu.',
	'Nie ustawiamy plików cookie. Jedyny wyjątek to osobny widok urzędnika (adres /urzednik): po zalogowaniu osoba z dostępem dostaje plik cookie sesji na 8 godzin. Zwykli użytkownicy go nie widzą.',
];

const BROWSER_ONLY = [
	'Lista „Twoje ostatnie sprawdzenia” (do 8 wpisów: adres wyniku, początek twierdzenia, ocena, czas). Zapisujemy ją tylko, jeśli wybierzesz „Zapamiętuj”. Do czasu wyboru nic nie zapisujemy, a „Nie zapamiętuj” usuwa listę i wyłącza zapis.',
	'Twój wybór dotyczący zapamiętywania. Zapisujemy go jako informację niezbędną do działania serwisu, bez zgody, bo bez niego nie moglibyśmy uszanować Twojej decyzji.',
	'Ustawienia dostępności (kontrast, wielkość tekstu, odstępy, animacje). Też zapisujemy jako niezbędne, bo działają na Twoje życzenie.',
	'Niewysłany tekst z pola oraz ostatnio oglądane wyniki są w pamięci karty przeglądarki, żeby przycisk „Wstecz” działał. Znikają po zamknięciu karty i nie trafiają na serwer.',
];

const HOW_TO_CLEAR = [
	'Przyciski w ustawieniach prywatności powyżej: „Usuń zapisane sprawdzenia” i „Usuń wszystko z tej przeglądarki”.',
	'Na stronie głównej: „Wyczyść listę” przy ostatnich sprawdzeniach.',
	'W ustawieniach przeglądarki: usunięcie danych witryny (localStorage) tej strony.',
	'Dane na serwerze znikają same po czasie z sekcji „Co trafia na serwer”. Wynik, który znasz z adresu, nie ma przycisku usuwania, bo nie masz konta, po którym można by go rozpoznać.',
];

function List({ items }: { items: string[] }) {
	return (
		<ul className="doc__list">
			{items.map((item) => (
				<li key={item}>{nb(item)}</li>
			))}
		</ul>
	);
}

export function PrivacyPage() {
	useDocumentTitle(PRIVACY_TITLE);
	return (
		<div className="doc">
			<h1 className="page-title">Prywatność</h1>
			<div className="doc__body">
				<p>{nb('Mylik nie śledzi i nie używa plików cookie do reklam ani statystyk. To prototyp z hackathonu HackNation 2026, a nie oficjalna usługa administracji publicznej. Poniżej prostym językiem opisujemy, co się dzieje z tym, co wpiszesz.')}</p>
				<p>
					<strong>Stan na:</strong> <time dateTime="2026-11-22">{PRIVACY_DATE}</time>
				</p>

				<PrivacySettings />

				<h2>Co trafia na serwer</h2>
				<List items={SERVER_STORES} />

				<h2>Co trafia do dostawców modeli</h2>
				<List items={PROVIDERS} />

				<h2>Czego nie zbieramy</h2>
				<List items={NOT_COLLECTED} />

				<h2>Co zostaje tylko w Twojej przeglądarce</h2>
				<List items={BROWSER_ONLY} />

				<h2>Jak to wyczyścić</h2>
				<List items={HOW_TO_CLEAR} />

				<p>
					<Link to="/dostepnosc">Dostępność</Link>
				</p>
			</div>
		</div>
	);
}
