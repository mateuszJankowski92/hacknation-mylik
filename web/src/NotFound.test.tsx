// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { NOT_FOUND_TEXTS, NOT_FOUND_TITLE } from './components/NotFoundView';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
});

describe('strona 404', () => {
	it('nieznany adres: papierowy ekran, tytuł, noindex, przycisk na stronę główną', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
		window.history.replaceState(null, '', '/nie-ma-takiej-strony');
		render(<App />);
		expect(await screen.findByRole('heading', { level: 1, name: NOT_FOUND_TEXTS.title })).toBeTruthy();
		expect(screen.getByText(NOT_FOUND_TEXTS.body)).toBeTruthy();
		expect(screen.getByRole('link', { name: NOT_FOUND_TEXTS.action }).getAttribute('href')).toBe('/');
		expect(document.title).toBe(NOT_FOUND_TITLE);
		expect(document.head.querySelector('meta[name="robots"][content*="noindex"]')).not.toBeNull();
	});
});
