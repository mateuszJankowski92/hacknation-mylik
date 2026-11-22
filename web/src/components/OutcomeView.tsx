import type { VerifyOutcome } from '../../../src/contracts/record';
import { RecordView } from './RecordView';
import { CheckUnavailableNotice, ClarificationNotice, TechnicalFailureNotice } from './StateNotices';

export function OutcomeView({ outcome, questionLabel }: { outcome: VerifyOutcome; questionLabel?: string }) {
	if (outcome.kind === 'record') return <RecordView record={outcome.record} questionLabel={questionLabel} />;
	switch (outcome.state) {
		case 'awaria_techniczna':
			return <TechnicalFailureNotice message={outcome.message} />;
		case 'brak_mozliwosci_sprawdzenia':
			return <CheckUnavailableNotice message={outcome.message} />;
		case 'potrzeba_doprecyzowania':
			return <ClarificationNotice message={outcome.message} />;
	}
}
