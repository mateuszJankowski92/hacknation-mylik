// Zad. 30: ocena stanowisk na Basalu (atrapa serwera, bez sieci): stanowisko z pięciu i zdanie fragmentu jako cytat.
import { describe, expect, it } from 'vitest';
import type { AssessRequest } from '../../src/contracts/index';
import { BasalClient, type FetchLike } from '../../src/llm/basal';
import { assessWithBasal, buildAssessRequest, splitSentences, withBasalAssess, type BasalAssessEvent } from '../../src/llm/basalAssess';
import { MockLlmProvider } from '../../src/llm/mock';

const TEXT = 'Burmistrz zabrał głos. Most oddano do ruchu 12 maja. Ma 300 m długości.';

function server(answers: Record<string, unknown> | 'error') {
  const bodies: Record<string, unknown>[] = [];
  const fetch: FetchLike = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    if (answers === 'error') return { ok: false, status: 500, json: async () => ({ error: 'x' }) };
    return { ok: true, status: 200, json: async () => ({ model: 'basal-2.0', answers, usage: { input_tokens: 50, latency_ms: 9 } }) };
  };
  return { client: new BasalClient({ baseUrl: 'http://h', fetch }), bodies };
}

const req: AssessRequest = {
  claim: { id: 'c1', text: 'Most ma 300 m.', kind: 'faktograficzna' } as AssessRequest['claim'],
  passages: [{ id: 'm#0', text: TEXT }],
};

describe('assessWithBasal', () => {
  it('zdania to dosłowne wycinki; pytanie o zdanie warunkowe', () => {
    const s = splitSentences(TEXT);
    expect(s).toEqual(['Burmistrz zabrał głos.', 'Most oddano do ruchu 12 maja.', 'Ma 300 m długości.']);
    for (const x of s) expect(TEXT.includes(x)).toBe(true);
    const b = buildAssessRequest('A', TEXT, s) as { questions: Record<string, { ask_if?: object; criteria: object }> };
    expect(Object.keys(b.questions)).toEqual(['stanowisko', 'zdanie', 'szczegol']);
    expect(Object.keys(b.questions.stanowisko!.criteria)).toHaveLength(5);
    expect(Object.keys(buildAssessRequest('A', 'Jedno zdanie.', ['Jedno zdanie.']).questions as object)).not.toContain('zdanie');
  });
  it('stanowisko i cytat z wybranego zdania', async () => {
    const { client } = server({
      stanowisko: { type: 'choice', choice: 'potwierdza', probabilities: {}, confidence: 0.9 },
      zdanie: { type: 'choice', choice: 'z2', probabilities: {}, confidence: 0.8 },
      szczegol: null,
    });
    const events: BasalAssessEvent[] = [];
    const r = await assessWithBasal(req, { client, minConfidence: 0.6, onEvent: (e) => events.push(e) });
    expect(r.assessments).toEqual([{ passageId: 'm#0', stance: 'potwierdza', quote: 'Ma 300 m długości.', injectionSuspected: false }]);
    expect(events[0]).toMatchObject({ type: 'assess_basal', confidence: 0.9 });
  });
  it('niska pewność stanowiska rozstrzygającego -> kontekst; rozbieżność dostaje rodzaj', async () => {
    const low = server({
      stanowisko: { type: 'choice', choice: 'obala', probabilities: {}, confidence: 0.4 },
      zdanie: { type: 'choice', choice: 'z1', probabilities: {}, confidence: 0.8 },
    });
    expect((await assessWithBasal(req, { client: low.client, minConfidence: 0.6 })).assessments[0]!.stance).toBe('kontekst');
    const mis = server({
      stanowisko: { type: 'choice', choice: 'rozbieznosc_kontekstu', probabilities: {}, confidence: 0.9 },
      zdanie: { type: 'choice', choice: 'z1', probabilities: {}, confidence: 0.8 },
      szczegol: { type: 'choice', choice: 'data', probabilities: {}, confidence: 0.7 },
    });
    expect((await assessWithBasal(req, { client: mis.client, minConfidence: 0.6 })).assessments[0]).toMatchObject({
      stance: 'rozbieznosc_kontekstu',
      mismatch: 'data',
    });
  });
  it('błąd Basala -> ocena dostawcy zapasowego, zdarzenie assess_fallback', async () => {
    const { client } = server('error');
    const events: BasalAssessEvent[] = [];
    const llm = withBasalAssess(new MockLlmProvider(), { client, minConfidence: 0.6, onEvent: (e) => events.push(e) });
    const r = await llm.assessPassages(req);
    expect(r.assessments).toHaveLength(1);
    expect(events).toEqual([{ type: 'assess_fallback', reason: 'http_error', fallback: 'mock' }]);
  });
});
