import { useEffect, useRef } from 'react';
import { BASE_TITLE, useDocumentTitle } from '../documentTitle';
import { assetUrl } from '../roles/manifest';
import { nb } from '../typography';
import { Link } from './Link';
import './notfound.css';

export const NOT_FOUND_TITLE = `Nie znaleziono: ${BASE_TITLE}`;
export const NOT_FOUND_IMAGE = assetUrl('postacie/pogodynka/wynik__pusta_mapa.webp');

export const NOT_FOUND_TEXTS = {
	title: 'Tej strony nie ma na mapie.',
	body: 'Sprawdź adres albo wróć na stronę główną.',
	action: 'Wróć na stronę główną',
} as const;

/** Dodaje <meta name="robots" content="noindex"> na czas wyświetlania widoku. */
export function useNoIndex(): void {
	useEffect(() => {
		const meta = document.createElement('meta');
		meta.name = 'robots';
		meta.content = 'noindex, nofollow';
		meta.dataset.notFound = 'true';
		document.head.appendChild(meta);
		return () => meta.remove();
	}, []);
}

interface NotFoundViewProps {
	title?: string;
	body?: string;
	action?: string;
	headingLevel?: 'h1' | 'h2';
}

export function NotFoundView({ title = NOT_FOUND_TEXTS.title, body = NOT_FOUND_TEXTS.body, action = NOT_FOUND_TEXTS.action, headingLevel = 'h1' }: NotFoundViewProps) {
	useDocumentTitle(NOT_FOUND_TITLE);
	useNoIndex();
	const ref = useRef<HTMLElement>(null);
	useEffect(() => {
		ref.current?.focus();
	}, []);
	const Heading = headingLevel;
	return (
		<section className="not-found" ref={ref} tabIndex={-1} aria-labelledby="not-found-title">
			<div className="not-found__plane paper-fold--sheet" aria-hidden="true" />
			<div className="not-found__text">
				<Heading id="not-found-title" className="not-found__title">
					{nb(title)}
				</Heading>
				{body && <p className="not-found__body">{nb(body)}</p>}
				<div className="not-found__action">
					<Link to="/" className="button button--primary">
						{action}
					</Link>
				</div>
			</div>
			<img className="not-found__art" src={NOT_FOUND_IMAGE} alt="" aria-hidden="true" width={720} height={900} decoding="async" />
		</section>
	);
}
