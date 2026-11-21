import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { connectionIsSlow, prefersReducedMotion, readSceneSkipped, subscribeSceneSkipped } from '../scenes/preferences';
import type { ResultKey, Role } from './config';
import { resultImageFor } from './config';
import { assetUrl, resultSceneFor } from './manifest';
import { RoleArt } from './RoleArt';
import { nb } from '../typography';

function ResultClip({ file, poster }: { file: string; poster: string | null }) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [playing, setPlaying] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || typeof video.play !== 'function') return;
		try {
			const attempt = video.play() as Promise<void> | undefined;
			attempt?.catch(() => undefined);
		} catch {
			return;
		}
	}, []);

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
			onError={() => setFailed(true)}
		/>
	);
}

function useResultClip(role: Role, resultKey: ResultKey) {
	const skipped = useSyncExternalStore(subscribeSceneSkipped, readSceneSkipped, () => false);
	const [afterFirstPaint, setAfterFirstPaint] = useState(false);
	useEffect(() => {
		setAfterFirstPaint(true);
	}, []);
	const entry = resultSceneFor(role, resultKey);
	if (!entry || !afterFirstPaint || skipped || prefersReducedMotion() || connectionIsSlow()) return null;
	return { file: assetUrl(entry.plik), poster: entry.plakat ? assetUrl(entry.plakat) : null };
}

export function ResultImage({ role, resultKey }: { role: Role; resultKey: ResultKey }) {
	const spec = resultImageFor(role, resultKey);
	const clip = useResultClip(role, resultKey);
	if (!spec) return null;
	return (
		<figure className={`result-image result-image--${resultKey}`}>
			<div className="result-image__stage stage">
				<RoleArt owner={role} name={resultKey} alt={spec.caption} className="result-image__art" />
				{clip && <ResultClip file={clip.file} poster={clip.poster} />}
			</div>
			<figcaption className="result-image__caption">{nb(spec.caption)}</figcaption>
		</figure>
	);
}
