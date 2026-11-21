// E2E silnika: baza :memory:, prawdziwa wyszukiwarka (FTS5) i prawdziwe prepareInput,
// fałszywy dostawca modelu (deterministyczny). Zdania i fragmenty są wymyślone i neutralne.
import { describe, expect, it } from 'vitest';
import { VerificationRecordSchema, type ExtractedClaim, type Stance, type Verdict } from '../../src/contracts/index';
import { createSearcher } from '../../src/corpus/index';
import { openDb } from '../../src/db/open';
import { createEngine } from '../../src/engine/index';
import { ScriptedLlm, fixedNow, passage, seedCorpus } from './fakes';

const CORPUS = [
  passage('most-u#0', 'Wojewoda poinformował, że wiadukt nad torami w Zielonkowie został oddany do ruchu.', {
    sourceType: 'urzedowe',
    domain: 'urzad.example.gov',
  }),
  passage('most-m#0', 'Kierowcy od poniedziałku korzystają z wiaduktu nad torami w Zielonkowie, oddanego do ruchu.', {
    domain: 'gazeta.example.com',
  }),
  passage('port-u#0', 'Komunikat: przystań jachtowa w Brzozówku pozostaje czynna przez cały sezon, bez przerw.', {
    sourceType: 'urzedowe',
    domain: 'gmina.example.gov',
  }),
  passage('fest-a#0', 'Organizatorzy potwierdzili, że koncert plenerowy w Olszynach zgromadził ponad tysiąc osób.', {
    domain: 'kultura.example.org',
  }),
  passage('fest-b#0', 'Według policji koncert plenerowy w Olszynach zgromadził niespełna trzysta osób.', {
    domain: 'policja.example.gov',
    sourceType: 'urzedowe',
  }),
  passage('oplata-u#0', 'Rada uchwaliła podwyżkę opłaty targowej w Jaworzu o dziesięć procent.', {
    sourceType: 'prawo',
    domain: 'dziennik.example.gov',
    publishedAt: '2015-02-01',
  }),
  passage('oplata-k#0', 'Podwyżka opłaty targowej w Jaworzu dotyczy wyłącznie stoisk powyżej dwudziestu metrów.', {
    domain: 'lokalna.example.com',
    publishedAt: '2023-01-15',
  }),
];

type Topic = 'wiadukt' | 'przystań' | 'koncert' | 'opłaty' | 'opinia' | 'kometa';

const STANCES: Record<Topic, Record<string, Stance>> = {
  wiadukt: { 'most-u#0': 'potwierdza', 'most-m#0': 'potwierdza' },
  przystań: { 'port-u#0': 'obala' },
  koncert: { 'fest-a#0': 'potwierdza', 'fest-b#0': 'obala' },
  opłaty: { 'oplata-u#0': 'potwierdza', 'oplata-k#0': 'kontekst' },
  opinia: {},
  kometa: {},
};

function topicOf(text: string): Topic {
  const t = text.toLowerCase();
  if (t.includes('wiadukt')) return 'wiadukt';
  if (t.includes('przystań')) return 'przystań';
  if (t.includes('koncert')) return 'koncert';
  if (t.includes('opłat')) return 'opłaty';
  if (t.startsWith('moim zdaniem')) return 'opinia';
  return 'kometa';
}

function fakeModel() {
  return new ScriptedLlm(
    (text): ExtractedClaim[] => {
      const topic = topicOf(text);
      return [
        {
          id: 'c1',
          text: text.trim(),
          kind: topic === 'opinia' ? 'opinia' : 'faktograficzna',
          searchTerms: [topic],
        },
      ];
    },
    (req) => {
      const table = STANCES[topicOf(req.claim.text)];
      return req.passages.map((p) => {
        const stance = table[p.id] ?? 'bez_zwiazku';
        return { passageId: p.id, stance, quote: stance === 'bez_zwiazku' ? '' : p.text.slice(0, 50) };
      });
    },
  );
}

function makeEngine() {
  const db = openDb(':memory:');
  seedCorpus(db, 'e2e-v1', CORPUS);
  const engine = createEngine({ db, searcher: createSearcher(db), llm: fakeModel(), now: fixedNow });
  return { db, engine };
}

const CASES: { text: string; verdict: Verdict }[] = [
  { text: 'Wiadukt nad torami w Zielonkowie oddano do ruchu.', verdict: 'potwierdzone' },
  { text: 'Przystań jachtowa w Brzozówku została zamknięta na cały sezon.', verdict: 'falszywe' },
  { text: 'Koncert plenerowy w Olszynach zgromadził tysiąc osób.', verdict: 'brak_wystarczajacych_dowodow' },
  { text: 'Opłaty targowe w Jaworzu wzrosły o dziesięć procent dla wszystkich.', verdict: 'wprowadzajace_w_blad' },
  { text: 'Moim zdaniem nowe ławki w parku są brzydkie.', verdict: 'nie_podlega_weryfikacji' },
  { text: 'Nad Kwiatkowem przeleciała jasna kometa widoczna gołym okiem.', verdict: 'brak_wystarczajacych_dowodow' },
];

describe('E2E silnika: wszystkie werdykty osiągalne', () => {
  for (const c of CASES) {
    it(`${c.verdict}: ${c.text}`, async () => {
      const { engine } = makeEngine();
      const out = await engine.verify({ text: c.text, channel: 'www' });
      if (out.kind !== 'record') throw new Error(`oczekiwano rekordu, jest ${JSON.stringify(out)}`);
      expect(VerificationRecordSchema.safeParse(out.record).success).toBe(true);
      expect(out.record.corpusVersion).toBe('e2e-v1');
      expect(out.record.claims[0]!.verdict).toBe(c.verdict);
    });
  }

  it('sprzeczne źródła: obie strony w dowodach, siła niska', async () => {
    const { engine } = makeEngine();
    const out = await engine.verify({ text: CASES[2]!.text, channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    const c = out.record.claims[0]!;
    expect(c.strength).toEqual({ level: 'niska', reasons: ['sprzeczne_zrodla'] });
    expect(c.evidence.map((e) => e.stance).sort()).toEqual(['obala', 'potwierdza']);
  });

  it('wprowadzające w błąd: kontekst archiwalny oznaczony, akt prawny nie jest archiwalny', async () => {
    const { engine } = makeEngine();
    const out = await engine.verify({ text: CASES[3]!.text, channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    const c = out.record.claims[0]!;
    const byId = Object.fromEntries(c.evidence.map((e) => [e.passageId, e]));
    expect(byId['oplata-u#0']!.archival).toBe(false);
    expect(byId['oplata-k#0']!.archival).toBe(true);
    expect(c.limitations.some((l) => l.includes('archiwalnych'))).toBe(true);
    expect(out.record.notices.some((n) => n.type === 'material_archiwalny' && n.passageId === 'oplata-k#0')).toBe(true);
  });

  it('cytaty są dosłownymi podciągami fragmentów, metadane z bazy', async () => {
    const { engine } = makeEngine();
    const out = await engine.verify({ text: CASES[0]!.text, channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    for (const e of out.record.claims[0]!.evidence) {
      const p = CORPUS.find((x) => x.id === e.passageId)!;
      expect(p.text.includes(e.quote)).toBe(true);
      expect(e.source.url).toBe(p.meta.url);
    }
    expect(out.record.claims[0]!.strength.level).toBe('wysoka');
  });

  it('stany przez prawdziwe prepareInput: URL i zbyt krótkie wejście', async () => {
    const { engine } = makeEngine();
    expect(await engine.verify({ url: 'https://example.org/artykul', channel: 'www' })).toMatchObject({
      kind: 'state',
      state: 'brak_mozliwosci_sprawdzenia',
    });
    expect(await engine.verify({ text: 'ok', channel: 'www' })).toMatchObject({
      kind: 'state',
      state: 'potrzeba_doprecyzowania',
    });
  });

  it('pusty korpus z prawdziwą wyszukiwarką -> brak_mozliwosci_sprawdzenia', async () => {
    const db = openDb(':memory:');
    const engine = createEngine({ db, searcher: createSearcher(db), llm: fakeModel(), now: fixedNow });
    expect(await engine.verify({ text: CASES[0]!.text, channel: 'www' })).toMatchObject({
      state: 'brak_mozliwosci_sprawdzenia',
    });
  });
});
