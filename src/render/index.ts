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
import { buildResultLayout } from './layout';
import { knownOpSmsText } from './warning';
import { EVIDENCE_LINK_TEXT, STATE_MESSAGES_PL, VERDICT_EXPLANATIONS_PL } from './plain';
import { decisiveReview, missingEvidenceText, reviewEvidence, reviewSentence } from './answer';

export * from './answer';

export { EVIDENCE_LINK_TEXT, buildHeadline, buildResultLayout, buildUncertaintyNote, isUnmeasurable, pickLayoutEvidence, type ResultLayout } from './layout';
export * from './warning';
export { averageSentenceLength, countForbiddenForms, findForbiddenForms, measureLanguage } from './metrics';

const MAX_PUBLISHER_CHARS = 60;
const MIN_PUBLISHER_CHARS = 12;
const MAX_SMS_QUOTE_CHARS = 140;
const MIN_SMS_QUOTE_CHARS = 20;

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

function leadClaim(record: VerificationRecord): ClaimResult | undefined {
	return record.claims.find((c) => c.claim.kind === 'faktograficzna') ?? record.claims[0];
}

function join(...parts: string[]): string {
	return parts.filter((p) => p.length > 0).join(' ');
}

function currentRecordUrl(cardUrl: string): string {
	return cardUrl.replace('/#/rekord/', '/r/');
}

export function renderShortAnswer(record: VerificationRecord, rawCardUrl: string): string {
	const cardUrl = currentRecordUrl(rawCardUrl);
	const lead = leadClaim(record);
	const asOf = asOfStamp(record.asOf);
	const tail = `${EVIDENCE_LINK_TEXT}: ${cardUrl}`;
	const warning = knownOpSmsText(record.notices);
	if (!lead) return join('Nie znalazłem w zgłoszeniu nic do sprawdzenia.', asOf, tail).slice(0, SHORT_ANSWER_MAX_CHARS);

	const count = record.claims.length;
	const extra =
		count > 1
			? `Sprawdziłem ${count} ${pluralPl(count, 'twierdzenie', 'twierdzenia', 'twierdzeń')}. Tu pierwsze.`
			: '';
	// Ocena redakcji: ta sama publikacja co w WWW (adres z indeksu), gdy mieści się w limicie.
	const review = decisiveReview(lead);
	const pubLinks = review ? [`Link do publikacji: ${review.source.url}`, ''] : [''];
	const label = VERDICT_LABELS_PL[lead.verdict];
	const asOfShort = asOfStamp(record.asOf);
	const shortCandidates: string[] = [];
	if (review) {
		const r = review.source.review!;
		const when = review.source.publishedAt ? `, ${formatDate(review.source.publishedAt)}` : '';
		const head = join(lead.directAnswer ?? '', `${publisherName(review, MIN_PUBLISHER_CHARS * 2)}${when}: ocena „${r.rating}”.`);
		shortCandidates.push(join(head, pubLinks[0]!, `[${label}]`, asOfShort, warning, tail), join(head, pubLinks[0]!, `[${label}]`, asOfShort, tail));
	}
	if (lead.neededDocument) {
		const head = join(lead.directAnswer ?? 'Nie udało mi się potwierdzić tej informacji.', `Potrzebuję: ${lead.neededDocument}.`);
		shortCandidates.push(join(head, `[${label}]`, asOfShort, warning, tail), join(head, `[${label}]`, asOfShort, tail));
	}
	const tryFull = (pubLink: string): string | null => {
		for (let quote = MAX_SMS_QUOTE_CHARS; quote >= MIN_SMS_QUOTE_CHARS; quote -= 20) {
			const layout = buildResultLayout(lead, record.asOf, {
				publisher: Math.min(MAX_PUBLISHER_CHARS, Math.max(MIN_PUBLISHER_CHARS, quote / 2)),
				quote,
			});
			const certainty = layout.certainty ? `${layout.certainty}.` : (layout.uncertaintyNote ?? '');
			const text = join(layout.headline, pubLink, `[${layout.label}]`, certainty, extra, layout.asOf, warning, tail);
			if (text.length <= SHORT_ANSWER_MAX_CHARS) return text;
		}
		return null;
	};
	// Kolejność: pełne zdanie z adresem publikacji, skrót z adresem, pełne zdanie bez adresu, skróty.
	if (review) {
		const withLink = tryFull(pubLinks[0]!) ?? shortCandidates.find((t) => t.length <= SHORT_ANSWER_MAX_CHARS);
		if (withLink) return withLink;
	}
	const full = tryFull('');
	if (full) return full;
	for (const t of shortCandidates) if (t.length <= SHORT_ANSWER_MAX_CHARS) return t;
	const layout = buildResultLayout(lead, record.asOf, { publisher: MIN_PUBLISHER_CHARS, quote: 1 });
	const compactHead = lead.directAnswer ? join(lead.directAnswer, review ? `${review.source.publisher}: „${review.source.review!.rating}”.` : '') : VERDICT_EXPLANATIONS_PL[lead.verdict];
	const compactWithWarning = join(compactHead, `[${layout.label}]`, layout.asOf, warning, tail);
	if (compactWithWarning.length <= SHORT_ANSWER_MAX_CHARS) return compactWithWarning;
	const compact = join(compactHead, `[${layout.label}]`, layout.asOf, tail);
	if (compact.length <= SHORT_ANSWER_MAX_CHARS) return compact;
	return join(`[${layout.label}]`, layout.asOf, tail).slice(0, SHORT_ANSWER_MAX_CHARS);
}

export function renderExplanation(claim: ClaimResult, asOf?: string | Date): string {
	const parts: string[] = [];
	if (claim.directAnswer) parts.push(claim.directAnswer);
	// Oceny redakcji (indeks weryfikacji): zawsze przypisane redakcji, z adresem publikacji.
	const reviews = reviewEvidence(claim);
	const decisive = decisiveReview(claim);
	for (const item of decisive ? [decisive] : reviews.slice(0, 1)) {
		parts.push(reviewSentence(item));
		if (!decisive) parts.push('Ta ocena dotyczy podobnej, ale nie tej samej tezy, więc na niej nie opieram odpowiedzi.');
		parts.push(`Link do publikacji: ${item.source.url}`);
	}
	const confirming = claim.evidence.filter((e) => e.stance === 'potwierdza');
	const refuting = claim.evidence.filter((e) => e.stance === 'obala');
	const contextual = claim.evidence.filter((e) => e.stance === 'rozbieznosc_kontekstu' || e.stance === 'kontekst');

	// Podstawa wyłącznie z ocen redakcji: zdanie z przypisaną oceną wyżej wystarcza (bez ogólnych szablonów).
	const reviewOnly =
		decisive !== null &&
		claim.evidence.filter((e) => e.stance !== 'kontekst').every((e) => e.source.layer === 'weryfikacja_redakcji');
	if (!reviewOnly) switch (claim.verdict) {
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
