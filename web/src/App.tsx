import { CheckPage } from './components/CheckPage';
import { RecordPage } from './components/RecordPage';
import { SourcesPage } from './components/SourcesPage';
import { useRoute } from './route';

export function App() {
	const route = useRoute();

	return (
		<>
			<a className="skip-link" href="#main">
				Przejdź do treści
			</a>
			<div className="banner" role="note">
				<strong>Prototyp.</strong> To wczesna wersja próbna, wyniki mogą być niepełne.
			</div>
			<header className="site-header">
				<h1>MYLIK</h1>
				<p>Sprawdzam doniesienia w zbiorze wiarygodnych źródeł. Nie jestem sędzią prawdy.</p>
				<nav aria-label="Główna nawigacja">
					<a href="#/" aria-current={route.page === 'check' ? 'page' : undefined}>
						Sprawdź informację
					</a>
					<a href="#/zrodla" aria-current={route.page === 'sources' ? 'page' : undefined}>
						Źródła
					</a>
				</nav>
			</header>
			<main id="main" tabIndex={-1}>
				{route.page === 'check' && <CheckPage />}
				{route.page === 'record' && <RecordPage id={route.id} />}
				{route.page === 'sources' && <SourcesPage />}
			</main>
		</>
	);
}
