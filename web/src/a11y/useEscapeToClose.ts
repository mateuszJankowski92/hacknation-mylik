import { useEffect } from 'react';

export function closeOpenPanel(active: Element | null): boolean {
	if (!(active instanceof HTMLElement)) return false;
	const details = active.closest('details[open]');
	if (details instanceof HTMLDetailsElement) {
		details.open = false;
		details.querySelector('summary')?.focus();
		return true;
	}
	if (active.matches("button[aria-expanded='true']")) {
		active.click();
		return true;
	}
	return false;
}

export function useEscapeToClose(): void {
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape' || event.defaultPrevented) return;
			if (closeOpenPanel(document.activeElement)) event.preventDefault();
		}
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);
}
