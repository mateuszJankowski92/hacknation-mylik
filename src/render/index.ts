import {
	MISMATCH_LABELS_PL,
	SHORT_ANSWER_MAX_CHARS,
	VERDICT_LABELS_PL,
	type ClaimResult,
	type EvidenceItem,
	type Notice,
	type State,
	type Verdict,
	type VerificationRecord,
} from '../contracts/index';
import {
	VERDICT_SENTENCES,
	asOfSentence,
	asOfStamp,
	formatDate,
	nSources,
	pluralPl,
	strengthSentence,
} from './templates';
import { buildResultLayout, evidenceLinkText } from './layout';
import { knownOpSmsText } from './warning';
import { EVIDENCE_LINK_TEXT, STATE_MESSAGES_PL, VERDICT_EXPLANATIONS_PL } from './plain';
import {
	decisivePage,
	decisiveReview,
	isPageEvidence,
	NEWER_SOURCE_PREFIX,
	missingEvidenceText,
	pageAgeNote,
	pageAgeNoteShort,
	pageOpeningSentence,
	pageSaysSentence,
	reviewSentence,
	similarReview,
	similarSentence,
} from './answer';

export * from './answer';

export { ABSTAIN_LINK_TEXT, EVIDENCE_LINK_TEXT, buildHeadline, buildResultLayout, buildUncertaintyNote, evidenceLinkText, isUnmeasurable, pickLayoutEvidence, type ResultLayout } from './layout';
export * from './warning';
export { averageSentenceLength, countForbiddenForms, findForbiddenForms, measureLanguage } from './metrics';

const MAX_PUBLISHER_CHARS = 60;
const MIN_PUBLISHER_CHARS = 12;
const MAX_SMS_QUOTE_CHARS = 140;
const SMS_QUOTE_STEPS = [140, 120, 100, 80, 60, 40, 20, 10];

function toIso(asOf: string | Date | undefined): string {
	if (asOf === undefined) return new Date().toISOString();
	return asOf instanceof Date ? asOf.toISOString() : asOf;
}

function publisherName(item: EvidenceItem, limit = MAX_PUBLISHER_CHARS): string {
	const name = (item.source.publisher || item.source.domain || 'Źródło').trim();
	return name.length > limit ? `${name.slice(0, limit - 1).trimEnd()}…` : name;
}

function dateOf(item: EvidenceItem): string {
	return item.source.publishedAt ? formatDate(item.source.publishedAt) : 'w dokumencie bez daty publikacji';
}

/** Twierdzenie ze strony urzędu potwierdzone dosłownym cytatem z tej strony (zad. 44). */
function pageConfirmed(c: ClaimResult): boolean {
	return c.verdict === 'potwierdzone' && decisivePage(c)?.stance === 'potwierdza';
}

function leadClaim(record: VerificationRecord): ClaimResult | undefined {
	// Strona urzędu: odpowiedź prowadzi pierwsze zdanie potwierdzone cytatem (to ono niesie "To oficjalny komunikat").
	if (record.page?.official) {
		const confirmed = record.claims.find(pageConfirmed);
		if (confirmed) return confirmed;
	}
	return record.claims.find((c) => c.claim.kind === 'faktograficzna') ?? record.claims[0];
}

/** Etykieta zbiorcza dla strony urzędu z kilkoma zdaniami: "potwierdzone: 3 z 5 zdań z cytatem". */
export function pageSummaryLabel(record: VerificationRecord): string | null {
	if (!record.page?.official) return null;
	const checked = record.claims.filter((c) => c.verdict !== 'nie_podlega_weryfikacji');
	const confirmed = checked.filter(pageConfirmed).length;
	if (confirmed === 0 || checked.length < 2) return null;
	return `${VERDICT_LABELS_PL.potwierdzone}: ${confirmed} z ${checked.length} zdań z cytatem`;
}

function join(...parts: string[]): string {
	return parts.filter((p) => p.length > 0).join(' ');
}

function currentRecordUrl(cardUrl: string): string {
	return cardUrl.replace('/#/rekord/', '/r/');
}

interface ShortState {
	degraded: boolean;
	truncated: boolean;
}

function renderShortCore(record: VerificationRecord, rawCardUrl: string, limit: number, state: ShortState): string {
	const cardUrl = currentRecordUrl(rawCardUrl);
	const lead = leadClaim(record);
	const asOf = asOfStamp(record.asOf);
	const warning = knownOpSmsText(record.notices);
	if (!lead) return join('Nie znalazłem w zgłoszeniu nic do sprawdzenia.', asOf, `${EVIDENCE_LINK_TEXT}: ${cardUrl}`).slice(0, limit);

	const tail = `${evidenceLinkText(lead)}: ${cardUrl}`;
	const count = record.claims.length;
	const extra =
		count > 1
			? `Sprawdziłem ${count} ${pluralPl(count, 'twierdzenie', 'twierdzenia', 'twierdzeń')}. Tu pierwsze.`
			: '';
	// Ocena redakcji: ta sama publikacja co w WWW (adres z indeksu), gdy mieści się w limicie.
	const review = decisiveReview(lead);
	const pubLinks = review ? [`Link do publikacji: ${review.source.url}`, ''] : [''];
	const label = VERDICT_LABELS_PL[lead.verdict];
	const asOfShort = asOfStamp(record.asOf, record.createdAt);
	const shortCandidates: string[] = [];
	if (review) {
		const r = review.source.review!;
		const when = review.source.publishedAt ? `, ${formatDate(review.source.publishedAt)}` : '';
		const head = join(lead.directAnswer ?? '', `${publisherName(review, MIN_PUBLISHER_CHARS * 2)}${when}: ocena „${r.rating}”.`);
		// Ze sprawdzaną tezą dosłownie (skróconą), gdy się mieści.
		const what = r.inverse ? 'twierdzenie odwrotne' : 'twierdzenie';
		const thesis = r.claimReviewed.length > 70 ? `${r.claimReviewed.slice(0, 69).trimEnd()}…` : r.claimReviewed;
		shortCandidates.push(join(lead.directAnswer ?? '', `${publisherName(review, MIN_PUBLISHER_CHARS * 2)}${when}, ${what} „${thesis}”: ocena „${r.rating}”.`, pubLinks[0]!, `[${label}]`, asOfShort, tail));
		shortCandidates.push(join(head, pubLinks[0]!, `[${label}]`, asOfShort, warning, tail), join(head, pubLinks[0]!, `[${label}]`, asOfShort, tail));
	}
	if (lead.neededDocument) {
		const head = join(lead.directAnswer ?? 'Nie udało mi się potwierdzić tej informacji.', `Potrzebuję: ${lead.neededDocument}.`);
		const sim = similarReview(lead);
		if (sim) {
			const simShort = similarSentence(sim, { maxThesis: 70, link: false });
			shortCandidates.push(join(lead.directAnswer ?? 'Nie udało mi się potwierdzić tej informacji.', simShort, `Link do publikacji: ${sim.source.url}`, `[${label}]`, asOfShort, tail));
			shortCandidates.push(join(lead.directAnswer ?? 'Nie udało mi się potwierdzić tej informacji.', simShort, `[${label}]`, asOfShort, tail));
		}
		shortCandidates.push(join(head, `[${label}]`, asOfShort, warning, tail), join(head, `[${label}]`, asOfShort, tail));
	}
	const tryFull = (pubLink: string): string | null => {
		for (const checkedAt of [record.createdAt, undefined]) {
			for (const quote of SMS_QUOTE_STEPS) {
				const layout = buildResultLayout(lead, record.asOf, {
					publisher: Math.min(MAX_PUBLISHER_CHARS, Math.max(MIN_PUBLISHER_CHARS, quote / 2)),
					quote,
				}, checkedAt);
				const certainty = layout.certainty ? `${layout.certainty}.` : (layout.uncertaintyNote ?? '');
				const text = join(layout.headline, pubLink, `[${layout.label}]`, certainty, extra, layout.asOf, warning, tail);
				if (text.length <= limit) return text;
			}
		}
		return null;
	};
	// Strona urzędu: zdanie z dosłownym cytatem, odnośnik do strony i uwaga o wieku (gdy trzeba) mają pierwszeństwo.
	const pageEv = decisivePage(lead);
	if (pageEv) {
		const summary = pageSummaryLabel(record);
		const ageFull = pageAgeNote(pageEv.source.publishedAt, pageEv.source.fetchedAt);
		const ageForms = ageFull ? [ageFull, pageAgeNoteShort(pageEv.source.publishedAt, pageEv.source.fetchedAt) ?? ''] : [''];
		for (const extraPart of [extra, ''])
			for (const age of ageForms)
				for (const link of [`Link do strony: ${pageEv.source.url}`, ''])
					for (const stamp of [asOfShort, asOf, ''])
						for (const warn of [warning, ''])
							for (const quote of [MAX_SMS_QUOTE_CHARS, 100, 60, 30]) {
								const text = join(
									lead.directAnswer ?? '',
									pageSaysSentence(pageEv, { maxQuote: quote, maxPublisher: MAX_PUBLISHER_CHARS }),
									link,
									age,
									`[${summary ?? label}]`,
									summary ? '' : extraPart,
									stamp,
									warn,
									tail,
								);
								if (text.length <= limit) return text;
							}
	}
	// Kolejność: pełne zdanie z adresem publikacji, skrót z adresem, pełne zdanie bez adresu, skróty.
	if (review) {
		const withLink = tryFull(pubLinks[0]!) ?? shortCandidates.find((t) => t.length <= limit);
		if (withLink) return withLink;
	}
	const full = tryFull('');
	if (full) return full;
	for (const t of shortCandidates) if (t.length <= limit) return t;
	state.degraded = true;
	const layout = buildResultLayout(lead, record.asOf, { publisher: MIN_PUBLISHER_CHARS, quote: 1 }, record.createdAt);
	const compactHead = lead.directAnswer ? join(lead.directAnswer, review ? `${review.source.publisher}: „${review.source.review!.rating}”.` : '') : VERDICT_EXPLANATIONS_PL[lead.verdict];
	const stamps = [layout.asOf, asOfStamp(record.asOf)];
	const heads = [compactHead, compactHead.split(/(?<=[.!?])\s/u)[0]!];
	for (const head of heads)
		for (const stamp of stamps) {
			const compactWithWarning = join(head, `[${layout.label}]`, stamp, warning, tail);
			if (compactWithWarning.length <= limit) return compactWithWarning;
			const compact = join(head, `[${layout.label}]`, stamp, tail);
			if (compact.length <= limit) return compact;
		}
	state.truncated = true;
	return join(`[${layout.label}]`, layout.asOf, tail).slice(0, limit);
}

/** Krótka odpowiedź (SMS, Discord). Adres spoza listy urzędów dostaje zdanie otwierające o przeczytanej stronie. */
export function renderShortAnswer(record: VerificationRecord, rawCardUrl: string): string {
	const page = record.page;
	if (page && !page.official) {
		const forms = [
			pageOpeningSentence(page, { maxTitle: 60 }),
			pageOpeningSentence(page, { maxTitle: 30 }),
			pageOpeningSentence({ ...page, title: null }),
			'To relacja, nie dokument źródłowy.',
		];
		for (const open of forms) {
			const state = { degraded: false, truncated: false };
			const core = renderShortCore(record, rawCardUrl, SHORT_ANSWER_MAX_CHARS - open.length - 1, state);
			if (!state.truncated) return `${open} ${core}`;
		}
	}
	return renderShortCore(record, rawCardUrl, SHORT_ANSWER_MAX_CHARS, { degraded: false, truncated: false });
}

export function renderExplanation(claim: ClaimResult, asOf?: string | Date): string {
	const parts: string[] = [];
	if (claim.directAnswer) parts.push(claim.directAnswer);
	// Oceny redakcji (indeks weryfikacji): zawsze przypisane redakcji, z adresem publikacji.
	const decisive = decisiveReview(claim);
	const similar = similarReview(claim);
	if (decisive) parts.push(reviewSentence(decisive), `Link do publikacji: ${decisive.source.url}`);
	else if (similar) parts.push(similarSentence(similar));
	// Strona urzędu wklejona przez użytkownika: dosłowny cytat przypisany wydawcy, data, odnośnik i uwaga o wieku.
	const page = decisivePage(claim);
	if (page) {
		parts.push(pageSaysSentence(page));
		if (page.source.publishedAt) parts.push(`Publikacja z ${formatDate(page.source.publishedAt)}.`);
		parts.push(`Link do strony: ${page.source.url}`);
		const age = pageAgeNote(page.source.publishedAt, page.source.fetchedAt);
		if (age) parts.push(age);
	}
	const confirming = claim.evidence.filter((e) => e.stance === 'potwierdza');
	const refuting = claim.evidence.filter((e) => e.stance === 'obala');
	const contextual = claim.evidence.filter((e) => e.stance === 'rozbieznosc_kontekstu' || e.stance === 'kontekst');

	// Podstawa wyłącznie z ocen redakcji: zdanie z przypisaną oceną wyżej wystarcza (bez ogólnych szablonów).
	const reviewOnly =
		decisive !== null &&
		claim.evidence.filter((e) => e.stance !== 'kontekst').every((e) => e.source.layer === 'weryfikacja_redakcji');
	// Podstawa wyłącznie ze strony urzędu: zdania wyżej wystarczają, dochodzi tylko jedno zdanie o drugiej stronie.
	const pageOnly = page !== null && claim.evidence.filter((e) => e.stance !== 'kontekst').every(isPageEvidence);
	if (pageOnly) {
		const newer = claim.limitations.find((l) => l.startsWith(NEWER_SOURCE_PREFIX));
		if (claim.verdict === 'potwierdzone') parts.push(newer ?? 'Nie znalazłem źródła, które temu przeczy.');
		else if (claim.verdict === 'falszywe') parts.push('Nie znalazłem źródła, które to potwierdza.');
		else if (claim.verdict === 'wprowadzajace_w_blad') parts.push('Źródło opisuje to samo, ale w innych okolicznościach.');
	}
	if (!reviewOnly && !pageOnly) switch (claim.verdict) {
		case 'nie_podlega_weryfikacji':
			parts.push(VERDICT_SENTENCES.nie_podlega_weryfikacji('', ''));
			break;
		case 'potwierdzone':
			parts.push(`Znalazłem ${nSources(confirming.length)} zgodne z twierdzeniem.`);
			if (confirming[0]) parts.push(VERDICT_SENTENCES.potwierdzone(publisherName(confirming[0]), dateOf(confirming[0])));
			parts.push('Nie znalazłem źródła, które temu przeczy.');
			break;
		case 'falszywe':
			parts.push(`Znalazłem ${nSources(refuting.length)} przeczące twierdzeniu.`);
			if (refuting[0]) parts.push(VERDICT_SENTENCES.falszywe(publisherName(refuting[0]), dateOf(refuting[0])));
			parts.push('Nie znalazłem źródła, które to potwierdza.');
			break;
		case 'wprowadzajace_w_blad': {
			// Reguła: ten wynik daje tylko źródło opisujące to samo w innych okolicznościach
			// (stanowisko rozbieznosc_kontekstu), bez źródeł potwierdzających i przeczących.
			parts.push('Źródło opisuje to samo zdarzenie, ale w innych okolicznościach.');
			const item = claim.evidence.find((e) => e.stance === 'rozbieznosc_kontekstu') ?? contextual[0];
			if (item) {
				const kind = item.mismatch ? `: ${MISMATCH_LABELS_PL[item.mismatch]}` : '';
				parts.push(`${publisherName(item)} podaje ${dateOf(item)} inne okoliczności${kind}.`);
			}
			parts.push('Wiadomość przenosi prawdziwą informację w inne okoliczności.');
			break;
		}
		case 'brak_wystarczajacych_dowodow':
			if (confirming.length > 0 && refuting.length > 0) {
				parts.push(
					`${publisherName(confirming[0]!)} potwierdza twierdzenie, a ${publisherName(refuting[0]!)} mu przeczy.`,
				);
				parts.push('Pokazuję obie strony. Nie mówię, kto ma rację.');
			} else if (contextual.length > 0) {
				parts.push('Znalazłem tylko tło tematu. To nie mówi, czy to prawda.');
			} else if (claim.neededDocument) {
				const text = missingEvidenceText(claim);
				parts.push(claim.directAnswer?.startsWith('Nie udało mi się') ? text.replace(/^Nie udało mi się potwierdzić tej informacji\. /u, '') : text);
			} else {
				parts.push('Nie znalazłem w źródłach ani potwierdzenia, ani zaprzeczenia.');
			}
			parts.push('Nie oceniam tego twierdzenia.');
			break;
	}

	if (claim.verdict !== 'nie_podlega_weryfikacji') {
		parts.push(strengthSentence(claim.strength.level, claim.strength.reasons));
	}
	parts.push(asOfSentence(toIso(asOf)));
	return parts.join(' ');
}

const STATE_TEMPLATES: Record<State, string> = STATE_MESSAGES_PL;

export function renderStateMessage(state: State, asOf?: string | Date): string {
	return `${STATE_TEMPLATES[state]} ${asOfSentence(toIso(asOf))}`;
}

export interface NoticeInput {
	claims: ClaimResult[];
	injectionSignals: string[];
	asOf: string | Date;
	archivalMonths?: number;
}

export function renderNotices(input: NoticeInput): Notice[] {
	const asOfIso = toIso(input.asOf);
	const asOfDay = asOfIso.slice(0, 10);
	const stamp = asOfSentence(asOfIso);
	const notices: Notice[] = [];
	const seen = new Set<string>();

	for (const claim of input.claims) {
		for (const item of claim.evidence) {
			const who = publisherName(item);
			const published = item.source.publishedAt ? formatDate(item.source.publishedAt) : 'bez daty publikacji';
			if (item.archival && !seen.has(`a:${item.passageId}`)) {
				seen.add(`a:${item.passageId}`);
				const age = input.archivalMonths ? ` starszego niż ${input.archivalMonths} mies.` : '';
				notices.push({
					type: 'material_archiwalny',
					text: `${who} podaje stary materiał z ${published}${age}. Sytuacja mogła się zmienić. ${stamp}`,
					passageId: item.passageId,
				});
			}
			const validUntil = item.source.validUntil;
			if (validUntil && validUntil < asOfDay && !seen.has(`s:${item.passageId}`)) {
				seen.add(`s:${item.passageId}`);
				notices.push({
					type: 'status_zrodla',
					text: `Dokument z ${published} (${who}) obowiązywał do ${formatDate(validUntil)}. ${stamp}`,
					passageId: item.passageId,
				});
			}
			if (item.stance === 'rozbieznosc_kontekstu' && item.mismatch && !seen.has(`d:${item.passageId}`)) {
				seen.add(`d:${item.passageId}`);
				notices.push({
					type: 'dopasowanie_incydentu',
					text: `${who} opisuje to samo, ale w innych okolicznościach (${MISMATCH_LABELS_PL[item.mismatch]}). ${stamp}`,
					passageId: item.passageId,
				});
			}
		}
	}

	if (input.injectionSignals.length > 0) {
		notices.push({
			type: 'ograniczenie_techniczne',
			text: `W zgłoszeniu znalazłem tekst podobny do poleceń dla systemu. Takie polecenia nie wpływają na wynik. ${stamp}`,
		});
	}
	return notices;
}

export interface LimitationInput {
	corpusVersion: string;
	documents: number;
	asOf: string | Date;
	hasArchival?: boolean;
	abstained?: boolean;
}

export function renderLimitations(input: LimitationInput): string[] {
	const stamp = asOfSentence(toIso(input.asOf));
	const docs = `${input.documents} ${pluralPl(input.documents, 'dokument', 'dokumenty', 'dokumentów')}`;
	const list = [
		`Sprawdzałem tylko w zamkniętym zbiorze źródeł (wersja ${input.corpusVersion}, ${docs}). To nie daje pewności absolutnej. ${stamp}`,
	];
	if (input.hasArchival) {
		list.push(`Część źródeł to stare materiały, więc sytuacja mogła się zmienić. ${stamp}`);
	}
	if (input.abstained) {
		list.push(`Nie oceniłem tego twierdzenia, więc warto, żeby przejrzał je człowiek. ${stamp}`);
	}
	return list;
}
