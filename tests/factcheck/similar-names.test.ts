import { describe, expect, it } from 'vitest';
import type { ExtractedClaim, Passage } from '../../src/contracts/index';
import type { AcceptedEvidence } from '../../src/engine/citations';
import { selectReviewEvidence, sharesProperNames } from '../../src/factcheck/layer';

const NOW = new Date('2026-11-20T10:00:00Z');

function claimOf(text: string): ExtractedClaim {
  return { id: 'c1', text, kind: 'faktograficzna' };
}

function entry(thesis: string, stance: AcceptedEvidence['stance'], title = `Analiza: ${thesis}`): AcceptedEvidence {
  const passage: Passage = {
    id: 'fc:aaaa#bbbb',
    documentId: 'fc:aaaa',
    text: thesis,
    meta: {
      documentId: 'fc:aaaa',
      sourceId: 'fc-demagog',
      title,
      publisher: 'Demagog',
      domain: 'demagog.org.pl',
      url: 'https://demagog.org.pl/wypowiedzi/test',
      publishedAt: '2026-05-20',
      fetchedAt: NOW.toISOString(),
      sourceType: 'factcheck',
      license: 'test',
      layer: 'weryfikacja_redakcji',
      review: { claimReviewed: thesis, claimant: null, claimDate: null, rating: 'Fałsz', label: 'falszywe' },
    },
  };
  return { passage, stance, quote: thesis, rank: 0 };
}

describe('blok "podobna sprawa": zgodne nazwy własne', () => {
  const claim = claimOf('Czy od przyszłego tygodnia w Zielonowie bilety na tramwaj będą darmowe dla wszystkich?');

  it('inne miasto: odrzucone jako niepowiązane', () => {
    const sel = selectReviewEvidence(claim, [entry('Koszty komunikacji w Brzozowie rosną co roku', 'kontekst')], NOW);
    expect(sel.accepted).toHaveLength(0);
    expect(sel.reasons?.podobna_inne_nazwy).toBe(1);
  });

  it('inne miasto przy ocenie odmiennej tezy (rozbieżność kontekstu): też odrzucone', () => {
    const sel = selectReviewEvidence(claim, [entry('Bilety w Brzozowie są darmowe', 'rozbieznosc_kontekstu')], NOW);
    expect(sel.accepted).toHaveLength(0);
  });

  it('to samo miasto w innej odmianie: pokazane jako tło z oceną', () => {
    const sel = selectReviewEvidence(claim, [entry('Przejazdy komunikacją w Zielonowa kosztują coraz więcej', 'kontekst')], NOW);
    expect(sel.accepted).toHaveLength(1);
    expect(sel.accepted[0]!.stance).toBe('kontekst');
    expect(sel.accepted[0]!.passage.meta.review?.rating).toBe('Fałsz');
  });

  it('nazwa w tytule wpisu wystarcza', () => {
    const sel = selectReviewEvidence(claim, [entry('Przejazdy kosztują coraz więcej', 'kontekst', 'Zielonowo: ceny biletów')], NOW);
    expect(sel.accepted).toHaveLength(1);
  });

  it('miasto z samogłoską ó w mianowniku i w odmianie: te same rdzenie po złożeniu znaków', () => {
    const c = claimOf('Czy w Krakowie bilety na tramwaj będą darmowe?');
    const sel = selectReviewEvidence(c, [entry('Ceny biletów w Kraków rosną', 'kontekst')], NOW);
    expect(sel.accepted).toHaveLength(1);
  });

  it('brak nazw własnych w twierdzeniu: bez zmian, wpis zostaje', () => {
    const c = claimOf('Czy od przyszłego tygodnia bilety na tramwaj będą darmowe dla wszystkich?');
    const sel = selectReviewEvidence(c, [entry('Koszty komunikacji w Brzozowie rosną co roku', 'kontekst')], NOW);
    expect(sel.accepted).toHaveLength(1);
    expect(sel.reasons?.podobna_inne_nazwy).toBeUndefined();
  });

  it('inna instytucja: odrzucone', () => {
    const c = claimOf('Czy w tym roku Wodociągi ogłosiły podwyżkę opłat dla Kowalewa?');
    const sel = selectReviewEvidence(c, [entry('Zarząd Gospodarki Komunalnej ogłosił podwyżkę opłat w Nowogrodzie', 'kontekst')], NOW);
    expect(sel.accepted).toHaveLength(0);
  });

  it('ta sama osoba (imię i nazwisko): pokazane', () => {
    const c = claimOf('Czy w tym roku Jan Kowalski zapowiedział darmowe bilety?');
    const sel = selectReviewEvidence(c, [entry('Jan Kowalski mówił o cenach biletów', 'kontekst')], NOW);
    expect(sel.accepted).toHaveLength(1);
  });

  it('inna osoba z tym samym nazwiskiem (inne imię): odrzucone', () => {
    const c = claimOf('Czy w tym roku Jan Kowalski zapowiedział darmowe bilety?');
    const sel = selectReviewEvidence(c, [entry('Adam Nowicki mówił o cenach biletów', 'kontekst')], NOW);
    expect(sel.accepted).toHaveLength(0);
  });
});

describe('bramka nie zmienia bezpośrednich odpowiedzi', () => {
  const claim = claimOf('Czy w tym roku w Zielonowie policja ogłosiła najwyższy stopień alarmowy?');

  it('ta sama teza ze zgodnymi nazwami nadal daje bezpośrednie stanowisko', () => {
    const sel = selectReviewEvidence(claim, [entry('Policja w Zielonowie ogłosiła najwyższy stopień alarmowy', 'potwierdza')], NOW);
    expect(sel.accepted).toHaveLength(1);
    expect(sel.accepted[0]!.stance).toBe('obala');
  });

  it('ta sama teza z innym miastem nadal odpada regułą nazw', () => {
    const sel = selectReviewEvidence(claim, [entry('Policja w Brzozowie ogłosiła najwyższy stopień alarmowy', 'potwierdza')], NOW);
    expect(sel.accepted).toHaveLength(0);
    expect(sel.reasons?.inne_nazwy).toBe(1);
  });

  it('bramka nigdy nie zamienia tła w dowód', () => {
    const sel = selectReviewEvidence(claim, [entry('Zielonowo: ceny biletów rosną', 'kontekst')], NOW);
    expect(sel.accepted.every((a) => a.stance === 'kontekst')).toBe(true);
  });
});

describe('sharesProperNames', () => {
  it('bez nazw przepuszcza, z nazwą wymaga rdzenia w tekście', () => {
    expect(sharesProperNames([], 'cokolwiek')).toBe(true);
    expect(sharesProperNames(['zielo'], 'W Zielonowie')).toBe(true);
    expect(sharesProperNames(['zielo'], 'W Brzozowie')).toBe(false);
  });
});
