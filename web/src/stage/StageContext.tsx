import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_ROLE, type Role } from '../roles/config';
import { pickScene, type SceneSpec } from '../scenes/config';
import { INITIAL_PROGRESS, type ProgressState } from '../visuals/progress';

export type StagePhase = 'idle' | 'working' | 'result';
export type SlotKind = 'foreground' | 'corner';

export interface StageTiming {
	engineMs: number;
	shownMs: number;
}

export interface StageSlotInfo {
	element: HTMLElement;
	role?: Role;
}

export interface StageValue {
	phase: StagePhase;
	scene: SceneSpec | null;
	runId: number;
	waitingRole: Role;
	resultRole: Role | null;
	resultId: string | null;
	progress: ProgressState;
	timing: StageTiming | null;
	foregroundSlot: StageSlotInfo | null;
	cornerSlot: StageSlotInfo | null;
	begin: (role?: Role, options?: { keep?: boolean }) => void;
	resolve: (role?: Role | null, id?: string | null, readyAt?: number) => void;
	reset: () => void;
	markShown: () => void;
	setProgress: (progress: ProgressState) => void;
	registerSlot: (kind: SlotKind, info: StageSlotInfo | null) => void;
}

const NO_OPERATION = () => undefined;

const DETACHED_STAGE: StageValue = {
	phase: 'idle',
	scene: null,
	runId: 0,
	waitingRole: DEFAULT_ROLE,
	resultRole: null,
	resultId: null,
	progress: INITIAL_PROGRESS,
	timing: null,
	foregroundSlot: null,
	cornerSlot: null,
	begin: NO_OPERATION,
	resolve: NO_OPERATION,
	reset: NO_OPERATION,
	markShown: NO_OPERATION,
	setProgress: NO_OPERATION,
	registerSlot: NO_OPERATION,
};

const StageContext = createContext<StageValue>(DETACHED_STAGE);

interface Marks {
	start?: number;
	ready?: number;
	shown?: number;
}

export function StageProvider({ children }: { children: ReactNode }) {
	const [phase, setPhase] = useState<StagePhase>('idle');
	const [scene, setScene] = useState<SceneSpec | null>(null);
	const [runId, setRunId] = useState(0);
	const [waitingRole, setWaitingRole] = useState<Role>(DEFAULT_ROLE);
	const [resultRole, setResultRole] = useState<Role | null>(null);
	const [resultId, setResultId] = useState<string | null>(null);
	const [progress, setProgress] = useState<ProgressState>(INITIAL_PROGRESS);
	const [timing, setTiming] = useState<StageTiming | null>(null);
	const [foregroundSlot, setForegroundSlot] = useState<StageSlotInfo | null>(null);
	const [cornerSlot, setCornerSlot] = useState<StageSlotInfo | null>(null);
	const marks = useRef<Marks>({});
	const phaseRef = useRef<StagePhase>('idle');

	const changePhase = useCallback((next: StagePhase) => {
		phaseRef.current = next;
		setPhase(next);
	}, []);

	const begin = useCallback(
		(role: Role = DEFAULT_ROLE, options: { keep?: boolean } = {}) => {
			if (options.keep && phaseRef.current === 'working') return;
			marks.current = { start: Date.now() };
			setRunId((current) => current + 1);
			setWaitingRole(role);
			setResultRole(null);
			setResultId(null);
			setScene(pickScene(role));
			setProgress(INITIAL_PROGRESS);
			setTiming(null);
			changePhase('working');
		},
		[changePhase],
	);

	const resolve = useCallback(
		(role?: Role | null, id?: string | null, readyAt?: number) => {
			if (phaseRef.current !== 'working') return;
			marks.current.ready = readyAt ?? Date.now();
			if (role) setResultRole(role);
			setResultId(id ?? null);
			changePhase('result');
		},
		[changePhase],
	);

	const reset = useCallback(() => {
		marks.current = {};
		setScene(null);
		setResultRole(null);
		setResultId(null);
		setTiming(null);
		changePhase('idle');
	}, [changePhase]);

	const markShown = useCallback(() => {
		const current = marks.current;
		if (current.start === undefined || current.ready === undefined || current.shown !== undefined) return;
		current.shown = Date.now();
		setTiming({ engineMs: current.ready - current.start, shownMs: current.shown - current.start });
	}, []);

	const registerSlot = useCallback((kind: SlotKind, info: StageSlotInfo | null) => {
		const setter = kind === 'foreground' ? setForegroundSlot : setCornerSlot;
		setter((current) => {
			if (current === info) return current;
			if (current && info && current.element === info.element && current.role === info.role) return current;
			if (!info && current) return null;
			return info;
		});
	}, []);

	const value = useMemo<StageValue>(
		() => ({
			phase,
			scene,
			runId,
			waitingRole,
			resultRole,
			resultId,
			progress,
			timing,
			foregroundSlot,
			cornerSlot,
			begin,
			resolve,
			reset,
			markShown,
			setProgress,
			registerSlot,
		}),
		[phase, scene, runId, waitingRole, resultRole, resultId, progress, timing, foregroundSlot, cornerSlot, begin, resolve, reset, markShown, registerSlot],
	);

	return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}

export function useStage(): StageValue {
	return useContext(StageContext);
}

export function useShownMark(visible: boolean): void {
	const { markShown } = useStage();
	useEffect(() => {
		if (visible) markShown();
	}, [visible, markShown]);
}
