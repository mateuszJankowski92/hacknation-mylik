import type { State } from '../../../src/contracts/verdict';
import { STATE_LABELS_PL } from '../../../src/contracts/verdict';
import { ResultImage } from '../roles/ResultImage';
import { currentRole } from '../roles/resolve';

interface StateNoticeProps {
	message: string;
}

function StateShell({
	state,
	icon,
	advice,
	message,
}: {
	state: State;
	icon: string;
	advice: string;
	message: string;
}) {
	return (
		<section className={`state state--${state}`} aria-labelledby={`state-${state}`} data-role={currentRole()}>
			<p className="state__kicker">
				<span aria-hidden="true">{icon} </span>
				To nie jest ocena zgłoszenia
			</p>
			<h3 id={`state-${state}`}>{STATE_LABELS_PL[state]}</h3>
			<ResultImage role={currentRole()} resultKey={state} />
			<p>{message}</p>
			<p className="state__advice">
				<strong>Co możesz zrobić:</strong> {advice}
			</p>
		</section>
	);
}

export function TechnicalFailureNotice({ message }: StateNoticeProps) {
	return (
		<StateShell
			state="awaria_techniczna"
			icon="⚙"
			message={message}
			advice="spróbuj ponownie za kilka minut. Twoje zgłoszenie nie zostało ocenione."
		/>
	);
}

export function CheckUnavailableNotice({ message }: StateNoticeProps) {
	return (
		<StateShell
			state="brak_mozliwosci_sprawdzenia"
			icon="⊘"
			message={message}
			advice="jeśli wkleiłeś adres internetowy, wklej zamiast niego sam tekst informacji. Możesz też sprawdzić ją w oficjalnym źródle."
		/>
	);
}

export function ClarificationNotice({ message }: StateNoticeProps) {
	return (
		<StateShell
			state="potrzeba_doprecyzowania"
			icon="✎"
			message={message}
			advice="dopisz szczegóły: kto, co, gdzie i kiedy miało się wydarzyć, i sprawdź ponownie."
		/>
	);
}
