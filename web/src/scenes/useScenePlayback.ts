import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Role } from '../roles/config';
import { pickScene, type SceneSpec } from './config';
import { prefersReducedMotion, readSceneSkipped, subscribeSceneSkipped, writeSceneSkipped } from './preferences';

export interface SceneTiming {
	engineMs: number;
	shownMs: number;
}

export interface ScenePlayback {
	scene: SceneSpec | null;
	enabled: boolean;
	reducedMotion: boolean;
	released: boolean;
	timing: SceneTiming | null;
	begin: () => void;
	reset: () => void;
	end: () => void;
	skip: () => void;
}

interface Marks {
	start?: number;
	ready?: number;
	shown?: number;
}

export function useScenePlayback(role: Role, ready: boolean): ScenePlayback {
	const skipped = useSyncExternalStore(subscribeSceneSkipped, readSceneSkipped, () => false);
	const reducedMotion = prefersReducedMotion();
	const [scene, setScene] = useState<SceneSpec | null>(null);
	const [ended, setEnded] = useState(false);
	const [timing, setTiming] = useState<SceneTiming | null>(null);
	const marks = useRef<Marks>({});

	const enabled = !skipped && !reducedMotion;
	const released = !enabled || scene === null || ended;

	const begin = useCallback(() => {
		marks.current = { start: Date.now() };
		setScene(pickScene(role));
		setEnded(false);
		setTiming(null);
	}, [role]);

	const reset = useCallback(() => {
		marks.current = {};
		setScene(null);
		setEnded(false);
		setTiming(null);
	}, []);

	const end = useCallback(() => setEnded(true), []);
	const skip = useCallback(() => writeSceneSkipped(true), []);

	useEffect(() => {
		const current = marks.current;
		if (!ready) {
			current.ready = undefined;
			current.shown = undefined;
			return;
		}
		const now = Date.now();
		if (current.ready === undefined) current.ready = now;
		if (!released || current.shown !== undefined || current.start === undefined) return;
		current.shown = now;
		setTiming({ engineMs: current.ready - current.start, shownMs: now - current.start });
	}, [ready, released]);

	return { scene, enabled, reducedMotion, released, timing, begin, reset, end, skip };
}
