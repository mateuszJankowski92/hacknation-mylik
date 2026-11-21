// FIXTURE: wymyślone, neutralne dane do podglądu i testów. Nie są częścią produkcyjnego bundla.
import type { ClaimResult, EvidenceItem, VerificationRecord, VerifyOutcome } from '../../../src/contracts/record';
import type { Verdict } from '../../../src/contracts/verdict';

const FIXTURE_QUOTE = 'Biblioteka miejska jest czynna od poniedziałku do piątku w godzinach 9:00-17:00.';

const FIXTURE_EVIDENCE: EvidenceItem = {
	passageId: 'fixture-doc-1#0',
	stance: 'potwierdza',
	quote: FIXTURE_QUOTE,
	source: {
		documentId: 'fixture-doc-1',
		sourceId: 'fixture-source',
		title: 'Przykładowy komunikat o godzinach otwarcia',
		publisher: 'Przykładowy Urząd Miasta',
		domain: 'przyklad.example',
		url: 'https://przyklad.example/komunikat',
		publishedAt: '2025-03-14',
		fetchedAt: '2026-01-10T09:30:00+01:00',
		sourceType: 'urzedowe',
		license: 'CC BY 4.0',
	},
	archival: false,
};

function buildRecord(idChar: string, claims: ClaimResult[]): VerificationRecord {
	return {
		id: idChar.repeat(64),
		inputHash: idChar.repeat(64),
		corpusVersion: 'fixture-2026-01',
		inputKind: 'tekst',
		maskedInput: 'Przykładowa treść zgłoszenia.',
		piiMasked: [],
		claims,
		notices: [],
		injectionSignals: [],
		createdAt: '2026-01-10T10:00:00+01:00',
		asOf: '2026-01-10T09:30:00+01:00',
		shortAnswer: `Stan na 2026-01-10: ${claims.map((c) => c.verdict).join(' | ') || 'brak twierdzeń do oceny.'}`,
		provider: 'mock',
		usage: { llmCalls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, latencyMs: 0 },
		schemaVersion: 2,
	};
}

function buildClaim(verdict: Verdict, overrides: Partial<ClaimResult> = {}): ClaimResult {
	return {
		claim: { id: 'c1', text: 'Biblioteka miejska jest czynna w weekendy.', kind: 'faktograficzna' },
		verdict,
		strength: { level: 'wysoka', reasons: ['zrodlo_urzedowe', 'kilka_niezaleznych_zrodel'] },
		explanation: 'Uzasadnienie przykładowe: źródło urzędowe opisuje godziny otwarcia biblioteki.',
		explanationSource: 'szablon',
		evidence: [FIXTURE_EVIDENCE],
		limitations: [],
		refutation: { performed: false, queries: [], found: 0 },
		...overrides,
	};
}

export const FIXTURE_OUTCOMES: Record<string, VerifyOutcome> = {
	potwierdzone: {
		kind: 'record',
		cached: false,
		record: buildRecord('a', [buildClaim('potwierdzone')]),
	},
	falszywe: {
		kind: 'record',
		cached: false,
		record: buildRecord('b', [
			buildClaim('falszywe', {
				evidence: [{ ...FIXTURE_EVIDENCE, stance: 'obala' }],
				strength: { level: 'srednia', reasons: ['jedno_zrodlo', 'zrodlo_urzedowe'] },
			}),
		]),
	},
	wprowadzajace_w_blad: {
		kind: 'record',
		cached: false,
		record: buildRecord('c', [
			buildClaim('wprowadzajace_w_blad', {
				evidence: [{ ...FIXTURE_EVIDENCE, stance: 'kontekst', archival: true }],
				strength: { level: 'niska', reasons: ['zrodlo_archiwalne', 'sprzeczne_zrodla'] },
				limitations: ['Nie znalazłem nowszego komunikatu na ten temat.'],
			}),
		]),
	},
	brak_wystarczajacych_dowodow: {
		kind: 'record',
		cached: false,
		record: buildRecord('d', [
			buildClaim('brak_wystarczajacych_dowodow', {
				strength: { level: 'brak', reasons: ['brak_dowodow'] },
				evidence: [],
				explanation: 'W zbiorze źródeł nie ma fragmentów, które dotyczą tego twierdzenia.',
				abstainReason: 'Żadne źródło w zbiorze nie omawia tego twierdzenia.',
			}),
		]),
	},
	nie_podlega_weryfikacji: {
		kind: 'record',
		cached: false,
		record: {
			...buildRecord('e', [
				buildClaim('nie_podlega_weryfikacji', {
					claim: { id: 'c1', text: 'Ta biblioteka jest najładniejsza w mieście.', kind: 'opinia' },
					strength: { level: 'brak', reasons: [] },
					evidence: [],
					explanation: 'To jest opinia, a nie fakt, który można sprawdzić w źródłach.',
				}),
			]),
			piiMasked: [{ type: 'telefon', count: 1 }],
			injectionSignals: ['polecenie_w_tresci'],
		},
	},
	awaria_techniczna: {
		kind: 'state',
		state: 'awaria_techniczna',
		message: 'Usługa analizy tekstu chwilowo nie odpowiada.',
	},
	brak_mozliwosci_sprawdzenia: {
		kind: 'state',
		state: 'brak_mozliwosci_sprawdzenia',
		message: 'Nie udało mi się pobrać treści spod tego adresu.',
	},
	potrzeba_doprecyzowania: {
		kind: 'state',
		state: 'potrzeba_doprecyzowania',
		message: 'Treść jest zbyt ogólna, żeby wskazać konkretne twierdzenie do sprawdzenia.',
	},
};

const LONG_QUESTION =
	'Czy to prawda, że biblioteka miejska jest czynna w weekendy i w święta, bo koleżanka z pracy mówiła, że widziała ogłoszenie na drzwiach i ktoś jeszcze pisał o tym w grupie osiedlowej na Facebooku?';

const LONG_QUOTE =
	'Biblioteka Miejska w Przykładowie jest czynna od poniedziałku do piątku w godzinach 9:00-17:00, a w soboty od 10:00 do 14:00. W niedziele i święta biblioteka jest nieczynna.';

const KNOWN_OP_NOTICE = {
	type: 'dopasowanie_incydentu' as const,
	text: 'Podobna wiadomość została opisana przez EUvsDisinfo 2025-03-01: „Biblioteki miejskie zostaną zamknięte w całym kraju” https://euvsdisinfo.eu/report/przyklad Stan na 21.11.2026.',
};

function longRecord(idChar: string, claims: ClaimResult[]): VerificationRecord {
	return {
		...buildRecord(idChar, claims),
		maskedInput: LONG_QUESTION,
		notices: [KNOWN_OP_NOTICE],
	};
}

FIXTURE_OUTCOMES.potwierdzone_dlugie = {
	kind: 'record',
	cached: false,
	record: longRecord('f', [
		buildClaim('potwierdzone', {
			claim: { id: 'c1', text: 'Biblioteka miejska jest czynna w weekendy.', kind: 'faktograficzna' },
			directAnswer: 'Tak, ale tylko w soboty.',
			evidence: [
				{ ...FIXTURE_EVIDENCE, quote: LONG_QUOTE },
				{ ...FIXTURE_EVIDENCE, passageId: 'fixture-doc-2#0', stance: 'kontekst', quote: 'W święta państwowe biblioteka jest nieczynna.' },
			],
			refutation: { performed: true, queries: ['biblioteka nieczynna w weekendy'], found: 0 },
		}),
	]),
};

FIXTURE_OUTCOMES.kilka_twierdzen = {
	kind: 'record',
	cached: false,
	record: {
		...buildRecord('9', [
			buildClaim('potwierdzone', { claim: { id: 'c1', text: 'Biblioteka miejska jest czynna w soboty.', kind: 'faktograficzna' }, evidence: [{ ...FIXTURE_EVIDENCE, quote: LONG_QUOTE }] }),
			buildClaim('falszywe', {
				claim: { id: 'c2', text: 'Biblioteka jest czynna w niedziele.', kind: 'faktograficzna' },
				evidence: [{ ...FIXTURE_EVIDENCE, passageId: 'fixture-doc-1#1', stance: 'obala', quote: 'W niedziele i święta biblioteka jest nieczynna.' }],
			}),
			buildClaim('brak_wystarczajacych_dowodow', {
				claim: { id: 'c3', text: 'Wstęp do biblioteki jest bezpłatny dla wszystkich.', kind: 'faktograficzna' },
				strength: { level: 'brak', reasons: ['brak_dowodow'] },
				evidence: [],
				abstainReason: 'Żadne źródło w zbiorze nie omawia tego twierdzenia.',
			}),
		]),
		maskedInput: 'Biblioteka jest czynna w soboty i w niedziele, a wstęp jest bezpłatny dla wszystkich.',
	},
};

export const FIXTURE_QUOTE_TEXT = FIXTURE_QUOTE;
