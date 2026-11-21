import { nb } from '../typography';
import { Link } from './Link';

export const PROTOTYPE_NOTE = 'Prototyp z hackathonu HackNation 2026. To nie jest oficjalna usługa administracji publicznej.';

export const FOOTER_LINKS = [
	{ to: '/zrodla', label: 'Źródła' },
	{ to: '/dostepnosc', label: 'Dostępność' },
	{ to: '/prywatnosc', label: 'Prywatność' },
	{ to: '/prywatnosc#ustawienia', label: 'Ustawienia prywatności' },
] as const;

export function SiteFooter() {
	return (
		<footer className="site-footer">
			<p className="site-footer__note">{nb(PROTOTYPE_NOTE)}</p>
			<nav aria-label="Informacje o serwisie">
				<ul className="site-footer__links">
					{FOOTER_LINKS.map((item) => (
						<li key={item.to}>
							<Link to={item.to}>{item.label}</Link>
						</li>
					))}
				</ul>
			</nav>
		</footer>
	);
}
