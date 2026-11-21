import { useDocumentTitle } from '../documentTitle';

export function AccessibilityPage() {
	useDocumentTitle('Dostępność - Mylik');
	return (
		<div>
			<h1>Dostępność</h1>
		</div>
	);
}

export function PrivacyPage() {
	useDocumentTitle('Prywatność - Mylik');
	return (
		<div>
			<h1>Prywatność</h1>
			<section id="ustawienia" tabIndex={-1}>
				<h2>Ustawienia prywatności</h2>
			</section>
		</div>
	);
}
