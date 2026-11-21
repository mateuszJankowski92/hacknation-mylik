import { useEffect, useRef, useState } from 'react';
import { artAlt, type Role } from '../roles/config';
import { RoleArt } from '../roles/RoleArt';
import type { ProgressState } from '../visuals/progress';
import { SCENE_START_TIMEOUT_MS, SCENE_TEXTS, type SceneSpec } from './config';
import { connectionIsSlow } from './preferences';
import './scenes.css';

const MAX_MARKS = 12;

type StageMode = 'video' | 'placeholder' | 'poster';

function initialMode(scene: SceneSpec): StageMode {
	if (!scene.file) return 'placeholder';
	return connectionIsSlow() ? 'poster' : 'video';
}

export function SceneMarks({ progress }: { progress: ProgressState }) {
	const marks = progress.pebbles.slice(0, MAX_MARKS);
	return (
		<ul className="scene__marks" aria-hidden="true" data-count={progress.pebbles.length}>
			{marks.map((pebble) => (
				<li key={pebble.id} className={`scene__mark scene__mark--${pebble.stance}`} />
			))}
		</ul>
	);
}

interface ClipProps {
	scene: SceneSpec;
	onEnd: () => void;
	onFallback: () => void;
}

function VideoClip({ scene, onEnd, onFallback }: ClipProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const startedRef = useRef(false);
	const callbacks = useRef({ onEnd, onFallback });
	callbacks.current = { onEnd, onFallback };

	useEffect(() => {
		const timer = setTimeout(() => {
			if (!startedRef.current) callbacks.current.onFallback();
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

	function handleEnded() {
		callbacks.current.onEnd();
		const video = videoRef.current;
		if (!video) return;
		video.currentTime = 0;
		try {
			const attempt = video.play() as Promise<void> | undefined;
			attempt?.catch(() => undefined);
		} catch {
			return;
		}
	}

	return (
		<video
			ref={videoRef}
			className="scene__video"
			src={scene.file ?? undefined}
			poster={scene.poster ?? undefined}
			muted
			playsInline
			preload="auto"
			disablePictureInPicture
			disableRemotePlayback
			controlsList="nofullscreen noremoteplayback"
			aria-label={scene.alt}
			onPlaying={() => {
				startedRef.current = true;
			}}
			onEnded={handleEnded}
			onError={() => callbacks.current.onFallback()}
		/>
	);
}

function PlaceholderClip({ scene, role, onEnd }: { scene: SceneSpec; role: Role; onEnd: () => void }) {
	const callbackRef = useRef(onEnd);
	callbackRef.current = onEnd;

	useEffect(() => {
		const timer = setTimeout(() => callbackRef.current(), scene.durationSec * 1000);
		return () => clearTimeout(timer);
	}, [scene]);

	return (
		<div className="scene__placeholder" data-variant={scene.id}>
			<RoleArt owner={role} name="praca" alt={scene.alt} className="scene__figure" />
			<span className="scene__sweep" aria-hidden="true" />
		</div>
	);
}

export function ScenePoster({ scene, role }: { scene: SceneSpec; role: Role }) {
	if (scene.poster) return <img className="scene__poster" src={scene.poster} alt={scene.alt} />;
	return <RoleArt owner={role} name="praca" alt={scene.alt || artAlt(role, 'praca')} className="scene__figure" />;
}

export interface SceneStageProps {
	scene: SceneSpec;
	role: Role;
	progress: ProgressState;
	onEnd: () => void;
}

export function SceneStage({ scene, role, progress, onEnd }: SceneStageProps) {
	const [mode, setMode] = useState<StageMode>(() => initialMode(scene));

	useEffect(() => {
		if (mode === 'poster') onEnd();
	}, [mode, onEnd]);

	return (
		<div className="scene stage" data-scene={scene.id} data-mode={mode}>
			{mode === 'video' && <VideoClip scene={scene} onEnd={onEnd} onFallback={() => setMode('poster')} />}
			{mode === 'placeholder' && <PlaceholderClip scene={scene} role={role} onEnd={onEnd} />}
			{mode === 'poster' && <ScenePoster scene={scene} role={role} />}
			<SceneMarks progress={progress} />
		</div>
	);
}
