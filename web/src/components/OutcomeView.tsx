import type { VerifyOutcome } from '../../../src/contracts/record';
import { RecordView } from './RecordView';
import { CheckUnavailableNotice, ClarificationNotice, TechnicalFailureNotice } from './StateNotices';

export function OutcomeView({ outcome }: { outcome: VerifyOutcome }) {
	if (outcome.kind === 'record') return <RecordView record={outcome.record} />;
	switch (outcome.state) {
		case 'awaria_techniczna':
			return <TechnicalFailureNotice message={outcome.message} />;
		case 'brak_mozliwosci_sprawdzenia':
			return <CheckUnavailableNotice message={outcome.message} />;
		case 'potrzeba_doprecyzowania':
			return <ClarificationNotice message={outcome.message} />;
	}
}
