import { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_SCENES, SCENE_START_TIMEOUT_MS, SCENE_TEXTS, type SceneSpec } from '../scenes/config';
import { animationStartsAutomatically, prefersReducedMotion } from '../scenes/preferences';
import { useAfterFirstScreen } from '../scenes/useAfterFirstScreen';
import { HeroIllustration, type HeroIllustrationProps } from './HeroIllustration';

interface HeroClipProps {
	scene: SceneSpec;
	paused: boolean;
	onEnded: () => void;
	onFailed: () => void;
}

function HeroClip({ scene, paused, onEnded, onFailed }: HeroClipProps) {
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
	const [stopped, setStopped] = useState(false);
	const [finished, setFinished] = useState(false);
	const [replayed, setReplayed] = useState(false);
	const [playId, setPlayId] = useState(0);
	const [failed, setFailed] = useState(false);
	const [index, setIndex] = useState(0);
	const afterFirstScreen = useAfterFirstScreen();
	const reducedMotion = prefersReducedMotion();
	const isStatic = Boolean(illustration?.src);
	const lastIndex = scenes.length - 1;
	const scene = scenes[Math.min(index, lastIndex)];
	const hasClip = !isStatic && Boolean(scene?.file) && !failed;
	const mayPlay = animationStartsAutomatically() || replayed;
	const animated = hasClip && mayPlay && afterFirstScreen;
	const running = hasClip && mayPlay && !stopped && !finished;
	const firstScreenPoster = hasClip && mayPlay && !afterFirstScreen && scene?.poster ? scene : null;
	const poster = !isStatic && !mayPlay ? restingPoster(scenes) : firstScreenPoster;

	const handleEnded = useCallback(() => {
		if (index >= lastIndex) {
			setFinished(true);
			return;
		}
		setIndex(index + 1);
	}, [index, lastIndex]);

	const handleFailed = useCallback(() => {
		if (index < lastIndex) setIndex(index + 1);
		else setFailed(true);
	}, [index, lastIndex]);

	const handleSkip = useCallback(() => {
		setStopped(true);
	}, []);

	const handleReplay = useCallback(() => {
		setStopped(false);
		setFinished(false);
		setReplayed(true);
		setIndex(0);
		setPlayId((current) => current + 1);
	}, []);

	return (
		<div className="hero__illustration">
			<div className="hero__stage stage" data-mode={animated ? 'video' : poster ? 'poster' : 'still'} data-reduced-motion={reducedMotion ? 'true' : 'false'}>
				{animated && scene && (
					<HeroClip key={`${playId}-${scene.id}`} scene={scene} paused={stopped} onEnded={handleEnded} onFailed={handleFailed} />
				)}
				{!animated && poster && <img className="hero__image" src={poster.poster ?? undefined} alt={poster.alt} />}
				{!animated && !poster && <HeroIllustration {...illustration} />}
				{hasClip && (
					<button
						type="button"
						className="hero__skip text-button"
						data-playback={running ? 'skip' : 'replay'}
						onClick={running ? handleSkip : handleReplay}
					>
						{running ? SCENE_TEXTS.skip : SCENE_TEXTS.replay}
					</button>
				)}
			</div>
		</div>
	);
}
