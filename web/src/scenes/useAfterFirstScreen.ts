import { useEffect, useState } from 'react';

const IDLE_TIMEOUT_MS = 1500;

type IdleWindow = Window & {
	requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
	cancelIdleCallback?: (handle: number) => void;
};

export function useAfterFirstScreen(): boolean {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const idleWindow = window as IdleWindow;
		let idleHandle: number | undefined;
		let timerHandle: ReturnType<typeof setTimeout> | undefined;

		function arm() {
			setReady(true);
		}

		function schedule() {
			if (typeof idleWindow.requestIdleCallback === 'function') {
				idleHandle = idleWindow.requestIdleCallback(arm, { timeout: IDLE_TIMEOUT_MS });
				return;
			}
			timerHandle = setTimeout(arm, 0);
		}

		if (document.readyState === 'complete') schedule();
		else window.addEventListener('load', schedule, { once: true });

		return () => {
			window.removeEventListener('load', schedule);
			if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
			if (timerHandle !== undefined) clearTimeout(timerHandle);
		};
	}, []);

	return ready;
}
