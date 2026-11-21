// Wczytanie weryfikacji redakcji z pliku JSONL do zbioru (typ źródła `factcheck`, warstwa
// `weryfikacja_redakcji`). Treść fragmentów to wyłącznie dosłowne pola wpisu: teza (`claim`) jako
// osobny fragment 0 i uzasadnienie (`body`) podzielone jak w korpusie. Ocena (`rating`) trafia do
// metadanych (tabela document_reviews), więc cytat zostaje dosłownym podciągiem źródła.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { z } from 'zod';
import { chunkText } from './chunk';

const ReviewLineSchema = z.object({
  url: z.string().url(),
  publisher: z.string().optional(),
  kind: z.string().optional(),
  title: z.string().optional(),
  claim: z.string().min(3),
  claimant: z.string().nullable().optional(),
  claimDate: z.string().nullable().optional(),
  rating: z.string().min(1),
  reviewDate: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  fetchedAt: z.string().nullable().optional(),
});
export type ReviewLine = z.infer<typeof ReviewLineSchema>;

export interface ReviewDocument {
  id: string;
  title: string;
  url: string;
  publishedAt: string | null;
  fetchedAt: string | null;
  claim: string;
  claimant: string | null;
  claimDate: string | null;
  rating: string;
  kind: string | null;
  /** Fragmenty: [teza, ...uzasadnienie]. */
  passages: string[];
  contentSha: string;
}

function isoDay(v: string | null | undefined): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(v ?? '');
  return m && !Number.isNaN(Date.parse(`${m[1]}T00:00:00Z`)) ? m[1]! : null;
}

function isoTime(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const clean = (s: string) => s.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();

/** Czyta plik JSONL; złe linie pomija (licznik w `skipped`), powtórzone adresy też. */
export function loadReviewFile(
  file: string,
  rootDir: string,
  sourceId: string,
  opts: { excerptChars?: number } = {},
): { documents: ReviewDocument[]; skipped: number } {
  const path = isAbsolute(file) ? file : join(rootDir, file);
  if (!existsSync(path)) return { documents: [], skipped: 0 };
  const out: ReviewDocument[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    if (!raw.trim()) continue;
    let line: ReviewLine;
    try {
      line = ReviewLineSchema.parse(JSON.parse(raw));
    } catch {
      skipped++;
      continue;
    }
    if (seen.has(line.url)) {
      skipped++;
      continue;
    }
    seen.add(line.url);
    const claim = clean(line.claim);
    let body = clean(line.body ?? '');
    if (opts.excerptChars && body.length > opts.excerptChars) body = body.slice(0, opts.excerptChars);
    const passages = [claim, ...(body ? chunkText(body) : [])];
    const id = `${sourceId}-${createHash('sha256').update(line.url).digest('hex').slice(0, 10)}`;
    const content = JSON.stringify([claim, line.rating, line.claimant ?? null, line.claimDate ?? null, body]);
    out.push({
      id,
      title: clean(line.title ?? '') || claim,
      url: line.url,
      publishedAt: isoDay(line.reviewDate) ?? isoDay(line.claimDate),
      fetchedAt: isoTime(line.fetchedAt),
      claim,
      claimant: line.claimant ? clean(line.claimant) : null,
      claimDate: isoDay(line.claimDate),
      rating: clean(line.rating),
      kind: line.kind ?? null,
      passages,
      contentSha: createHash('sha256').update(content).digest('hex'),
    });
  }
  return { documents: out, skipped };
}
