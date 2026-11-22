import { useRef, type MouseEvent } from 'react';
import { AccessibilityMenu } from './a11y/AccessibilityMenu';
import { useEscapeToClose } from './a11y/useEscapeToClose';
import { ConsentBanner } from './privacy/ConsentBanner';
import { CheckPage } from './components/CheckPage';
import { RecordPage } from './components/RecordPage';
import { SourcesPage } from './components/SourcesPage';
import { AccessibilityPage } from './components/AccessibilityPage';
import { PrivacyPage } from './components/PrivacyPage';
import { NotFoundView } from './components/NotFoundView';
import { SiteFooter } from './components/SiteFooter';
import { Link } from './components/Link';
import { LOGO_LABEL, Logo } from './components/Logo';
import './components/logo.css';
import { useRoute } from './route';
import { CharacterStage } from './stage/CharacterStage';
import { StageProvider } from './stage/StageContext';

function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
	event.preventDefault();
	document.getElementById('main')?.focus();
}

function AppShell() {
	const route = useRoute();
	useEscapeToClose();
	const isHome = route.page === 'check';
	const appRef = useRef<HTMLDivElement>(null);

	return (
		<div className="app" data-page={route.page} ref={appRef}>
			<a className="skip-link" href="#main" onClick={skipToContent}>
				Przejdź do treści
			</a>
			<header className="site-header">
				<p className="site-header__brand">
					<Link to="/" aria-label={LOGO_LABEL} aria-current={isHome ? 'page' : undefined}>
						<Logo />
					</Link>
				</p>
				<div className="site-header__tools">
					<nav aria-label="Główna nawigacja">
						<Link to="/zrodla" aria-current={route.page === 'sources' ? 'page' : undefined}>
							Źródła
						</Link>
					</nav>
					<AccessibilityMenu />
				</div>
			</header>
			<ConsentBanner />
			<main id="main" tabIndex={-1}>
				{route.page === 'check' && <CheckPage />}
				{route.page === 'record' && <RecordPage id={route.id} />}
				{route.page === 'sources' && <SourcesPage />}
				{route.page === 'accessibility' && <AccessibilityPage />}
				{route.page === 'privacy' && <PrivacyPage />}
				{route.page === 'notFound' && <NotFoundView />}
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
