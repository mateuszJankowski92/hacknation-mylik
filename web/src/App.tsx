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
				<strong>Prototyp.</strong> To wczesna wersja próbna, wyniki mogą mieć braki.
			</div>
			<header className="site-header">
				<h1>MYLIK</h1>
				<p>Pokazuję, co o danej informacji mówią wiarygodne źródła. Nie wydaję wyroków.</p>
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
