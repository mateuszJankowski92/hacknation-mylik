import { useDocumentTitle } from '../documentTitle';

export function PrivacyPage() {
	useDocumentTitle('Prywatność - Mylik');
	return (
		<div>
			<h1 className="page-title">Prywatność</h1>
			<section id="ustawienia" tabIndex={-1}>
				<h2>Ustawienia prywatności</h2>
			</section>
		</div>
	);
}
