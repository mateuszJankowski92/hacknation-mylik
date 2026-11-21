import type { VerificationRecord } from '../../../src/contracts/record';
import { formatDateTime, shortId } from '../format';
import { recordUrlPath } from '../route';
import { RecordCardImage } from './RecordCardImage';
import { RecordClaim } from './RecordClaim';
import { KnownOpWarnings } from './KnownOpWarning';
import { isKnownOpNotice } from '../../../src/render/warning';
import { topicNote } from '../roles/config';
import { currentRole } from '../roles/resolve';
import './record.css';

function RecordExtras({ record }: { record: VerificationRecord }) {
	const maskedTotal = record.piiMasked.reduce((sum, item) => sum + item.count, 0);
	const otherNotices = record.notices.filter((notice) => !isKnownOpNotice(notice));

	return (
		<>
			<section className="record-claim__group-block record-shortanswer" aria-label="Krótka odpowiedź">
				<h4>Krótka odpowiedź</h4>
				<p>{record.shortAnswer}</p>
			</section>

			{otherNotices.length > 0 && (
				<section className="record-claim__group-block record__notices" aria-label="Dodatkowe uwagi">
					<h4>Dodatkowe uwagi</h4>
					<ul>
						{otherNotices.map((notice, index) => (
							<li key={`${notice.type}-${index}`}>{notice.text}</li>
						))}
					</ul>
				</section>
			)}

			{record.claims.map((result, index) => (
				<RecordCardImage key={result.claim.id} id={record.id} claimNumber={index + 1} verdict={result.verdict} />
			))}

			<section className="record-claim__group-block record__footer" aria-label="Dane sprawdzenia">
				<h4>Dane sprawdzenia</h4>
				<p>
					Numer sprawdzenia: <strong>{shortId(record.id)}</strong>
				</p>
				<p>
					<a href={recordUrlPath(record.id)}>Trwały adres tego sprawdzenia</a>
				</p>
				<p>Wersja zbioru źródeł: {record.corpusVersion}</p>
				<p>Czas sprawdzenia: {formatDateTime(record.createdAt)}</p>
				{maskedTotal > 0 && (
					<p>Dla Twojej prywatności zamaskowałem dane osobowe w treści (liczba ukrytych fragmentów: {maskedTotal}).</p>
				)}
				{record.injectionSignals.length > 0 && (
					<p>
						W treści wykryłem fragmenty, które wyglądają na próbę wpłynięcia na działanie systemu. Potraktowałem
						je jako zwykły tekst i zignorowałem.
					</p>
				)}
			</section>
		</>
	);
}

export function RecordView({ record }: { record: VerificationRecord }) {
	const single = record.claims.length === 1;
	const role = currentRole((record as { role?: unknown }).role);
	const note = topicNote(role);

	return (
		<div className="record" data-role={role}>
			{note && <p className="role-note">{note}</p>}
			{record.claims.length === 0 && (
				<p className="notice">Nie znalazłem w tej treści żadnego twierdzenia do sprawdzenia.</p>
			)}
			{record.claims.length > 1 && <p>Znalazłem w tej treści {record.claims.length} twierdzenia. Oceniam każde osobno.</p>}
			{record.claims.map((result) => (
				<RecordClaim
					key={result.claim.id}
					role={role}
					result={result}
					asOf={record.asOf}
					extraDetails={single ? <RecordExtras record={record} /> : undefined}
				/>
			))}

			<KnownOpWarnings notices={record.notices} />

			{!single && (
				<details className="record-claim__details record__details">
					<summary>Pokaż szczegóły</summary>
					<RecordExtras record={record} />
				</details>
			)}
		</div>
	);
}
