import { useRef } from 'react';
import { CheckPage } from './components/CheckPage';
import { RecordPage } from './components/RecordPage';
import { SourcesPage } from './components/SourcesPage';
import { Link } from './components/Link';
import { SceneSetting } from './scenes/SceneSetting';
import { useRoute } from './route';
import { CharacterStage } from './stage/CharacterStage';
import { StageProvider } from './stage/StageContext';
import { nb } from './typography';

export const PROTOTYPE_NOTE = 'To wczesna wersja próbna. Wyniki mogą mieć braki.';

function AppShell() {
	const route = useRoute();
	const isHome = route.page === 'check';
	const Brand = isHome ? 'p' : 'h1';
	const appRef = useRef<HTMLDivElement>(null);

	return (
		<div className="app" data-page={route.page} ref={appRef}>
			<a className="skip-link" href="#main">
				Przejdź do treści
			</a>
			<header className="site-header">
				<Brand className="site-header__brand">
					<Link to="/" aria-current={isHome ? 'page' : undefined}>
						Mylik
					</Link>
					<span className="site-header__badge" title={PROTOTYPE_NOTE}>
						Prototyp
					</span>
				</Brand>
				<nav aria-label="Główna nawigacja">
					<Link to="/zrodla" aria-current={route.page === 'sources' ? 'page' : undefined}>
						Źródła
					</Link>
				</nav>
			</header>
			<main id="main" tabIndex={-1}>
				{route.page === 'check' && <CheckPage />}
				{route.page === 'record' && <RecordPage id={route.id} />}
				{route.page === 'sources' && <SourcesPage />}
			</main>
			<footer className="site-footer">
				<p>{nb(PROTOTYPE_NOTE)}</p>
				<SceneSetting />
				<p>{nb('Pokazuję, co o informacji mówią wiarygodne źródła. Nie oceniam, kto ma rację.')}</p>
			</footer>
			<CharacterStage appRef={appRef} />
		</div>
	);
}

export function App() {
	return (
		<StageProvider>
			<AppShell />
		</StageProvider>
	);
}
