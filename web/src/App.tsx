import { useRef } from 'react';
import { CheckPage } from './components/CheckPage';
import { RecordPage } from './components/RecordPage';
import { SourcesPage } from './components/SourcesPage';
import { AccessibilityPage, PrivacyPage } from './components/StaticPages';
import { SiteFooter } from './components/SiteFooter';
import { Link } from './components/Link';
import { useRoute } from './route';
import { CharacterStage } from './stage/CharacterStage';
import { StageProvider } from './stage/StageContext';

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
				{route.page === 'accessibility' && <AccessibilityPage />}
				{route.page === 'privacy' && <PrivacyPage />}
			</main>
			<SiteFooter />
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
