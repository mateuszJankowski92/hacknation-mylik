import { describe, expect, it } from 'vitest';
import {
	SHORT_ANSWER_MAX_CHARS,
	STATES,
	VERDICTS,
	VERDICT_LABELS_PL,
	type ClaimResult,
	type EvidenceItem,
	type VerificationRecord,
} from '../../src/contracts/index';
import {
	averageSentenceLength,
	countForbiddenForms,
	findForbiddenForms,
	renderExplanation,
	renderLimitations,
	renderNotices,
	renderShortAnswer,
	renderStateMessage,
} from '../../src/render/index';
import { asOfSentence, asOfStamp, checkedAtStamp } from '../../src/render/templates';
import { buildHeadline, buildResultLayout } from '../../src/render/layout';
import { VERDICT_SENTENCES, strengthSentence } from '../../src/render/templates';
import {
	REASON_PLAIN_PL,
	STATE_MESSAGES_PL,
	VERDICT_EXPLANATIONS_PL,
} from '../../src/render/plain';
import { splitSentences } from '../../src/render/metrics';

const ASOF = '2026-11-21T12:00:00+01:00';

function evidence(stance: EvidenceItem['stance'], extra: Partial<EvidenceItem> = {}): EvidenceItem {
	return {
		passageId: `d1#${stance}`,
		stance,
		...(stance === 'rozbieznosc_kontekstu' ? { mismatch: 'data' as const } : {}),
		quote: 'Cytat, który jest nietykalny i był dosłowny.',
		source: {
			documentId: 'd1',
			sourceId: 's1',
			title: 'Komunikat',
			publisher: 'Rządowe Centrum Bezpieczeństwa',
			domain: 'rcb.gov.pl',
			url: 'https://rcb.gov.pl/x',
			publishedAt: '2026-11-20',
			fetchedAt: '2026-11-20T10:00:00+01:00',
			sourceType: 'urzedowe',
			license: 'CC0',
		},
		archival: false,
		...extra,
	};
}

function claim(verdict: (typeof VERDICTS)[number], ev: EvidenceItem[], kind: 'faktograficzna' | 'opinia' = 'faktograficzna'): ClaimResult {
	return {
		claim: { id: 'c1', text: 'Twierdzenie testowe', kind },
		verdict,
		strength: { level: 'srednia', reasons: ['jedno_zrodlo', 'sprzeczne_zrodla'] },
		explanation: '',
		explanationSource: 'szablon',
		evidence: ev,
		limitations: [],
		refutation: { performed: true, queries: [], found: 0 },
	};
}

function record(claims: ClaimResult[]): VerificationRecord {
	return {
		id: 'a'.repeat(64),
		inputHash: 'b'.repeat(64),
		corpusVersion: 'v1',
		inputKind: 'tekst',
		maskedInput: 'x',
		piiMasked: [],
		claims,
		notices: [],
		injectionSignals: [],
		createdAt: ASOF,
		asOf: ASOF,
		shortAnswer: 'x',
		provider: 'mock',
		usage: { llmCalls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, latencyMs: 0 },
		schemaVersion: 2,
	};
}

const SCENARIOS: ClaimResult[] = [
	claim('potwierdzone', [evidence('potwierdza')]),
	claim('falszywe', [evidence('obala')]),
	claim('wprowadzajace_w_blad', [evidence('potwierdza'), evidence('rozbieznosc_kontekstu')]),
	claim('brak_wystarczajacych_dowodow', []),
	claim('brak_wystarczajacych_dowodow', [evidence('potwierdza'), evidence('obala')]),
	claim('brak_wystarczajacych_dowodow', [evidence('kontekst')]),
	claim('nie_podlega_weryfikacji', [], 'opinia'),
];

describe('metryka języka', () => {
	it('wykrywa zakazane formy poza cytatami', () => {
		expect(findForbiddenForms('To jest test. Źródła są różne. Był tu.')).toEqual(['jest', 'są', 'był']);
		expect(countForbiddenForms(['Nie ma danych. RCB podaje: „to jest cytat”.'])).toBe(0);
	});
	it('liczy średnią długość zdania', () => {
		expect(averageSentenceLength(['Ala ma kota. Kot ma Alę i psa.'])).toBe(4);
	});
});

describe('render', () => {
	it('szablony werdyktów nie zawierają zakazanych form', () => {
		for (const v of VERDICTS) {
			expect(findForbiddenForms(VERDICT_SENTENCES[v]('RCB', '20.11.2026'))).toEqual([]);
		}
	});

	it('wszystkie teksty z rekordów testowych mają 0 zakazanych form i datę', () => {
		for (const c of SCENARIOS) {
			const texts = [
				renderExplanation(c, ASOF),
				renderShortAnswer(record([c]), 'https://mylik.pl/k/abc'),
				...renderNotices({ claims: [c], injectionSignals: ['x'], asOf: ASOF, archivalMonths: 12 }).map((n) => n.text),
				...renderLimitations({ corpusVersion: 'v1', documents: 5, asOf: ASOF, hasArchival: true, abstained: true }),
			];
			for (const t of texts) {
				expect(findForbiddenForms(t), t).toEqual([]);
				expect(t, t).toMatch(/Stan źródeł na 21\.11\.2026/);
			}
		}
		for (const s of STATES) {
			const t = renderStateMessage(s, ASOF);
			expect(findForbiddenForms(t), t).toEqual([]);
			expect(t).toContain('Stan źródeł na 21.11.2026');
		}
	});

	it('krótka odpowiedź mieści się w limicie i zawiera elementy', () => {
		const long = evidence('potwierdza', {
			source: { ...evidence('potwierdza').source, publisher: 'Bardzo długa nazwa wydawcy '.repeat(10) },
		});
		for (const c of [...SCENARIOS, claim('potwierdzone', [long])]) {
			const text = renderShortAnswer(record([c, c, c]), 'https://mylik.pl/karta/' + 'x'.repeat(60));
			expect(text.length).toBeLessThanOrEqual(SHORT_ANSWER_MAX_CHARS);
			expect(text).toContain(`[${VERDICT_LABELS_PL[c.verdict]}]`);
			expect(text).toContain('Stan źródeł na 21.11.2026. Sprawdzono 21.11.2026, 12:00.');
			const link = c.verdict === 'brak_wystarczajacych_dowodow' ? 'Zobacz szczegóły' : 'Zobacz, skąd to wiem';
			expect(text).toContain(`${link}: https://mylik.pl/karta/`);
		}
		const text = renderShortAnswer(record([SCENARIOS[0]!]), 'https://mylik.pl/k/1');
		expect(text).toContain('Rządowe Centrum Bezpieczeństwa podał 20.11.2026 to samo: „Cytat, który jest nietykalny i był dosłowny.”');
	});

	it('komunikaty stanów i uzasadnienia są różne i niepuste', () => {
		const msgs = STATES.map((s) => renderStateMessage(s, ASOF));
		expect(new Set(msgs).size).toBe(STATES.length);
		expect(new Set(SCENARIOS.map((c) => renderExplanation(c, ASOF))).size).toBe(SCENARIOS.length);
	});

	it('uwagi: archiwalne, status, kontekst, polecenia w zgłoszeniu', () => {
		const ev = [
			evidence('rozbieznosc_kontekstu', {
				archival: true,
				source: { ...evidence('potwierdza').source, validUntil: '2026-01-01' },
			}),
		];
		const types = renderNotices({
			claims: [claim('wprowadzajace_w_blad', ev)],
			injectionSignals: ['x'],
			asOf: ASOF,
		}).map((n) => n.type);
		expect(types).toEqual(['material_archiwalny', 'status_zrodla', 'dopasowanie_incydentu', 'ograniczenie_techniczne']);
	});

	it('średnia długość zdania w szablonach jest umiarkowana', () => {
		const texts = SCENARIOS.map((c) => renderExplanation(c, ASOF));
		expect(averageSentenceLength(texts)).toBeLessThan(20);
	});
});

const BANNED_WORDS =
	/korpus|werdykt|weryfikacj|fragment|rekord|dowod|dowód|siła podstawy|siły podstawy|stanowisk|wstrzym|prompt|model|kanał|incydent|artefakt|wyrok|wyrocz|sędzi|sędzio|orzek|orzeka|rozstrzyga|rozstrzygam|młotek|młotk|temid|(?<!\p{L})szal|(?<!\p{L})wag[aięą](?!\p{L})/iu;
const LABELS: string[] = Object.values(VERDICT_LABELS_PL);

function citizenTexts(): string[] {
	const texts: string[] = [];
	for (const c of SCENARIOS) {
		texts.push(renderExplanation(c, ASOF));
		texts.push(renderShortAnswer(record([c]), 'https://mylik.pl/k/abc'));
		texts.push(renderShortAnswer(record([c, c]), 'https://mylik.pl/k/abc'));
		texts.push(...renderNotices({ claims: [c], injectionSignals: ['x'], asOf: ASOF, archivalMonths: 12 }).map((n) => n.text));
	}
	texts.push(...renderLimitations({ corpusVersion: 'v1', documents: 5, asOf: ASOF, hasArchival: true, abstained: true }));
	texts.push(...STATES.map((s) => renderStateMessage(s, ASOF)));
	texts.push(...Object.values(STATE_MESSAGES_PL), ...Object.values(VERDICT_EXPLANATIONS_PL), ...Object.values(REASON_PLAIN_PL));
	texts.push(...VERDICTS.map((v) => VERDICT_SENTENCES[v]('Rządowe Centrum Bezpieczeństwa', '20.11.2026')));
	texts.push(strengthSentence('srednia', ['jedno_zrodlo', 'sprzeczne_zrodla']), strengthSentence('brak', []));
	return texts;
}

function withoutLabels(text: string): string {
	return LABELS.reduce((acc, label) => acc.split(label).join(' '), text);
}

describe('prosty język', () => {
	it('średnia długość zdania do 12 słów, żadne zdanie powyżej 20', () => {
		const texts = citizenTexts().map(withoutLabels);
		expect(averageSentenceLength(texts)).toBeLessThanOrEqual(12);
		for (const t of texts) {
			for (const sentence of splitSentences(t)) {
				const words = sentence.split(/\s+/u).filter(Boolean).length;
				expect(words, sentence).toBeLessThanOrEqual(20);
			}
		}
	});

	it('brak słów zakazanych w tekstach dla obywatela', () => {
		for (const t of citizenTexts()) expect(withoutLabels(t), t).not.toMatch(BANNED_WORDS);
	});

	it('każda etykieta ma objaśnienie i jest ono w krótkiej odpowiedzi', () => {
		for (const v of VERDICTS) {
			expect(VERDICT_EXPLANATIONS_PL[v].length).toBeGreaterThan(10);
			expect(findForbiddenForms(VERDICT_EXPLANATIONS_PL[v])).toEqual([]);
		}
		for (const c of SCENARIOS) {
			const text = renderShortAnswer(record([c]), 'https://mylik.pl/karta/' + 'x'.repeat(60));
			const heads = [12, 20, 30, 40, 50, 60].map((publisher) => buildHeadline(c, { publisher, quote: 60 }).split(':')[0]!);
			expect(heads.some((head) => text.includes(head)), text).toBe(true);
		}
		expect(VERDICT_EXPLANATIONS_PL.brak_wystarczajacych_dowodow).toBe(
			'Nie znalazłem tego w sprawdzonych źródłach. Nie wiem, czy to prawda.',
		);
	});
});

describe('układ wyniku (zdanie, etykieta, pewność, data, odsyłacz)', () => {
	const URL = 'https://mylik.pl/k/abc';
	const text = (c: ClaimResult) => renderShortAnswer(record([c]), URL);

	it('SMS: zdanie główne, potem mała etykieta, pewność, data i odsyłacz', () => {
		for (const c of SCENARIOS.filter((x) => x.verdict !== 'nie_podlega_weryfikacji')) {
			const t = text(c);
			const abstain = c.verdict === 'brak_wystarczajacych_dowodow';
			const order = [
				t.indexOf(abstain ? 'Nie ' : 'podał'),
				t.indexOf(`[${VERDICT_LABELS_PL[c.verdict]}]`),
				abstain ? t.indexOf('zajrzyj na stronę właściwego urzędu') : t.indexOf('Na ile to pewne: średnio'),
				t.indexOf('Stan źródeł na'),
				t.indexOf(abstain ? 'Zobacz szczegóły' : 'Zobacz, skąd to wiem'),
			];
			expect(order.every((i) => i >= 0), t).toBe(true);
			expect([...order].sort((a, b) => a - b), t).toEqual(order);
		}
	});

	it('trzy przykładowe odpowiedzi mają zdanie relacjonujące źródło i cytat bez zmian', () => {
		expect(text(SCENARIOS[0]!)).toMatch(/^Rządowe Centrum Bezpieczeństwa podał 20\.11\.2026 to samo: „/);
		expect(text(SCENARIOS[1]!)).toMatch(/^Rządowe Centrum Bezpieczeństwa podał 20\.11\.2026 co innego: „/);
		expect(text(SCENARIOS[3]!)).toMatch(/^Nie znalazłem tego w sprawdzonych źródłach\. Nie wiem, czy to prawda\. \[brak wystarczających dowodów\]/);
	});

	it('opinia nie dostaje pewności', () => {
		expect(text(SCENARIOS[6]!)).not.toContain('Na ile to pewne');
	});

	it('nie wpisuje przykładu wzorca z briefu jako treści', () => {
		for (const c of SCENARIOS) expect(text(c)).not.toMatch(/GIS|Bydgoszcz/);
	});

	it('stan źródeł to sama data, a godzina sprawdzenia jest osobnym zdaniem w czasie polskim', () => {
		expect(asOfStamp('2026-11-21T11:05:00Z')).toBe('Stan źródeł na 21.11.2026.');
		expect(asOfStamp('2026-11-21T11:05:00Z', '2026-11-21T11:05:00Z')).toBe('Stan źródeł na 21.11.2026. Sprawdzono 21.11.2026, 12:05.');
		expect(asOfStamp('2026-11-21')).toBe('Stan źródeł na 21.11.2026.');
	});

	it('odnośnik przy wstrzymaniu to "Zobacz szczegóły", w pozostałych wynikach "Zobacz, skąd to wiem"', () => {
		for (const c of SCENARIOS) {
			const expected = c.verdict === 'brak_wystarczajacych_dowodow' ? 'Zobacz szczegóły' : 'Zobacz, skąd to wiem';
			expect(buildResultLayout(c, ASOF).evidenceLink).toBe(expected);
		}
	});

	it('godzina: zimą CET (+1), latem CEST (+2), data po północy też w czasie polskim', () => {
		expect(checkedAtStamp('2026-01-15T10:00:00Z')).toBe('Sprawdzono 15.01.2026, 11:00.');
		expect(checkedAtStamp('2026-07-15T10:00:00Z')).toBe('Sprawdzono 15.07.2026, 12:00.');
		expect(asOfSentence('2026-11-21T23:30:00Z')).toBe('Stan źródeł na 22.11.2026.');
	});

	it('brak dowodów: bez wskaźnika i bez słowa "wcale", jedno zdanie co dalej', () => {
		const t = text(SCENARIOS[3]!);
		expect(t).not.toContain('Na ile to pewne');
		expect(t).not.toContain('wcale');
		expect(t).toContain('zajrzyj na stronę właściwego urzędu');
	});
});
