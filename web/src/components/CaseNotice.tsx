import { useEffect, useState } from 'react';
import { casePublicSentencePl } from '../../../src/cases/texts';
import type { VerificationRecord } from '../../../src/contracts/record';
import { fetchCaseStatus } from '../api';
import { formatDate } from '../format';

export function hasNoEvidenceClaim(record: VerificationRecord): boolean {
	return record.claims.some((result) => result.verdict === 'brak_wystarczajacych_dowodow');
}

export function CaseNotice({ record }: { record: VerificationRecord }) {
	const [sentence, setSentence] = useState<string | null>(null);
	const relevant = hasNoEvidenceClaim(record);

	useEffect(() => {
		if (!relevant) {
			setSentence(null);
			return;
		}
		const controller = new AbortController();
		void fetchCaseStatus(record.id, controller.signal).then((status) => {
			if (controller.signal.aborted || !status) return;
			setSentence(casePublicSentencePl(status.status, status.forwardedAt ? formatDate(status.forwardedAt) : undefined));
		});
		return () => controller.abort();
	}, [record.id, relevant]);

	if (!relevant || !sentence) return null;
	return (
		<p className="case-notice" role="status">
			{sentence}
		</p>
	);
}
