import type { VerificationRecord } from '../../../src/contracts/record';
import { formatDateTime, shortId } from '../format';
import { asOfStamp } from '../../../src/render/templates';
import { recordUrlPath } from '../route';
import { CaseNotice } from './CaseNotice';
import { howSearchedLines } from './howSearched';
import { RecordCardImage } from './RecordCardImage';
import { ClaimTagsSummary, SubmissionFragments } from './ClaimSummary';
import { RecordClaim } from './RecordClaim';
import { SheetQuestion } from './SheetQuestion';
import { ArticleClaims, OfficialAnnouncement, PageRead, splitOfficialClaims } from './PageRead';
import { KnownOpWarnings } from './KnownOpWarning';
import { type Verdict } from '../../../src/contracts/verdict';
import { isKnownOpNotice } from '../../../src/render/warning';
import { topicNote } from '../roles/config';
import { recordRoleOf, recordSerious } from '../roles/appearance';
import { currentRole } from '../roles/resolve';
import { nb } from '../typography';
import { StageSlot } from '../stage/StageSlot';
import './record.css';
import './sheet.css';

function RecordExtras({ record }: { record: VerificationRecord }) {
	const maskedTotal = record.piiMasked.reduce((sum, item) => sum + item.count, 0);
	const otherNotices = record.notices.filter((notice) => !isKnownOpNotice(notice));
	const searchedLines = howSearchedLines(record);

	return (
		<>
			<section className="record-claim__group-block record-shortanswer" aria-label="Krótka odpowiedź">
				<h2>Krótka odpowiedź</h2>
				<p>{nb(record.shortAnswer)}</p>
			</section>

			{searchedLines.length > 0 && (
				<section className="record-claim__group-block record__searched" aria-label="Jak szukałem">
					<h2>Jak szukałem</h2>
					<ul>
						{searchedLines.map((line) => (
							<li key={line}>{nb(line)}</li>
						))}
					</ul>
				</section>
			)}

			{otherNotices.length > 0 && (
				<section className="record-claim__group-block record__notices" aria-label="Dodatkowe uwagi">
					<h2>Dodatkowe uwagi</h2>
					<ul>
						{otherNotices.map((notice, index) => (
							<li key={`${notice.type}-${index}`}>{nb(notice.text)}</li>
						))}
					</ul>
				</section>
			)}

			{record.claims.length > 0 && (
				<RecordCardImage id={record.id} claimNumber={1} verdict={record.claims[0].verdict} />
			)}

			<section className="record-claim__group-block record__footer" aria-label="Dane sprawdzenia">
				<h2>Dane sprawdzenia</h2>
				<p>
					Numer sprawdzenia: <strong>{shortId(record.id)}</strong>
				</p>
				<p>
					<a href={recordUrlPath(record.id)}>Trwały adres tego sprawdzenia</a>
				</p>
				<p>Stan zbioru źródeł: {record.corpusVersion}</p>
				<p>Czas sprawdzenia: {formatDateTime(record.createdAt)}</p>
				{maskedTotal > 0 && (
					<p>{nb(`Dla Twojej prywatności zamaskowałem dane osobowe w treści (ukryte dane: ${maskedTotal}).`)}</p>
				)}
				{record.injectionSignals.length > 0 && (
					<p>
						{nb(
							'W treści wykryłem teksty, które wyglądają na próbę wpłynięcia na działanie systemu. Potraktowałem je jako zwykły tekst i zignorowałem.',
						)}
					</p>
				)}
			</section>
		</>
	);
}

const ALL_SAME_SENTENCES: Record<Verdict, string> = {
	potwierdzone: 'Wszystkie udało mi się potwierdzić.',
	falszywe: 'Wszystkie okazały się fałszywe.',
	wprowadzajace_w_blad: 'Wszystkie wprowadzają w błąd.',
	brak_wystarczajacych_dowodow: 'Żadnego nie udało mi się potwierdzić.',
	nie_podlega_weryfikacji: 'Żadnego nie da się sprawdzić.',
};

const COUNT_LABELS: Record<Verdict, string> = {
	potwierdzone: 'Potwierdzonych',
	falszywe: 'Fałszywych',
	wprowadzajace_w_blad: 'Wprowadzających w błąd',
	brak_wystarczajacych_dowodow: 'Niepotwierdzonych',
	nie_podlega_weryfikacji: 'Nie do sprawdzenia',
};

const VERDICT_ORDER: Verdict[] = [
	'potwierdzone',
	'falszywe',
	'wprowadzajace_w_blad',
	'brak_wystarczajacych_dowodow',
	'nie_podlega_weryfikacji',
];

export function summarizeVerdicts(verdicts: Verdict[]): string {
	const counts = VERDICT_ORDER.map((verdict) => ({ verdict, count: verdicts.filter((item) => item === verdict).length })).filter(
		(entry) => entry.count > 0,
	);
	const only = counts.length === 1 ? counts[0] : undefined;
	if (only) return ALL_SAME_SENTENCES[only.verdict];
	return counts.map((entry) => `${COUNT_LABELS[entry.verdict]}: ${entry.count}.`).join(' ');
}

export function RecordView({ record }: { record: VerificationRecord }) {
	const page = record.page;
	const officialPage = page?.official === true;
	const { cited, held } = officialPage ? splitOfficialClaims(record.claims) : { cited: [], held: [] };
	const officialLayout = officialPage && cited.length > 0;
	const single = record.claims.length === 1 && !officialLayout;
	const role = currentRole(recordRoleOf(record));
	const note = topicNote(role);
	const serious = recordSerious(record);
	const firstAbstain = record.claims.findIndex((result) => result.verdict === 'brak_wystarczajacych_dowodow');

	return (
		<div className="record" data-role={role}>
			<div className="sheet" data-claims={record.claims.length > 1 ? 'many' : record.claims.length === 1 ? 'one' : 'none'}>
				<div className="sheet__plane" aria-hidden="true" />
				{record.claims.length > 0 && <StageSlot kind="corner" role={role} />}
				<div className="sheet__body">
					<header className="sheet__top">
						<p className="sheet__asof">{asOfStamp(record.asOf, record.createdAt)}</p>
						{record.page ? <PageRead page={record.page} /> : <SheetQuestion text={record.maskedInput} />}
						{note && <p className="role-note">{nb(note)}</p>}
					</header>
					{record.claims.length === 0 && (
						<p className="notice">{nb('Nie znalazłem w tej treści żadnego twierdzenia do sprawdzenia.')}</p>
					)}
					<ClaimTagsSummary claims={record.claims} />
					{!page && <SubmissionFragments input={record.maskedInput} claims={record.claims} />}
					{page && !page.official && <ArticleClaims claims={record.claims} asOf={record.asOf} />}
					{officialLayout && page && <OfficialAnnouncement page={page} cited={cited} />}
					{officialLayout && held.length > 0 && (
						<section className="record__held" aria-label="Twierdzenia bez cytatu">
							<h2 className="record__held-title">
								{nb(`Bez potwierdzenia: ${held.length} z ${record.claims.length} zdań tej strony`)}
							</h2>
							<div className="record__claims-list">
								{held.map((result) => (
									<div key={result.claim.id} className="record__held-item">
										<p className="record__held-claim">
											<q>{nb(result.claim.text)}</q>
										</p>
										<RecordClaim
											role={role}
											serious={serious}
											result={result}
											asOf={record.asOf}
											leading={false}
											showImage={false}
											blankSpotNote={false}
										/>
									</div>
								))}
							</div>
						</section>
					)}
					{single && (
						<RecordClaim
							role={role}
							serious={serious}
							result={record.claims[0]}
							asOf={record.asOf}
							extraDetails={<RecordExtras record={record} />}
						/>
					)}
					{record.claims.length > 1 && !officialLayout && (
						<div className="record__claims-list">
							{record.claims.map((result, index) => (
								<RecordClaim
									key={result.claim.id}
									role={role}
									serious={serious}
									result={result}
									asOf={record.asOf}
									leading={index === 0}
									showImage={index === 0}
									blankSpotNote={index === firstAbstain}
								/>
							))}
						</div>
					)}

					<CaseNotice record={record} />

					{!single && (
						<details className="record-claim__details record__details">
							<summary>Pokaż szczegóły</summary>
							<RecordExtras record={record} />
						</details>
					)}

					<KnownOpWarnings notices={record.notices} />
				</div>
			</div>
		</div>
	);
}
