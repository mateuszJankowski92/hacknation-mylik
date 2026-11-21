import { describe, expect, it } from 'vitest';
import {
	SHORT_ANSWER_MAX_CHARS,
	STATES,
	VERDICTS,
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
import { VERDICT_SENTENCES } from '../../src/render/templates';

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
				expect(t, t).toMatch(/[Ss]tan na 21\.11\.2026/);
			}
		}
		for (const s of STATES) {
			const t = renderStateMessage(s, ASOF);
			expect(findForbiddenForms(t), t).toEqual([]);
			expect(t).toContain('Stan na 21.11.2026');
		}
	});

	it('krótka odpowiedź mieści się w limicie i zawiera elementy', () => {
		const long = evidence('potwierdza', {
			source: { ...evidence('potwierdza').source, publisher: 'Bardzo długa nazwa wydawcy '.repeat(10) },
		});
		for (const c of [...SCENARIOS, claim('potwierdzone', [long])]) {
			const text = renderShortAnswer(record([c, c, c]), 'https://mylik.pl/karta/' + 'x'.repeat(60));
			expect(text.length).toBeLessThanOrEqual(SHORT_ANSWER_MAX_CHARS);
			expect(text).toContain('Werdykt:');
			expect(text).toContain('Stan na 21.11.2026');
			expect(text).toContain('Pełna karta: https://mylik.pl/karta/');
		}
		const text = renderShortAnswer(record([SCENARIOS[0]!]), 'https://mylik.pl/k/1');
		expect(text).toContain('Rządowe Centrum Bezpieczeństwa podaje 20.11.2026');
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
