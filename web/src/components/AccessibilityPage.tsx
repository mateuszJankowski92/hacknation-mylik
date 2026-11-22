import { useDocumentTitle } from '../documentTitle';
import { nb } from '../typography';
import { Link } from './Link';
import './doc.css';

export const ACCESSIBILITY_DATE = '22.11.2026';
export const ACCESSIBILITY_TITLE = 'Dostępność - Mylik';

const DONE = [
	'Kontrast: zwykły tekst ma kontrast co najmniej 4,5:1, co sprawdza test w repozytorium. Tryb wysokiego kontrastu (czarne tło, żółty i biały tekst, żółte kontury, bez faktur i cieni) ma kontrast co najmniej 7:1.',
	'Klawiatura: wszystko da się zrobić bez myszy. Pierwszy Tab prowadzi do odnośnika „Przejdź do treści”. Fokus jest dobrze widoczny, a kolejność Tab jest zgodna z kolejnością na ekranie. Nigdzie nie ma pułapki fokusu.',
	'Powiększanie: przycisk „Dostępność” pozwala ustawić tekst na 100%, 125% lub 150%. Strona nie przewija się w poziomie na ekranie telefonu o szerokości 393 px, także przy największym tekście.',
	'Odstępy w tekście: tryb „większe” ustawia odstępy z kryterium WCAG 1.4.12 (wysokość wiersza 1,6, odstęp między literami 0,12, między słowami 0,16, między akapitami 2 wysokości tekstu).',
	'Ograniczenie ruchu: serwis szanuje ustawienie systemu „zmniejsz ruch”. Animacje (klipy z postaciami i przejścia) można też wyłączyć albo włączyć przyciskiem w ustawieniach dostępności.',
	'Prosty język: krótkie zdania, bez żargonu, wynik zaczyna się od odpowiedzi.',
	'Alternatywy tekstowe: obrazy niosące treść mają opis słowny. Postacie ozdobne mają pusty opis i są ukryte przed czytnikiem. Klipy są bez dźwięku, a to, co pokazują, jest też napisane w tekście.',
	'Struktura: na każdej stronie jest jeden nagłówek pierwszego poziomu, a kolejne poziomy idą po kolei.',
	'Komunikaty: czekanie na wynik i sam wynik są ogłaszane czytnikowi (aria-live). Informacja nigdy nie jest przekazywana samym kolorem.',
	'Wielkość celów: przyciski i odnośniki mają co najmniej 48 px wysokości.',
];

const GAPS = [
	'Nie było audytu zewnętrznego ani audytu z udziałem osób z niepełnosprawnościami.',
	'Nie testowaliśmy serwisu z czytnikami ekranu (np. NVDA, JAWS, VoiceOver). Zgodność z nimi to nasze założenie z kodu, a nie wynik testów.',
	'Do działania serwis wymaga włączonego JavaScriptu.',
	'Serwis jest tylko po polsku.',
	'Karta do udostępnienia jest obrazem SVG z krótkim opisem. Tryb wysokiego kontrastu jej nie zmienia.',
	'Widok urzędnika i symulator SMS to osobne strony serwera. Nie były objęte tym przeglądem.',
	'Wyniki mogą zawierać cytaty ze źródeł urzędowych w oryginalnym języku prawniczym. Nie upraszczamy ich, żeby nie zmienić sensu.',
];

const KEYS: Array<[string, string]> = [
	['Tab, Shift + Tab', 'przejście do następnego i poprzedniego elementu'],
	['Enter, Spacja', 'uruchomienie przycisku; Enter uruchamia też odnośnik'],
	['Ctrl + Enter albo ⌘ Enter', 'w polu z informacją: sprawdź'],
	['Esc', 'zamyka otwarty panel (ustawienia dostępności, szczegóły wyniku, rozwinięte pytanie)'],
];

export function AccessibilityPage() {
	useDocumentTitle(ACCESSIBILITY_TITLE);
	return (
		<div className="doc">
			<h1 className="page-title">Dostępność</h1>
			<div className="doc__body">
				<p>{nb('Mylik jest prototypem z hackathonu HackNation 2026. To nie jest oficjalna usługa administracji publicznej i nie jest to oficjalna deklaracja dostępności podmiotu publicznego. Opisujemy tu uczciwie, co zrobiliśmy, a czego nie sprawdziliśmy.')}</p>
				<p>
					<strong>Cel:</strong> {nb('zgodność z WCAG 2.1 na poziomie AA. To cel, a nie potwierdzony stan.')}
				</p>
				<p>
					<strong>Data sporządzenia:</strong> <time dateTime="2026-11-22">{ACCESSIBILITY_DATE}</time>
				</p>

				<h2>Co zrobiono</h2>
				<ul className="doc__list">
					{DONE.map((item) => (
						<li key={item}>{nb(item)}</li>
					))}
				</ul>

				<h2>Czego nie sprawdzono i znane braki</h2>
				<ul className="doc__list">
					{GAPS.map((item) => (
						<li key={item}>{nb(item)}</li>
					))}
				</ul>

				<h2>Ustawienia dostępności</h2>
				<p>{nb('Przycisk „Dostępność” w prawym górnym rogu otwiera panel z ustawieniami: kontrast, wielkość tekstu, odstępy i animacje. Zmiany działają od razu. Zapamiętujemy je w tej przeglądarce jako ustawienia niezbędne do działania serwisu (szczegóły w zakładce Prywatność). „Przywróć ustawienia domyślne” je usuwa.')}</p>

				<h2>Skróty klawiaturowe</h2>
				<dl className="doc__keys">
					{KEYS.map(([keys, description]) => (
						<div key={keys} className="doc__key">
							<dt>
								<kbd>{keys}</kbd>
							</dt>
							<dd>{nb(description)}</dd>
						</div>
					))}
				</dl>

				<h2>Kontakt</h2>
				<p>{nb('Jeśli coś jest niedostępne, napisz o tym przez repozytorium projektu (zgłoszenie w repozytorium). Nie podajemy tu adresu e-mail ani telefonu, bo prototyp nie ma obsługi użytkowników.')}</p>
				<p>
					<Link to="/prywatnosc">Prywatność</Link>
				</p>
			</div>
		</div>
	);
}
