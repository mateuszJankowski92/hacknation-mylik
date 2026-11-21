import { describe, expect, it } from 'vitest';
import { computeStrength, decideVerdict, isArchival, type RuleEvidence } from '../../src/engine/rules';
import { meta } from './fakes';
import type { SourceMeta } from '../../src/contracts/index';

function ev(doc: string, stance: RuleEvidence['stance'], m: Partial<SourceMeta> = {}, extra: Partial<RuleEvidence> = {}): RuleEvidence {
  return {
    passageId: `${doc}#0`,
    documentId: doc,
    stance,
    source: meta({ documentId: doc, ...m }),
    archival: false,
    rank: 0,
    ...extra,
  };
}

describe('decideVerdict: tabela reguł', () => {
  it('opinia i prognoza -> nie_podlega_weryfikacji', () => {
    expect(decideVerdict('opinia', [ev('a', 'potwierdza')]).verdict).toBe('nie_podlega_weryfikacji');
    expect(decideVerdict('prognoza', []).verdict).toBe('nie_podlega_weryfikacji');
  });
  it('E puste -> brak_wystarczajacych_dowodow (brak_dowodow)', () => {
    const d = decideVerdict('faktograficzna', []);
    expect(d).toMatchObject({ verdict: 'brak_wystarczajacych_dowodow', abstain: 'brak_dowodow' });
    expect(computeStrength(d)).toEqual({ level: 'brak', reasons: ['brak_dowodow'] });
  });
  it('potwierdza i obala z różnych dokumentów -> sprzeczne_zrodla, siła niska', () => {
    const d = decideVerdict('faktograficzna', [ev('a', 'potwierdza'), ev('b', 'obala')]);
    expect(d).toMatchObject({ verdict: 'brak_wystarczajacych_dowodow', abstain: 'sprzeczne_zrodla' });
    expect(computeStrength(d)).toEqual({ level: 'niska', reasons: ['sprzeczne_zrodla'] });
  });
  it('potwierdza i obala z jednego dokumentu -> wstrzymanie się', () => {
    const d = decideVerdict('faktograficzna', [ev('a', 'potwierdza'), { ...ev('a', 'obala'), passageId: 'a#1' }]);
    expect(d.verdict).toBe('brak_wystarczajacych_dowodow');
  });
  it('potwierdza + kontekst -> wprowadzajace_w_blad', () => {
    const d = decideVerdict('faktograficzna', [ev('a', 'potwierdza'), ev('b', 'kontekst')]);
    expect(d.verdict).toBe('wprowadzajace_w_blad');
    expect(d.aligned.map((e) => e.documentId)).toEqual(['a']);
  });
  it('tylko potwierdza -> potwierdzone; tylko obala -> falszywe; tylko kontekst -> brak', () => {
    expect(decideVerdict('faktograficzna', [ev('a', 'potwierdza')]).verdict).toBe('potwierdzone');
    expect(decideVerdict('faktograficzna', [ev('a', 'obala')]).verdict).toBe('falszywe');
    expect(decideVerdict('faktograficzna', [ev('a', 'obala'), ev('b', 'kontekst')]).verdict).toBe('falszywe');
    expect(decideVerdict('faktograficzna', [ev('a', 'kontekst')])).toMatchObject({
      verdict: 'brak_wystarczajacych_dowodow',
      abstain: 'tylko_kontekst',
    });
  });
  it('werdykt nie zależy od typu źródła ani domeny (Z3/Z4)', () => {
    const a = decideVerdict('faktograficzna', [ev('a', 'potwierdza', { sourceType: 'urzedowe' })]);
    const b = decideVerdict('faktograficzna', [ev('a', 'potwierdza', { sourceType: 'media', domain: 'x.example' })]);
    expect(a.verdict).toBe(b.verdict);
  });
});

describe('siła podstawy', () => {
  it('dwie niezależne domeny z urzędowym -> wysoka', () => {
    const d = decideVerdict('faktograficzna', [ev('a', 'potwierdza', { sourceType: 'urzedowe' }), ev('b', 'potwierdza')]);
    expect(computeStrength(d)).toEqual({ level: 'wysoka', reasons: ['zrodlo_urzedowe', 'kilka_niezaleznych_zrodel'] });
  });
  it('niezależne domeny podnoszą siłę względem jednej', () => {
    const one = computeStrength(decideVerdict('faktograficzna', [ev('a', 'potwierdza')]));
    const two = computeStrength(decideVerdict('faktograficzna', [ev('a', 'potwierdza'), ev('b', 'potwierdza')]));
    expect(one.level).toBe('niska');
    expect(one.reasons).toContain('jedno_zrodlo');
    expect(two.level).toBe('srednia');
  });
  it('ta sama domena dwa razy nie jest niezależna', () => {
    const s = computeStrength(
      decideVerdict('faktograficzna', [ev('a', 'potwierdza', { domain: 'same.example' }), ev('b', 'potwierdza', { domain: 'same.example' })]),
    );
    expect(s.level).toBe('niska');
  });
  it('archiwalne dowody obniżają siłę', () => {
    const fresh = computeStrength(
      decideVerdict('faktograficzna', [ev('a', 'potwierdza', { sourceType: 'urzedowe' }), ev('b', 'potwierdza')]),
    );
    const old = computeStrength(
      decideVerdict('faktograficzna', [
        ev('a', 'potwierdza', { sourceType: 'urzedowe' }, { archival: true }),
        ev('b', 'potwierdza', {}, { archival: true }),
      ]),
    );
    expect(fresh.level).toBe('wysoka');
    expect(old.level).toBe('niska');
    expect(old.reasons).toContain('zrodlo_archiwalne');
  });
  it('brak daty publikacji i słabe dopasowanie obniżają siłę', () => {
    const undated = computeStrength(decideVerdict('faktograficzna', [ev('a', 'potwierdza', { sourceType: 'urzedowe', publishedAt: null })]));
    expect(undated.level).toBe('niska');
    const weak = computeStrength(
      decideVerdict('faktograficzna', [ev('a', 'potwierdza', { sourceType: 'urzedowe' }, { rank: 5 })]),
    );
    expect(weak).toEqual({ level: 'niska', reasons: ['zrodlo_urzedowe', 'jedno_zrodlo', 'slabe_dopasowanie'] });
  });
  it('isArchival: próg 24 mies., prawo nigdy archiwalne, brak daty nie jest archiwalny', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(isArchival(meta({ documentId: 'a', publishedAt: '2024-05-01' }), now)).toBe(true);
    expect(isArchival(meta({ documentId: 'a', publishedAt: '2024-07-01' }), now)).toBe(false);
    expect(isArchival(meta({ documentId: 'a', publishedAt: '2010-01-01', sourceType: 'prawo' }), now)).toBe(false);
    expect(isArchival(meta({ documentId: 'a', publishedAt: null }), now)).toBe(false);
    expect(isArchival(meta({ documentId: 'a', publishedAt: '2025-01-01' }), now, 12)).toBe(true);
  });
});
