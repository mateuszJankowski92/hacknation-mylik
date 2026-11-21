import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { HERO_SCENES, SCENE_START_TIMEOUT_MS, SCENE_TEXTS, type SceneSpec } from '../scenes/config';
import {
	connectionIsSlow,
	prefersReducedMotion,
	readSceneSkipped,
	subscribeSceneSkipped,
	writeSceneSkipped,
} from '../scenes/preferences';
import { useAfterFirstScreen } from '../scenes/useAfterFirstScreen';
import { HeroIllustration, type HeroIllustrationProps } from './HeroIllustration';

interface HeroClipProps {
	scene: SceneSpec;
	onEnded: () => void;
	onFailed: () => void;
}

function HeroClip({ scene, onEnded, onFailed }: HeroClipProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const startedRef = useRef(false);
	const callbacks = useRef({ onEnded, onFailed });
	callbacks.current = { onEnded, onFailed };

	useEffect(() => {
		const timer = setTimeout(() => {
			if (!startedRef.current) callbacks.current.onFailed();
		}, SCENE_START_TIMEOUT_MS);
		return () => clearTimeout(timer);
	}, []);

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

	return (
		<div className="hero__media" role="img" aria-label={scene.alt}>
			<video
				ref={videoRef}
				className="hero__video"
				src={scene.file ?? undefined}
				poster={scene.poster ?? undefined}
				muted
				playsInline
				autoPlay
				loop={scene.loop === true}
				preload="auto"
				aria-hidden="true"
				tabIndex={-1}
				disablePictureInPicture
				disableRemotePlayback
				controlsList="nofullscreen noremoteplayback"
				onPlaying={() => {
					startedRef.current = true;
				}}
				onEnded={() => callbacks.current.onEnded()}
				onError={() => callbacks.current.onFailed()}
			/>
		</div>
	);
}

function restingPoster(scenes: SceneSpec[]): SceneSpec | null {
	return scenes.find((scene) => scene.loop && scene.poster) ?? scenes.find((scene) => scene.poster) ?? null;
}

export function HeroStage({ illustration, scenes = HERO_SCENES }: { illustration?: HeroIllustrationProps; scenes?: SceneSpec[] }) {
	const skipped = useSyncExternalStore(subscribeSceneSkipped, readSceneSkipped, () => false);
	const [failed, setFailed] = useState(false);
	const [index, setIndex] = useState(0);
	const afterFirstScreen = useAfterFirstScreen();
	const reducedMotion = prefersReducedMotion();
	const isStatic = Boolean(illustration?.src);
	const lastIndex = scenes.length - 1;
	const scene = scenes[Math.min(index, lastIndex)];
	const playable = !isStatic && Boolean(scene?.file) && !skipped && !reducedMotion && !connectionIsSlow() && !failed;
	const animated = playable && afterFirstScreen;
	const firstScreenPoster = playable && !afterFirstScreen && scene?.poster ? scene : null;
	const poster = reducedMotion && !isStatic ? restingPoster(scenes) : firstScreenPoster;

	const handleEnded = useCallback(() => {
		setIndex((current) => Math.min(current + 1, lastIndex));
	}, [lastIndex]);

	const handleFailed = useCallback(() => {
		if (index < lastIndex) setIndex(index + 1);
		else setFailed(true);
	}, [index, lastIndex]);

	return (
		<div className="hero__illustration">
			<div className="hero__stage stage" data-mode={animated ? 'video' : poster ? 'poster' : 'still'}>
				{animated && scene && <HeroClip key={scene.id} scene={scene} onEnded={handleEnded} onFailed={handleFailed} />}
				{!animated && poster && <img className="hero__image" src={poster.poster ?? undefined} alt={poster.alt} />}
				{!animated && !poster && <HeroIllustration {...illustration} />}
				{playable && (
					<button type="button" className="hero__skip text-button" onClick={() => writeSceneSkipped(true)}>
						{SCENE_TEXTS.skip}
					</button>
				)}
			</div>
		</div>
	);
}
