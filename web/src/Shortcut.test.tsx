// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckForm } from './components/CheckForm';
import { SUBMIT_SHORTCUT_LABELS, isSubmitShortcut, submitShortcutHint } from './components/shortcut';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function field(): HTMLTextAreaElement {
	return screen.getByLabelText(/Wklej informację lub link/) as HTMLTextAreaElement;
}

function stubPlatform(platform: string, touch = false) {
	vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue(platform);
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: touch && query.includes('pointer: coarse'),
		media: query,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	}));
}

describe('skrót wysyłania w polu tekstowym', () => {
	it('Cmd+Enter oraz Ctrl+Enter wysyłają formularz, niezależnie od systemu', () => {
		for (const platform of ['MacIntel', 'Win32', 'Linux x86_64']) {
			stubPlatform(platform);
			const onSubmit = vi.fn();
			const view = render(<CheckForm loading={false} onSubmit={onSubmit} onCancel={() => undefined} />);
			fireEvent.change(field(), { target: { value: 'Biblioteka jest czynna w weekendy.' } });
			fireEvent.keyDown(field(), { key: 'Enter', metaKey: true });
			fireEvent.keyDown(field(), { key: 'Enter', ctrlKey: true });
			expect(onSubmit, platform).toHaveBeenCalledTimes(2);
			expect(onSubmit).toHaveBeenCalledWith('Biblioteka jest czynna w weekendy.');
			view.unmount();
		}
	});

	it('sam Enter dodaje nowy wiersz i niczego nie wysyła', () => {
		const onSubmit = vi.fn();
		render(<CheckForm loading={false} onSubmit={onSubmit} onCancel={() => undefined} />);
		fireEvent.change(field(), { target: { value: 'Pierwszy wiersz' } });
		const notPrevented = fireEvent.keyDown(field(), { key: 'Enter' });
		expect(notPrevented).toBe(true);
		expect(fireEvent.keyDown(field(), { key: 'Enter', shiftKey: true })).toBe(true);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('skrót nie wysyła pustego pola ani samych spacji', () => {
		const onSubmit = vi.fn();
		render(<CheckForm loading={false} onSubmit={onSubmit} onCancel={() => undefined} />);
		fireEvent.keyDown(field(), { key: 'Enter', metaKey: true });
		fireEvent.change(field(), { target: { value: '   \n  ' } });
		fireEvent.keyDown(field(), { key: 'Enter', ctrlKey: true });
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('skrót nie wysyła drugi raz w trakcie sprawdzania ani zbyt długiej treści', () => {
		const onSubmit = vi.fn();
		const view = render(<CheckForm loading={false} onSubmit={onSubmit} onCancel={() => undefined} />);
		fireEvent.change(field(), { target: { value: 'Biblioteka jest czynna w weekendy.' } });
		fireEvent.keyDown(field(), { key: 'Enter', metaKey: true });
		expect(onSubmit).toHaveBeenCalledTimes(1);
		view.rerender(<CheckForm loading onSubmit={onSubmit} onCancel={() => undefined} />);
		fireEvent.keyDown(field(), { key: 'Enter', metaKey: true });
		fireEvent.keyDown(field(), { key: 'Enter', ctrlKey: true });
		expect(onSubmit).toHaveBeenCalledTimes(1);
		view.rerender(<CheckForm loading={false} onSubmit={onSubmit} onCancel={() => undefined} />);
		fireEvent.change(field(), { target: { value: 'a'.repeat(2001) } });
		fireEvent.keyDown(field(), { key: 'Enter', metaKey: true });
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('pole ogłasza skrót czytnikom ekranu, a logika zna tylko klawisze, nie system', () => {
		render(<CheckForm loading={false} onSubmit={() => undefined} onCancel={() => undefined} />);
		expect(field().getAttribute('aria-keyshortcuts')).toBe('Control+Enter Meta+Enter');
		expect(isSubmitShortcut({ key: 'Enter', metaKey: true, ctrlKey: false })).toBe(true);
		expect(isSubmitShortcut({ key: 'Enter', metaKey: false, ctrlKey: true })).toBe(true);
		expect(isSubmitShortcut({ key: 'Enter', metaKey: false, ctrlKey: false })).toBe(false);
		expect(isSubmitShortcut({ key: 'a', metaKey: true, ctrlKey: false })).toBe(false);
		expect(isSubmitShortcut({ key: 'Enter', metaKey: true, ctrlKey: false, isComposing: true })).toBe(false);
	});
});

describe('podpowiedź skrótu przy przycisku', () => {
	it('na Macu pokazuje "⌘ Enter"', () => {
		stubPlatform('MacIntel');
		const { container } = render(<CheckForm loading={false} onSubmit={() => undefined} onCancel={() => undefined} />);
		expect(container.querySelector('.check-form__hint')?.textContent).toBe(SUBMIT_SHORTCUT_LABELS.apple);
		expect(SUBMIT_SHORTCUT_LABELS.apple).toBe('⌘ Enter');
	});

	it('w innych systemach pokazuje "Ctrl + Enter"', () => {
		stubPlatform('Win32');
		const { container } = render(<CheckForm loading={false} onSubmit={() => undefined} onCancel={() => undefined} />);
		expect(container.querySelector('.check-form__hint')?.textContent).toBe('Ctrl + Enter');
	});

	it('na urządzeniu dotykowym nie pokazuje nic, także na iPadzie', () => {
		stubPlatform('iPad', true);
		const { container } = render(<CheckForm loading={false} onSubmit={() => undefined} onCancel={() => undefined} />);
		expect(container.querySelector('.check-form__hint')).toBeNull();
		expect(submitShortcutHint()).toBeNull();
	});

	it('znika w trakcie sprawdzania', () => {
		stubPlatform('Win32');
		const { container } = render(<CheckForm loading onSubmit={() => undefined} onCancel={() => undefined} />);
		expect(container.querySelector('.check-form__hint')).toBeNull();
	});
});
