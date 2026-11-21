import type { VerificationRecord } from '../../../src/contracts/record';
import { formatDateTime, shortId } from '../format';
import { asOfStamp } from '../../../src/render/templates';
import { recordUrlPath } from '../route';
import { CaseNotice } from './CaseNotice';
import { RecordCardImage } from './RecordCardImage';
import { RecordClaim } from './RecordClaim';
import { SheetQuestion } from './SheetQuestion';
import { KnownOpWarnings } from './KnownOpWarning';
import { VERDICT_LABELS_PL, type Verdict } from '../../../src/contracts/verdict';
import { countNoun } from '../../../src/render/plural';
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

	return (
		<>
			<section className="record-claim__group-block record-shortanswer" aria-label="Krótka odpowiedź">
				<h4>Krótka odpowiedź</h4>
				<p>{nb(record.shortAnswer)}</p>
			</section>

			{otherNotices.length > 0 && (
				<section className="record-claim__group-block record__notices" aria-label="Dodatkowe uwagi">
					<h4>Dodatkowe uwagi</h4>
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
				<h4>Dane sprawdzenia</h4>
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

export function summarizeVerdicts(verdicts: Verdict[]): string {
	const order: Verdict[] = [
		'potwierdzone',
		'falszywe',
		'wprowadzajace_w_blad',
		'brak_wystarczajacych_dowodow',
		'nie_podlega_weryfikacji',
	];
	return order
		.map((verdict) => ({ verdict, count: verdicts.filter((item) => item === verdict).length }))
		.filter((entry) => entry.count > 0)
		.map((entry) => `${VERDICT_LABELS_PL[entry.verdict].toLowerCase()}: ${entry.count}`)
		.join(', ');
}

export function RecordView({ record }: { record: VerificationRecord }) {
	const single = record.claims.length === 1;
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
						<p className="sheet__asof">{asOfStamp(record.asOf)}</p>
						<SheetQuestion text={record.maskedInput} />
					</header>
					{note && <p className="role-note">{nb(note)}</p>}
					{record.claims.length === 0 && (
						<p className="notice">{nb('Nie znalazłem w tej treści żadnego twierdzenia do sprawdzenia.')}</p>
					)}
					{record.claims.length > 1 && (
						<p className="record__summary">
							{nb(
								`Sprawdziłem ${countNoun(record.claims.length, 'zdanie')} z tej strony: ${summarizeVerdicts(record.claims.map((result) => result.verdict))}.`,
							)}
						</p>
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
					{record.claims.length > 1 && (
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
