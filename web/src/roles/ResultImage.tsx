import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotionSetting } from '../a11y/settings';
import { SCENE_TEXTS } from '../scenes/config';
import { PlaybackButton } from '../scenes/PlaybackButton';
import { animationStartsAutomatically } from '../scenes/preferences';
import type { ResultKey, Role } from './config';
import { GESTURE_CAPTION, resultImageFor, usesGesture } from './config';
import { assetUrl, imageEntryFor, resultSceneFor } from './manifest';
import { RoleArt } from './RoleArt';
import { nb } from '../typography';

const RESULT_CONTROL_SUFFIX = 'obrazu wyniku';

interface ResultClipProps {
	file: string;
	poster: string | null;
	paused: boolean;
	onEnded: () => void;
}

function ResultClip({ file, poster, paused, onEnded }: ResultClipProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [playing, setPlaying] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || typeof video.play !== 'function') return;
		try {
			if (paused) {
				video.pause();
				return;
			}
			const attempt = video.play() as Promise<void> | undefined;
			attempt?.catch(() => undefined);
		} catch {
			return;
		}
	}, [paused]);

	if (failed) return null;
	return (
		<video
			ref={videoRef}
			className="result-image__clip"
			data-playing={playing ? 'true' : 'false'}
			src={file}
			poster={poster ?? undefined}
			muted
			playsInline
			preload="auto"
			aria-hidden="true"
			tabIndex={-1}
			disablePictureInPicture
			disableRemotePlayback
			controlsList="nofullscreen noremoteplayback"
			onPlaying={() => setPlaying(true)}
			onEnded={onEnded}
			onError={() => setFailed(true)}
		/>
	);
}

function useAfterFirstPaint(): boolean {
	const [afterFirstPaint, setAfterFirstPaint] = useState(false);
	useEffect(() => {
		setAfterFirstPaint(true);
	}, []);
	return afterFirstPaint;
}

interface ResultImageProps {
	role: Role;
	resultKey: ResultKey;
	serious?: boolean;
}

export function ResultImage({ role, resultKey, serious = false }: ResultImageProps) {
	const gesture = usesGesture(role, resultKey, serious);
	const spec = gesture ? { caption: GESTURE_CAPTION } : resultImageFor(role, resultKey);
	const afterFirstPaint = useAfterFirstPaint();
	const [stopped, setStopped] = useState(false);
	const [finished, setFinished] = useState(false);
	const [replayed, setReplayed] = useState(false);
	const [playId, setPlayId] = useState(0);
	const motionSetting = useMotionSetting();
	useEffect(() => {
		setReplayed(false);
		setStopped(false);
	}, [motionSetting]);
	const entry = gesture ? null : resultSceneFor(role, resultKey);
	const mayPlay = animationStartsAutomatically() || replayed;
	const mounted = Boolean(entry) && afterFirstPaint && mayPlay;
	const running = Boolean(entry) && mayPlay && !stopped && !finished;

	const handleReplay = useCallback(() => {
		setStopped(false);
		setFinished(false);
		setReplayed(true);
		setPlayId((current) => current + 1);
	}, []);

	if (!spec) return null;
	const artName = gesture ? 'wskazuje' : imageEntryFor(role, resultKey) ? resultKey : 'praca';
	return (
		<figure className={`result-image result-image--${gesture ? 'gest' : resultKey}`} data-gesture={gesture ? 'true' : undefined}>
			<div className="result-image__stage stage">
				<RoleArt owner={role} name={artName} alt={spec.caption} className="result-image__art" />
				{mounted && entry && (
					<ResultClip
						key={playId}
						file={assetUrl(entry.plik)}
						poster={entry.plakat ? assetUrl(entry.plakat) : null}
						paused={stopped}
						onEnded={() => setFinished(true)}
					/>
				)}
				{entry && (
					<PlaybackButton
						className="result-image__control"
						running={running}
						accessibleName={`${running ? SCENE_TEXTS.skip : SCENE_TEXTS.replay} ${RESULT_CONTROL_SUFFIX}`}
						onClick={running ? () => setStopped(true) : handleReplay}
					/>
				)}
			</div>
			<figcaption className="result-image__caption">{nb(spec.caption)}</figcaption>
		</figure>
	);
}
