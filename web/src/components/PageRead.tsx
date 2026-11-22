import { useId, useState } from 'react';
import type { ClaimResult, EvidenceItem, PageInfo } from '../../../src/contracts/record';
import { officialAnnouncement, pageAgeNote, decisivePage } from '../../../src/render/answer';
import { STRENGTH_PLAIN_PL, STRENGTH_TITLE_PL } from '../../../src/render/plain';
import { formatDate } from '../format';
import { nb } from '../typography';
import { ResultTag } from './ResultTag';
import { describeAddress } from './SheetQuestion';
import './page.css';

export const PAGE_TEXTS = {
	label: 'Przeczytałem',
	officialTag: 'strona urzędu',
	pressTag: 'relacja, nie dokument źródłowy',
	noDate: 'bez daty publikacji',
	noTitle: 'Strona bez tytułu',
	open: 'Otwórz stronę',
	newTab: ' (otworzy się w nowej karcie)',
	showAddress: 'Pokaż pełny adres',
	hideAddress: 'Ukryj pełny adres',
	confirmed: 'potwierdzone',
	articleClaims: 'Artykuł twierdzi:',
	held: 'Czego ta strona nie rozstrzyga',
} as const;

function safeHref(url: string): string | null {
	return /^https?:\/\//iu.test(url.trim()) ? url.trim() : null;
}

export function PageRead({ page, label = PAGE_TEXTS.label }: { page: PageInfo; label?: string }) {
	const [expanded, setExpanded] = useState(false);
	const labelId = useId();
	const addressId = useId();
	const href = safeHref(page.url);
	const address = describeAddress(page.url);
	const title = page.title?.replace(/\s+/gu, ' ').trim();
	return (
		<section className="page-read" aria-labelledby={labelId} data-official={page.official ? 'true' : 'false'}>
			<p id={labelId} className="page-read__label">
				{label}
			</p>
			<p className="page-read__title">{title ? <q>{title}</q> : PAGE_TEXTS.noTitle}</p>
			<p className="page-read__meta">
				<span className="page-read__domain">{page.domain}</span>
				{', '}
				{page.publishedAt ? <time dateTime={page.publishedAt}>{formatDate(page.publishedAt)}</time> : PAGE_TEXTS.noDate}
			</p>
			<p className="page-read__tag" data-kind={page.official ? 'official' : 'press'}>
				{page.official ? PAGE_TEXTS.officialTag : PAGE_TEXTS.pressTag}
			</p>
			<p className="page-read__actions">
				{href && (
					<a className="page-read__open" href={href} target="_blank" rel="noopener noreferrer">
						{PAGE_TEXTS.open}
						<span className="visually-hidden">{PAGE_TEXTS.newTab}</span>
					</a>
				)}
				<button
					type="button"
					className="text-button page-read__toggle"
					aria-expanded={expanded}
					aria-controls={addressId}
					onClick={() => setExpanded((current) => !current)}
				>
					{expanded ? PAGE_TEXTS.hideAddress : PAGE_TEXTS.showAddress}
				</button>
			</p>
			{expanded && (
				<p id={addressId} className="page-read__address">
					{address?.fullAddress ?? page.url}
				</p>
			)}
		</section>
	);
}

export function officialItem(result: ClaimResult): EvidenceItem | null {
	const item = decisivePage(result);
	if (!item || item.stance !== 'potwierdza' || !item.quote.trim()) return null;
	return item;
}

export function splitOfficialClaims(claims: ClaimResult[]): { cited: { result: ClaimResult; item: EvidenceItem }[]; held: ClaimResult[] } {
	const cited: { result: ClaimResult; item: EvidenceItem }[] = [];
	const held: ClaimResult[] = [];
	for (const result of claims) {
		const item = officialItem(result);
		if (item) cited.push({ result, item });
		else held.push(result);
	}
	return { cited, held };
}

function cleanQuote(quote: string): string {
	return quote.replace(/\s+/gu, ' ').trim();
}

export function OfficialAnnouncement({
	page,
	cited,
}: {
	page: PageInfo;
	cited: { result: ClaimResult; item: EvidenceItem }[];
}) {
	const publisher = (page.publisher || cited[0]?.item.source.publisher || page.domain).trim();
	const headline = cited[0]?.result.directAnswer?.trim() || officialAnnouncement(publisher);
	const age = pageAgeNote(page.publishedAt, page.fetchedAt);
	return (
		<section className="page-official" aria-label="Komunikat urzędu">
			<h2 className="page-official__headline" data-result-heading="" tabIndex={-1}>
				{nb(headline)}
			</h2>
			{age && (
				<p className="page-official__age" role="note">
					{nb(age)}
				</p>
			)}
			{cited.length > 0 && (
				<>
					<h3 className="page-official__lead">{nb(`${publisher} podaje:`)}</h3>
					<ul className="page-official__quotes">
						{cited.map(({ result, item }) => (
							<li key={`${result.claim.id}-${item.passageId}`} className="page-quote">
								<blockquote className="page-quote__text">
									<p>{cleanQuote(item.quote)}</p>
								</blockquote>
								<p className="page-quote__meta">
									<span className="page-quote__verdict">
										<ResultTag kind="potwierdzone" size="sm" />
									</span>
									{` ${STRENGTH_TITLE_PL}: ${STRENGTH_PLAIN_PL[result.strength.level]}.`}
								</p>
							</li>
						))}
					</ul>
				</>
			)}
		</section>
	);
}

export function ArticleClaims({ claims }: { claims: ClaimResult[]; asOf?: string }) {
	if (claims.length === 0) return null;
	return (
		<section className="page-article" aria-label={PAGE_TEXTS.articleClaims}>
			<h3 className="page-article__lead">{PAGE_TEXTS.articleClaims}</h3>
			<ul className="page-article__list">
				{claims.map((result) => (
					<li key={result.claim.id} className="page-article__item">
						<span className="page-article__text">{nb(result.claim.text)}</span>
						<span className="page-article__result">
							<ResultTag kind={result.verdict} size="sm" />
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}
