import type { ReactNode } from 'react';
import {
	STATE_LABELS_PL,
	VERDICT_LABELS_PL,
	type Stance,
	type State,
	type Verdict,
} from '../../../src/contracts/verdict';
import { nb } from '../typography';
import './tag.css';

export type ResultTagKind = Verdict | State;
export type ResultTagSize = 'lg' | 'md' | 'sm';
export type ResultTone = 'confirmed' | 'misleading' | 'false' | 'unproven' | 'unverifiable' | 'state';
export type IconName = 'check' | 'cross' | 'warning' | 'question' | 'bubble' | 'wrench' | 'clock' | 'pencil';

interface TagLook {
	tone: ResultTone;
	icon: IconName;
	label: string;
}

export const RESULT_TAG_LOOK: Record<ResultTagKind, TagLook> = {
	potwierdzone: { tone: 'confirmed', icon: 'check', label: VERDICT_LABELS_PL.potwierdzone },
	falszywe: { tone: 'false', icon: 'cross', label: VERDICT_LABELS_PL.falszywe },
	wprowadzajace_w_blad: { tone: 'misleading', icon: 'warning', label: VERDICT_LABELS_PL.wprowadzajace_w_blad },
	brak_wystarczajacych_dowodow: { tone: 'unproven', icon: 'question', label: VERDICT_LABELS_PL.brak_wystarczajacych_dowodow },
	nie_podlega_weryfikacji: { tone: 'unverifiable', icon: 'bubble', label: VERDICT_LABELS_PL.nie_podlega_weryfikacji },
	awaria_techniczna: { tone: 'state', icon: 'wrench', label: STATE_LABELS_PL.awaria_techniczna },
	brak_mozliwosci_sprawdzenia: { tone: 'state', icon: 'clock', label: STATE_LABELS_PL.brak_mozliwosci_sprawdzenia },
	potrzeba_doprecyzowania: { tone: 'state', icon: 'pencil', label: STATE_LABELS_PL.potrzeba_doprecyzowania },
};

export const STANCE_TAG_LOOK: Partial<Record<Stance, TagLook>> = {
	potwierdza: { tone: 'confirmed', icon: 'check', label: 'potwierdza' },
	obala: { tone: 'false', icon: 'cross', label: 'przeczy' },
};

const ICON_PATHS: Record<IconName, ReactNode> = {
	check: <path d="M5 12.5l4.5 4.5L19 7" />,
	cross: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
	warning: (
		<>
			<path d="M12 3.8L21 19.5H3z" />
			<path d="M12 10v4.5" />
			<path d="M12 17.2v.2" />
		</>
	),
	question: (
		<>
			<path d="M9 9.3a3.1 3.1 0 1 1 4.5 2.8c-1 .5-1.5 1.1-1.5 2.1" />
			<path d="M12 17.6v.2" />
		</>
	),
	bubble: <path d="M4.5 5.5h15v10.5h-9l-4 3.5V16h-2z" />,
	wrench: <path d="M14.8 5.2a4.2 4.2 0 0 0-5 5.4L4.5 16l3.5 3.5 5.4-5.3a4.2 4.2 0 0 0 5.4-5l-2.6 2.6-2.4-.6-.6-2.4z" />,
	clock: (
		<>
			<circle cx="12" cy="12" r="8" />
			<path d="M12 7.5V12l3 2" />
		</>
	),
	pencil: <path d="M4.5 19.5l1-4L16 5l3 3L8.5 18.5zM14 7l3 3" />,
};

export function ResultTagIcon({ name }: { name: IconName }) {
	return (
		<svg className="result-tag__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			{ICON_PATHS[name]}
		</svg>
	);
}

interface ResultTagProps {
	kind: ResultTagKind;
	size?: ResultTagSize;
	count?: number;
}

export function ResultTag({ kind, size = 'md', count }: ResultTagProps) {
	const look = RESULT_TAG_LOOK[kind];
	return (
		<span className="result-tag" data-tone={look.tone} data-size={size} data-kind={kind}>
			<ResultTagIcon name={look.icon} />
			<span className="result-tag__label">{nb(look.label)}</span>
			{count !== undefined && (
				<span className="result-tag__count">
					<span className="visually-hidden">: </span>
					{count}
				</span>
			)}
		</span>
	);
}

/** Pięć wyników z wytycznych w stałej kolejności; aktywny pokazuje duża metka, pozostałe są wyszarzone. */
export const VERDICT_ORDER: Verdict[] = [
	'potwierdzone',
	'wprowadzajace_w_blad',
	'falszywe',
	'brak_wystarczajacych_dowodow',
	'nie_podlega_weryfikacji',
];

/** Wyszarzone, nieaktywne metki pozostałych wyników: widać, jakie oceny były możliwe. Dla czytnika jedno zdanie. */
export function OtherVerdicts({ active }: { active: Verdict }) {
	const others = VERDICT_ORDER.filter((kind) => kind !== active);
	return (
		<div className="other-verdicts">
			<p className="visually-hidden">
				Inne możliwe oceny, tutaj nieprzyznane: {others.map((kind) => RESULT_TAG_LOOK[kind].label).join(', ')}.
			</p>
			<ul className="other-verdicts__list" aria-hidden="true">
				{others.map((kind) => (
					<li key={kind} className="other-verdicts__item" data-kind={kind}>
						<ResultTagIcon name={RESULT_TAG_LOOK[kind].icon} />
						<span>{nb(RESULT_TAG_LOOK[kind].label)}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

export function StanceTag({ stance, size = 'sm' }: { stance: Stance; size?: ResultTagSize }) {
	const look = STANCE_TAG_LOOK[stance];
	if (!look) return null;
	return (
		<span className="result-tag" data-tone={look.tone} data-size={size} data-stance={stance}>
			<ResultTagIcon name={look.icon} />
			<span className="result-tag__label">{nb(look.label)}</span>
		</span>
	);
}
