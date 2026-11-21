import { describe, expect, it } from 'vitest';
import { computeStrength, decideVerdict, type RuleEvidence } from '../../src/engine/rules';
import { meta } from '../engine/fakes';

const ev = (doc: string, over: Partial<RuleEvidence['source']> = {}): RuleEvidence => ({
  passageId: `${doc}#0`,
  documentId: doc,
  stance: 'potwierdza',
  source: meta({ documentId: doc, sourceType: 'urzedowe', ...over }),
  archival: false,
  rank: 0,
});

describe('siła podstawy z drugiej warstwy', () => {
  it('sama druga warstwa: najwyżej średnia i jawna przesłanka "źródło wtórne"; werdykt bez zmian', () => {
    const live = [ev('a', { layer: 'media_i_instytucje' }), ev('b', { layer: 'media_i_instytucje' })];
    const d = decideVerdict('faktograficzna', live);
    expect(d.verdict).toBe('potwierdzone');
    expect(computeStrength(d)).toEqual({ level: 'srednia', reasons: ['zrodlo_urzedowe', 'kilka_niezaleznych_zrodel', 'zrodlo_wtorne'] });
  });

  it('z dowodem urzędowym: bez ograniczenia (jak dotąd)', () => {
    const d = decideVerdict('faktograficzna', [ev('a'), ev('b', { layer: 'media_i_instytucje' })]);
    expect(computeStrength(d).level).toBe('wysoka');
    expect(computeStrength(d).reasons).not.toContain('zrodlo_wtorne');
  });

  it('ten sam zestaw stanowisk daje ten sam werdykt niezależnie od warstwy', () => {
    const a = decideVerdict('faktograficzna', [{ ...ev('a'), stance: 'obala' }]);
    const b = decideVerdict('faktograficzna', [{ ...ev('a', { layer: 'media_i_instytucje' }), stance: 'obala' }]);
    expect(a.verdict).toBe(b.verdict);
  });
});
