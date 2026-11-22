import { SCENE_TEXTS } from './config';
import './playback.css';

interface PlaybackButtonProps {
	running: boolean;
	className: string;
	onClick: () => void;
	accessibleName?: string;
}

function PauseIcon() {
	return (
		<svg className="playback-button__icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
			<circle cx="12" cy="12" r="10.25" />
			<path d="M9.5 8.5v7M14.5 8.5v7" />
		</svg>
	);
}

function PlayIcon() {
	return (
		<svg className="playback-button__icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
			<circle cx="12" cy="12" r="10.25" />
			<path d="M10 8.4v7.2l5.8-3.6z" />
		</svg>
	);
}

export function PlaybackButton({ running, className, onClick, accessibleName }: PlaybackButtonProps) {
	const label = running ? SCENE_TEXTS.skip : SCENE_TEXTS.replay;
	return (
		<button
			type="button"
			className={`${className} playback-button`}
			data-playback={running ? 'skip' : 'replay'}
			aria-label={accessibleName}
			onClick={onClick}
		>
			{running ? <PauseIcon /> : <PlayIcon />}
			<span className="playback-button__label" aria-hidden={accessibleName ? true : undefined}>
				{label}
			</span>
		</button>
	);
}
