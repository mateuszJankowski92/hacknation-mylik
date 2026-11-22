import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useMotionSetting } from '../a11y/settings';
import { artAlt, type Role } from '../roles/config';
import { RoleArt } from '../roles/RoleArt';
import { SCENE_START_TIMEOUT_MS, type SceneSpec } from '../scenes/config';
import { PlaybackButton } from '../scenes/PlaybackButton';
import { animationStartsAutomatically } from '../scenes/preferences';
import { SceneMarks } from '../scenes/SceneStage';
import { useStage, type StageSlotInfo } from './StageContext';
import './stage.css';

interface Box {
	top: number;
	left: number;
	width: number;
	height: number;
}

const HOLD_AFTER_SLOT_LOSS_MS = 900;
const ANIMATION_MS = 520;

function sameBox(a: Box | null, b: Box | null): boolean {
	if (!a || !b) return a === b;
	return (
		Math.abs(a.top - b.top) < 0.5 &&
		Math.abs(a.left - b.left) < 0.5 &&
		Math.abs(a.width - b.width) < 0.5 &&
		Math.abs(a.height - b.height) < 0.5
	);
}

interface ClipProps {
	scene: SceneSpec;
	paused: boolean;
	done: boolean;
	finishing: boolean;
	onFinished: () => void;
	onFailed: () => void;
	onPlaying: () => void;
}

function StageClip({ scene, paused, done, finishing, onFinished, onFailed, onPlaying }: ClipProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const startedRef = useRef(false);
	const latest = useRef({ finishing, onFinished, onFailed, onPlaying });
	latest.current = { finishing, onFinished, onFailed, onPlaying };

	useEffect(() => {
		const timer = setTimeout(() => {
			if (!startedRef.current) latest.current.onFailed();
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

	useEffect(() => {
		const video = videoRef.current;
		if (video && finishing) video.loop = false;
	}, [finishing]);

	function handleEnded() {
		if (latest.current.finishing) {
			latest.current.onFinished();
			return;
		}
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
			className={done ? 'character-stage__media character-stage__clip character-stage__clip--done' : 'character-stage__media character-stage__clip'}
			src={scene.file ?? undefined}
			poster={scene.poster ?? undefined}
			muted
			playsInline
			preload="auto"
			aria-hidden="true"
			tabIndex={-1}
			disablePictureInPicture
			disableRemotePlayback
			controlsList="nofullscreen noremoteplayback"
			onPlaying={() => {
				startedRef.current = true;
				latest.current.onPlaying();
			}}
			onEnded={handleEnded}
			onError={() => latest.current.onFailed()}
		/>
	);
}

function targetSlot(phase: string, foreground: StageSlotInfo | null, corner: StageSlotInfo | null): StageSlotInfo | null {
	if (phase === 'working') return foreground ?? corner;
	return corner ?? (phase === 'result' ? foreground : null);
}

export function CharacterStage({ appRef }: { appRef: RefObject<HTMLElement | null> }) {
	const stage = useStage();
	const [stopped, setStopped] = useState(false);
	const [replayed, setReplayed] = useState(false);
	const [playId, setPlayId] = useState(0);
	const [box, setBox] = useState<Box | null>(null);
	const [animating, setAnimating] = useState(false);
	const [hidden, setHidden] = useState(true);
	const [clipFailed, setClipFailed] = useState(false);
	const [clipPlaying, setClipPlaying] = useState(false);
	const [clipFinished, setClipFinished] = useState(false);
	const placedRef = useRef(false);
	const motionSetting = useMotionSetting();
	useEffect(() => {
		setReplayed(false);
		setStopped(false);
	}, [motionSetting]);
	const animationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const target = targetSlot(stage.phase, stage.foregroundSlot, stage.cornerSlot);
	const targetElement = target?.element ?? null;
	const mode = stage.phase === 'working' ? 'foreground' : 'corner';
	const scene = stage.scene;
	const clipAvailable = Boolean(scene?.file) && !clipFailed && stage.phase !== 'idle';
	const mayPlay = animationStartsAutomatically() || replayed;
	const clipMounted = clipAvailable && mayPlay;
	const clipVisible = clipMounted && !clipFinished;
	const clipRunning = clipVisible && !stopped;
	const control = clipRunning ? (clipPlaying ? 'skip' : 'none') : clipAvailable && (stopped || !mayPlay) ? 'replay' : 'none';
	const stillRole: Role = stage.resultRole ?? stage.cornerSlot?.role ?? stage.waitingRole;

	useEffect(() => {
		if (stage.phase === 'working') {
			setClipFailed(false);
			setClipPlaying(false);
			setClipFinished(false);
			setStopped(false);
			setReplayed(false);
		}
	}, [stage.phase, stage.runId]);

	const handleReplay = useCallback(() => {
		setStopped(false);
		setReplayed(true);
		setClipFailed(false);
		setClipPlaying(false);
		setClipFinished(false);
		setPlayId((current) => current + 1);
	}, []);

	const measure = useCallback(() => {
		const app = appRef.current;
		if (!app || !targetElement) return;
		const appRect = app.getBoundingClientRect();
		const rect = targetElement.getBoundingClientRect();
		const next: Box = { top: rect.top - appRect.top, left: rect.left - appRect.left, width: rect.width, height: rect.height };
		setBox((current) => (sameBox(current, next) ? current : next));
	}, [appRef, targetElement]);

	useLayoutEffect(() => {
		if (!targetElement) return;
		const wasPlaced = placedRef.current;
		measure();
		placedRef.current = true;
		setHidden(false);
		if (!wasPlaced) return;
		setAnimating(true);
		clearTimeout(animationTimer.current);
		animationTimer.current = setTimeout(() => setAnimating(false), ANIMATION_MS);
	}, [targetElement, measure]);

	useEffect(() => () => clearTimeout(animationTimer.current), []);

	useEffect(() => {
		if (!targetElement) return;
		const app = appRef.current;
		const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measure()) : null;
		observer?.observe(targetElement);
		if (app) observer?.observe(app);
		window.addEventListener('resize', measure);
		const frame = requestAnimationFrame(measure);
		return () => {
			observer?.disconnect();
			window.removeEventListener('resize', measure);
			cancelAnimationFrame(frame);
		};
	}, [targetElement, appRef, measure]);

	useEffect(() => {
		if (targetElement) return;
		const timer = setTimeout(() => {
			setHidden(true);
			placedRef.current = false;
		}, stage.phase === 'idle' ? 0 : HOLD_AFTER_SLOT_LOSS_MS);
		return () => clearTimeout(timer);
	}, [targetElement, stage.phase]);

	if (!box || hidden) return null;

	const foregroundAlt = artAlt(stillRole, 'praca');

	return (
		<div
			className="character-stage"
			data-mode={mode}
			data-phase={stage.phase}
			data-animating={animating ? 'true' : 'false'}
			data-clip={clipVisible ? (clipPlaying ? 'playing' : 'loading') : 'none'}
			data-control={control}
			style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
		>
			<div
				className="character-stage__frame stage"
				role={mode === 'foreground' ? 'img' : undefined}
				aria-label={mode === 'foreground' ? (scene?.alt || foregroundAlt) : undefined}
				aria-hidden={mode === 'foreground' ? undefined : true}
			>
				<RoleArt owner={stillRole} name="praca" alt="" decorative className="character-stage__media character-stage__figure" />
				{clipMounted && scene && (
					<StageClip
						key={`${stage.runId}-${playId}-${stage.waitingRole}-${scene.id}`}
						scene={scene}
						paused={stopped}
						done={clipFinished}
						finishing={stage.phase === 'result'}
						onFinished={() => setClipFinished(true)}
						onFailed={() => setClipFailed(true)}
						onPlaying={() => setClipPlaying(true)}
					/>
				)}
				{stage.phase === 'working' && <SceneMarks progress={stage.progress} />}
			</div>
			{control === 'skip' && <PlaybackButton className="character-stage__skip" running onClick={() => setStopped(true)} />}
			{control === 'replay' && <PlaybackButton className="character-stage__skip" running={false} onClick={handleReplay} />}
		</div>
	);
}
