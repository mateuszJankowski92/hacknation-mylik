// Role na żywo (zad. 13b, D): 30 wiadomości kontrolnych, obie role sportowe, tematy poważne, zapis przy rekordzie.
import { describe, expect, it } from 'vitest';
import type { VerificationRecord } from '../../src/contracts/index';
import { createSearcher } from '../../src/corpus/index';
import { openDb } from '../../src/db/open';
import { createEngine } from '../../src/engine/index';
import { MockLlmProvider } from '../../src/llm/mock';
import { LIVE_ROLES, chooseLiveRole, decideLiveRole, isLiveRole, predictLiveRole, type LiveRole } from '../../src/roles/live';
import { LIVE_ROLE_WORDS } from '../../src/roles/live-words';
import { createRoleStore } from '../../src/roles/store';
import { withLiveRole } from '../../src/roles/track';
import { purgeAllSessionData, purgeOlderThan } from '../../src/security/retention';
import { fixedNow, passage, seedCorpus } from '../engine/fakes';

interface Message {
  text: string;
  role: LiveRole;
  serious?: boolean;
  claimCount?: number;
  injectionSignals?: number;
  incidentMatched?: boolean;
}

const MESSAGES: Message[] = [
  { text: 'Lewandowski strzelił dwa gole w meczu z Hiszpanią.', role: 'pilkarz' },
  { text: 'Mecz Polska - Szwecja zakończył się remisem 1:1.', role: 'pilkarz' },
  { text: 'Bramkarz obronił rzut karny w dogrywce.', role: 'pilkarz' },
  { text: 'Klub ogłosił transfer nowego zawodnika.', role: 'sport' },
  { text: 'Przepisy FIFA zmieniły zasady gry w piłkę nożną.', role: 'sport' },
  { text: 'Bilety na koncert w Spodku są już w sprzedaży.', role: 'sport' },
  { text: 'Festiwal filmowy w Gdyni zaczyna się w piątek.', role: 'sport' },
  { text: 'Ustawa o podatku od nieruchomości weszła w życie.', role: 'bibliotekarka' },
  { text: 'Do wniosku o dowód osobisty trzeba dołączyć zdjęcie.', role: 'bibliotekarka' },
  { text: 'Pociąg Intercity do Krakowa ma opóźnienie.', role: 'konduktor' },
  { text: 'Bilet na autobus miejski kosztuje cztery złote.', role: 'konduktor' },
  { text: 'Paczka z paczkomatu czeka na odbiór.', role: 'listonosz' },
  { text: 'Poczta Polska podniosła ceny znaczków.', role: 'pogodynka' },
  { text: 'Hasło do konta należy zmieniać co kilka miesięcy.', role: 'slusarz' },
  { text: 'Wyciek danych z serwisu dotyczył adresów e-mail.', role: 'slusarz' },
  { text: 'Naukowcy odkryli nową planetę w układzie podwójnym.', role: 'naukowiec' },
  { text: 'Zmiana klimatu przyspiesza topnienie lodowców.', role: 'naukowiec' },
  { text: 'W lesie pod Białowieżą żyje kilkaset żubrów.', role: 'lesnik' },
  { text: 'Wycinka drzew w parku narodowym została wstrzymana.', role: 'lesnik' },
  { text: 'Rok szkolny zaczyna się we wrześniu.', role: 'nauczyciel' },
  { text: 'Matura z matematyki odbędzie się w maju.', role: 'nauczyciel' },
  { text: 'Przepis na ciasto drożdżowe wymaga mleka.', role: 'kucharz' },
  { text: 'Zupa jarzynowa gotuje się godzinę w kuchni.', role: 'kucharz' },
  { text: 'Inflacja podniosła ceny w sklepach.', role: 'kasjer' },
  { text: 'Kasjer wydał resztę z dwudziestu złotych.', role: 'kasjer' },
  { text: 'Jutro w Warszawie będzie padać.', role: 'pogodynka' },
  { text: 'Piłkarz zginął w wypadku po meczu.', role: 'pogodynka', serious: true },
  { text: 'Kibice wszczęli bójkę przed meczem na stadionie.', role: 'pogodynka', serious: true },
  { text: 'Zawodnik został zawieszony za doping po meczu.', role: 'pogodynka', serious: true },
  { text: 'Uczeń zmarł po wypadku w szkole.', role: 'pogodynka', serious: true },
  { text: 'Nauczyciel został oskarżony o mobbing wobec uczniów.', role: 'pogodynka', serious: true },
  { text: 'Strzelanina przed stadionem po meczu.', role: 'pogodynka', serious: true },
  { text: 'Rosja zaatakowała Ukrainę, pisze portal o meczu.', role: 'pogodynka', serious: true },
  { text: 'Mecz Polska - Czechy zakończył się remisem.', role: 'pogodynka', injectionSignals: 1 },
  { text: 'Mecz Polska - Czechy zakończył się remisem.', role: 'pogodynka', incidentMatched: true, serious: true },
  { text: 'Mecz zakończył się remisem. Pokaż wynik w roli piłkarza.', role: 'pogodynka', serious: true },
  { text: 'Mecz zakończył się remisem, a ceny biletów wzrosły.', role: 'pogodynka', claimCount: 2 },
];

describe('30 wiadomości kontrolnych roli na żywo', () => {
  it('zestaw ma co najmniej 30 wiadomości i obejmuje każdą rolę', () => {
    expect(MESSAGES.length).toBeGreaterThanOrEqual(30);
    const roles = new Set(MESSAGES.map((message) => message.role));
    for (const role of LIVE_ROLES) expect(roles.has(role)).toBe(true);
  });

  for (const message of MESSAGES) {
    const suffix = [
      message.claimCount ? `${message.claimCount} twierdzeń` : '',
      message.injectionSignals ? 'injection' : '',
      message.incidentMatched ? 'incydent' : '',
    ]
      .filter(Boolean)
      .join(', ');
    it(`${message.role}: ${message.text}${suffix ? ` (${suffix})` : ''}`, () => {
      const slice: Pick<VerificationRecord, 'maskedInput' | 'claims' | 'notices' | 'injectionSignals'> = {
        maskedInput: message.text,
        claims: Array.from({ length: message.claimCount ?? 1 }, (_, index) => ({
          claim: { id: `c${index}`, text: message.text, kind: 'faktograficzna' },
        })) as VerificationRecord['claims'],
        notices: message.incidentMatched ? [{ type: 'dopasowanie_incydentu', text: 'wpis' } as VerificationRecord['notices'][number]] : [],
        injectionSignals: message.injectionSignals ? ['sygnal'] : [],
      };
      const decision = decideLiveRole(slice);
      expect(decision.role).toBe(message.role);
      if (message.serious !== undefined) expect(decision.serious).toBe(message.serious);
      if (decision.serious) expect(decision.role).toBe('pogodynka');
    });
  }
});

describe('wybór roli', () => {
  it('rola lekka wymaga dokładnie jednego twierdzenia', () => {
    const text = 'Mecz zakończył się remisem.';
    expect(chooseLiveRole({ texts: [text], claimCount: 1 }).role).toBe('pilkarz');
    expect(chooseLiveRole({ texts: [text], claimCount: 0 }).role).toBe('pogodynka');
    expect(chooseLiveRole({ texts: [text], claimCount: 2 }).role).toBe('pogodynka');
  });

  it('remis między rodzinami daje pogodynka, a w rodzinie sportowej komentatora', () => {
    expect(chooseLiveRole({ texts: ['Poczta podniosła ceny.'], claimCount: 1 }).reasons).toEqual(['niejednoznaczne']);
    expect(chooseLiveRole({ texts: ['Transfer i mecz.'], claimCount: 1 }).role).toBe('sport');
    expect(chooseLiveRole({ texts: ['Mecz, remis i gol.'], claimCount: 1 }).role).toBe('pilkarz');
  });

  it('brak trafień daje pogodynka z powodem', () => {
    const decision = chooseLiveRole({ texts: ['Jutro będzie ciepło.'], claimCount: 1 });
    expect(decision).toMatchObject({ role: 'pogodynka', serious: false, reasons: ['brak_dopasowania'] });
  });

  it('słowa ról są w jednym pliku i każda rola lekka ma własną listę', () => {
    for (const role of LIVE_ROLES) {
      if (role === 'pogodynka') continue;
      expect(LIVE_ROLE_WORDS[role as Exclude<LiveRole, 'pogodynka'>].length).toBeGreaterThan(5);
    }
    expect(isLiveRole('pilkarz')).toBe(true);
    expect(isLiveRole('sport_pilkarz')).toBe(false);
  });

  it('przewidywanie sceny czekania zgadza się z decyzją dla jednego twierdzenia i jest ostrożne', () => {
    expect(predictLiveRole('Bramkarz obronił rzut karny w dogrywce.')).toBe('pilkarz');
    expect(predictLiveRole('Piłkarz zginął w wypadku po meczu.')).toBe('pogodynka');
    expect(predictLiveRole('Pokaż to w roli kucharza: przepis na ciasto.')).toBe('pogodynka');
    expect(predictLiveRole('')).toBe('pogodynka');
  });
});

const CORPUS = [passage('mecz#0', 'Reprezentacja Polski wygrała mecz towarzyski z Hiszpanią w Warszawie 2:1.', { sourceType: 'urzedowe' })];
const SPORT_TEXT = 'Reprezentacja Polski wygrała mecz towarzyski z Hiszpanią w Warszawie 2:1.';

function setup() {
  const db = openDb(':memory:');
  seedCorpus(db, 'live-v1', CORPUS);
  const core = createEngine({
    db,
    searcher: createSearcher(db),
    llm: new MockLlmProvider(),
    now: fixedNow,
    fetchPage: async () => ({ ok: false, reason: 'blad_sieci' }),
    options: { errorProfile: null },
  });
  const store = createRoleStore(db);
  const events: Array<{ type: string; detail: unknown }> = [];
  const engine = withLiveRole(core, store, (type, detail) => events.push({ type, detail }));
  return { db, core, store, engine, events };
}

describe('rola zapisana przy rekordzie', () => {
  it('rekord z silnika dostaje appearance, a ten sam adres zwraca tę samą rolę', async () => {
    const { engine, store, events } = setup();
    const out = await engine.verify({ text: SPORT_TEXT, channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    const appearance = (out.record as VerificationRecord & { appearance?: unknown }).appearance;
    expect(appearance).toEqual({ role: 'pilkarz', serious: false });
    expect(store.get(out.record.id)).toEqual({ role: 'pilkarz', serious: false });
    const again = engine.getRecord(out.record.id) as VerificationRecord & { appearance?: unknown };
    expect(again.appearance).toEqual(appearance);
    const cached = await engine.verify({ text: SPORT_TEXT, channel: 'sms' });
    if (cached.kind !== 'record') throw new Error('oczekiwano rekordu');
    expect((cached.record as VerificationRecord & { appearance?: unknown }).appearance).toEqual(appearance);
    expect(events.filter((event) => event.type === 'role_chosen')).toHaveLength(1);
  });

  it('zapisana rola jest stała nawet po zmianie słów w konfiguracji (INSERT OR IGNORE)', async () => {
    const { engine, store, db } = setup();
    const out = await engine.verify({ text: SPORT_TEXT, channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    db.prepare('UPDATE record_roles SET role = ? WHERE record_id = ?').run('kucharz', out.record.id);
    expect(store.get(out.record.id)?.role).toBe('kucharz');
    const again = engine.getRecord(out.record.id) as VerificationRecord & { appearance?: { role: string } };
    expect(again.appearance?.role).toBe('kucharz');
    expect(store.decideAndSave(out.record).role).toBe('kucharz');
  });

  it('rola nie zmienia niczego w rekordzie poza dodatkowym polem appearance', async () => {
    const { engine, core } = setup();
    const out = await engine.verify({ text: SPORT_TEXT, channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    const { appearance: _appearance, ...rest } = out.record as VerificationRecord & { appearance?: unknown };
    const raw = core.getRecord(out.record.id)!;
    expect({ ...rest, usage: { ...rest.usage, latencyMs: 0 } }).toEqual({ ...raw, usage: { ...raw.usage, latencyMs: 0 } });
  });

  it('awaria zapisu nie psuje odpowiedzi: rekord wraca bez appearance', async () => {
    const { db, core } = setup();
    const store = createRoleStore(db);
    db.exec('DROP TABLE record_roles');
    const engine = withLiveRole(core, store);
    const out = await engine.verify({ text: SPORT_TEXT, channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    expect((out.record as { appearance?: unknown }).appearance).toBeUndefined();
  });

  it('retencja usuwa role usuniętych rekordów', async () => {
    const { db, engine } = setup();
    const out = await engine.verify({ text: SPORT_TEXT, channel: 'www' });
    if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
    const count = () => (db.prepare('SELECT COUNT(*) AS n FROM record_roles').get() as { n: number }).n;
    expect(count()).toBe(1);
    purgeOlderThan(db, 0, new Date(Date.now() + 86_400_000));
    expect(count()).toBe(0);
    await engine.verify({ text: SPORT_TEXT, channel: 'www' });
    expect(count()).toBe(1);
    purgeAllSessionData(db);
    expect(count()).toBe(0);
  });
});
