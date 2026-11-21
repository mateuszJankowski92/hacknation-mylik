// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { stubReducedMotion } from './testing/motion';
import { plain } from './typography';

beforeEach(() => {
	stubReducedMotion(true);
	vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ corpusVersion: 'x', documents: [] }), { status: 200 })));
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
});

const PAGES = ['/', '/zrodla', '/dostepnosc', '/prywatnosc', '/r/nie-ma-takiego'];

describe('stopka i nagłówek', () => {
	it('nagłówek nie ma znaczka Prototyp', () => {
		const { container } = render(<App />);
		const header = container.querySelector('.site-header') as HTMLElement;
		expect(header.textContent).not.toContain('Prototyp');
	});

	for (const path of PAGES) {
		it(`stopka na ${path}: jedna linia o prototypie i cztery odnośniki`, () => {
			window.history.replaceState(null, '', path);
			const { container } = render(<App />);
			const footer = container.querySelector('footer') as HTMLElement;
			expect(plain(footer.querySelector('.site-footer__note')?.textContent ?? '')).toBe(
				'Prototyp z hackathonu HackNation 2026. To nie jest oficjalna usługa administracji publicznej.',
			);
			const links = within(footer).getAllByRole('link');
			expect(links.map((link) => link.textContent)).toEqual(['Źródła', 'Dostępność', 'Prywatność', 'Ustawienia prywatności']);
			expect(links.map((link) => link.getAttribute('href'))).toEqual(['/zrodla', '/dostepnosc', '/prywatnosc', '/prywatnosc#ustawienia']);
		});
	}

	it('odnośniki stopki prowadzą do stron bez przeładowania', () => {
		const { container } = render(<App />);
		fireEvent.click(within(container.querySelector('footer') as HTMLElement).getByRole('link', { name: 'Dostępność' }));
		expect(window.location.pathname).toBe('/dostepnosc');
		expect(screen.getByRole('heading', { level: 1, name: 'Dostępność' })).toBeTruthy();
		fireEvent.click(within(container.querySelector('footer') as HTMLElement).getByRole('link', { name: 'Prywatność' }));
		expect(window.location.pathname).toBe('/prywatnosc');
		expect(screen.getByRole('heading', { level: 1, name: 'Prywatność' })).toBeTruthy();
	});
});
