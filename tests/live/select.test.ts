import { describe, expect, it } from 'vitest';
import type { AcceptedEvidence } from '../../src/engine/citations';
import { claimDate, dateMatches, properNames, selectLiveEvidence } from '../../src/live/select';
import { claim, passage } from '../engine/fakes';

const NOW = new Date('2026-11-21T12:00:00Z');

function ev(id: string, stance: AcceptedEvidence['stance'], text: string, publishedAt: string | null, title = 'Relacja'): AcceptedEvidence {
  const p = passage(`live:${id}#0`, text, { documentId: `live:${id}`, publishedAt, title, layer: 'media_i_instytucje' });
  return { passage: p, stance, quote: text.slice(0, 30), rank: 0, ...(stance === 'rozbieznosc_kontekstu' ? { mismatch: 'data' as const } : {}) };
}

describe('dane z twierdzenia', () => {
  it('nazwy własne bez pierwszego wyrazu zdania, rdzenie mimo odmiany', () => {
    expect(properNames('Polska wygrała ze Szwecją we Wrocławiu.')).toEqual(['szwec', 'wrocł']);
  });
  it('data: dzień i miesiąc, sam miesiąc z rokiem, sam rok, brak', () => {
    expect(claimDate('Mecz 17 listopada 2026 roku')).toEqual({ day: 17, month: 11, year: 2026 });
    expect(claimDate('mecz 17.11.2026')).toEqual({ day: 17, month: 11, year: 2026 });
    expect(claimDate('w listopadzie 2026 roku')).toEqual({ month: 11, year: 2026 });
    expect(claimDate('w 2025 roku')).toEqual({ year: 2025 });
    expect(claimDate('Polska wygrała ostatni mecz')).toBeNull();
  });
  it('zgodność daty z treścią lub datą publikacji', () => {
    const d = { day: 17, month: 11, year: 2026 };
    expect(dateMatches(d, 'Mecz rozegrano 17 listopada.', null, NOW)).toBe(true);
    expect(dateMatches(d, 'bez daty', '2026-11-18', NOW)).toBe(true);
    expect(dateMatches(d, 'bez daty', '2026-09-28', NOW)).toBe(false);
    expect(dateMatches({ month: 11, year: 2026 }, 'x', '2026-09-28', NOW)).toBe(false);
    expect(dateMatches({ month: 11, year: 2026 }, 'x', '2026-11-14', NOW)).toBe(true);
  });
});

describe('dobór dowodów drugiej warstwy', () => {
  it('(a) obala i rozbieżność z drugiej warstwy odpadają: nigdy fałszywe ani wprowadzające w błąd', () => {
    const c = claim('Polska wygrała ze Szwecją 2:0 17 listopada 2026.');
    const s = selectLiveEvidence(c, [ev('a', 'obala', 'Polska zremisowała ze Szwecją 1:1 17 listopada.', '2026-11-18'), ev('b', 'rozbieznosc_kontekstu', 'Szwecja 17 listopada', '2026-11-18')], NOW);
    expect(s.accepted).toEqual([]);
    expect(s.reasons).toMatchObject({ nie_potwierdza: 2 });
  });

  it('(a) potwierdza i przeciw w tej warstwie: warstwa milczy', () => {
    const c = claim('Polska wygrała ze Szwecją 17 listopada 2026.');
    const s = selectLiveEvidence(c, [ev('a', 'potwierdza', 'Polska wygrała ze Szwecją 17 listopada.', '2026-11-18'), ev('b', 'obala', 'Polska przegrała ze Szwecją 17 listopada.', '2026-11-18')], NOW);
    expect(s.accepted.filter((a) => a.stance !== 'kontekst')).toEqual([]);
  });

  it('(b) inne zdarzenie: inny miesiąc albo brak nazwy własnej odpada', () => {
    const c = claim('Polska wygrała ze Szwecją w listopadzie 2026.');
    const wrongMonth = ev('a', 'potwierdza', 'Polska wygrała ze Szwecją w meczu ligi.', '2026-09-28');
    const wrongName = ev('b', 'potwierdza', 'Polska wygrała z Norwegią w meczu ligi.', '2026-11-14');
    const ok = ev('c', 'potwierdza', 'Polska wygrała ze Szwecją w meczu ligi.', '2026-11-18');
    const s = selectLiveEvidence(c, [wrongMonth, wrongName, ok], NOW);
    expect(s.accepted.map((a) => a.passage.id)).toEqual(['live:c#0']);
    expect(s.reasons).toMatchObject({ inna_data: 1, inne_nazwy: 1 });
  });

  it('(b) twierdzenie bez daty: tylko najnowsza strona, z jej datą w odpowiedzi', () => {
    const c = claim('Polska wygrała ze Szwecją.');
    const old = ev('a', 'potwierdza', 'Polska wygrała ze Szwecją 3:1.', '2026-09-28');
    const fresh = ev('b', 'potwierdza', 'Polska wygrała ze Szwecją w rewanżu.', '2026-11-18');
    const undated = ev('c', 'potwierdza', 'Polska wygrała ze Szwecją kiedyś.', null);
    const s = selectLiveEvidence(c, [old, fresh, undated], NOW);
    expect(s.accepted.map((a) => a.passage.id)).toEqual(['live:b#0']);
    expect(s.notices?.[0]?.text).toContain('18.11.2026');
  });
});
