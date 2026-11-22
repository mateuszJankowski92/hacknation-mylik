import type { ClaimResult } from '../../../src/contracts/record';
import { VERDICTS, type Verdict } from '../../../src/contracts/verdict';
import { countNoun } from '../../../src/render/plural';
import { ResultTag } from './ResultTag';

export const FRAGMENTS_TEXTS = {
	title: 'Fragmenty zgłoszenia',
} as const;

export function verdictCounts(claims: ClaimResult[]): { verdict: Verdict; count: number }[] {
	return VERDICTS.map((verdict) => ({ verdict, count: claims.filter((result) => result.verdict === verdict).length })).filter(
		(entry) => entry.count > 0,
	);
}

export function ClaimTagsSummary({ claims }: { claims: ClaimResult[] }) {
	if (claims.length < 2) return null;
	return (
		<div className="record__summary result-tags-row" role="group" aria-label="Podsumowanie wyników">
			<p className="result-tags-row__lead">{`${countNoun(claims.length, 'twierdzenie')}:`}</p>
			{verdictCounts(claims).map((entry) => (
				<ResultTag key={entry.verdict} kind={entry.verdict} size="md" count={entry.count} />
			))}
		</div>
	);
}

export interface InputPiece {
	text: string;
	result: ClaimResult | null;
}

function normalizedPattern(text: string): RegExp | null {
	const core = text
		.replace(/\s+/gu, ' ')
		.trim()
		.replace(/[.!?…]+$/u, '');
	if (core.length < 8) return null;
	const source = core
		.split(' ')
		.map((word) => word.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
		.join('\\s+');
	return new RegExp(source, 'iu');
}

export function splitInputByClaims(input: string, claims: ClaimResult[]): InputPiece[] | null {
	if (claims.length < 2 || !input.trim()) return null;
	const spans: { start: number; end: number; result: ClaimResult }[] = [];
	for (const result of claims) {
		const pattern = normalizedPattern(result.claim.text);
		const match = pattern?.exec(input);
		if (!match) return null;
		spans.push({ start: match.index, end: match.index + match[0].length, result });
	}
	spans.sort((a, b) => a.start - b.start);
	for (let index = 1; index < spans.length; index++) if (spans[index].start < spans[index - 1].end) return null;
	const pieces: InputPiece[] = [];
	let cursor = 0;
	for (const span of spans) {
		if (span.start > cursor) pieces.push({ text: input.slice(cursor, span.start), result: null });
		pieces.push({ text: input.slice(span.start, span.end), result: span.result });
		cursor = span.end;
	}
	if (cursor < input.length) pieces.push({ text: input.slice(cursor), result: null });
	return pieces;
}

export function SubmissionFragments({ input, claims }: { input: string; claims: ClaimResult[] }) {
	const pieces = splitInputByClaims(input, claims);
	if (!pieces) return null;
	return (
		<details className="record__fragments">
			<summary>{FRAGMENTS_TEXTS.title}</summary>
			<p className="record__fragments-text">
				{pieces.map((piece, index) =>
					piece.result ? (
						<span key={index} className="record__fragment">
							<mark className="record__fragment-text">{piece.text}</mark> <ResultTag kind={piece.result.verdict} size="sm" />
						</span>
					) : (
						<span key={index}>{piece.text}</span>
					),
				)}
			</p>
		</details>
	);
}
