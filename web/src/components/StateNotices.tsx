import type { State } from '../../../src/contracts/verdict';
import { STATE_LABELS_PL } from '../../../src/contracts/verdict';
import { RESULT_TAG_LOOK, ResultTagIcon } from './ResultTag';
import { ResultImage } from '../roles/ResultImage';
import { currentRole } from '../roles/resolve';
import { StageSlot } from '../stage/StageSlot';
import { nb } from '../typography';

interface StateNoticeProps {
	message: string;
}

function StateShell({
	state,
	advice,
	message,
}: {
	state: State;
	advice: string;
	message: string;
}) {
	return (
		<section className={`state state--${state}`} aria-labelledby={`state-${state}`} data-role={currentRole()}>
			<StageSlot kind="corner" role={currentRole()} />
			<div className="state__tag result-tag" data-tone="state" data-size="lg" data-kind={state}>
				<ResultTagIcon name={RESULT_TAG_LOOK[state].icon} />
				<div className="state__tag-text">
					<p className="state__kicker">{nb('To nie jest ocena zgłoszenia')}</p>
					<h2 id={`state-${state}`} tabIndex={-1} data-result-heading>{nb(STATE_LABELS_PL[state])}</h2>
				</div>
			</div>
			<ResultImage role={currentRole()} resultKey={state} />
			<p>{nb(message)}</p>
			<p className="state__advice">
				<strong>{nb('Co możesz zrobić:')}</strong> {nb(advice)}
			</p>
		</section>
	);
}

export function TechnicalFailureNotice({ message }: StateNoticeProps) {
	return (
		<StateShell
			state="awaria_techniczna"
			message={message}
			advice="spróbuj ponownie za kilka minut. Twoje zgłoszenie nie zostało ocenione."
		/>
	);
}

export function CheckUnavailableNotice({ message }: StateNoticeProps) {
	return (
		<StateShell
			state="brak_mozliwosci_sprawdzenia"
			message={message}
			advice="jeśli wkleiłeś adres internetowy, wklej zamiast niego sam tekst informacji. Możesz też sprawdzić ją w oficjalnym źródle."
		/>
	);
}

export function ClarificationNotice({ message }: StateNoticeProps) {
	return (
		<StateShell
			state="potrzeba_doprecyzowania"
			message={message}
			advice="dopisz szczegóły: kto, co, gdzie i kiedy miało się wydarzyć, i sprawdź ponownie."
		/>
	);
}
