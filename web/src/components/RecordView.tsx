import type { VerificationRecord } from '../../../src/contracts/record';
import { formatDateTime, shortId } from '../format';
import { ClaimCard } from './ClaimCard';

export function RecordView({ record }: { record: VerificationRecord }) {
	const maskedTotal = record.piiMasked.reduce((sum, item) => sum + item.count, 0);
	const permalink = `#/rekord/${record.id}`;

	return (
		<div className="record">
			{record.claims.length === 0 && (
				<p className="notice">Nie wyodrębniłem z tej treści żadnego twierdzenia do sprawdzenia.</p>
			)}
			{record.claims.length > 1 && <p>Znalazłem w tej treści {record.claims.length} twierdzenia. Oceniam każde osobno.</p>}
			{record.claims.map((result) => (
				<ClaimCard key={result.claim.id} result={result} />
			))}

			{record.notices.length > 0 && (
				<section className="record__notices" aria-label="Dodatkowe uwagi">
					<h3>Dodatkowe uwagi</h3>
					<ul>
						{record.notices.map((notice, index) => (
							<li key={`${notice.type}-${index}`}>{notice.text}</li>
						))}
					</ul>
				</section>
			)}

			<footer className="record__footer">
				<p>
					Numer sprawdzenia: <strong>{shortId(record.id)}</strong>
				</p>
				<p>
					<a href={permalink}>Trwały adres tego sprawdzenia</a>
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
			</footer>
		</div>
	);
}
