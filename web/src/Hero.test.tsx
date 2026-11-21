// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BRAND_TAGLINE } from '../../src/render/warning';
import { App } from './App';
import { Hero, HeroIllustration } from './components/Hero';
import { HOME_TEXTS } from './components/HomeSections';
import { HISTORY_KEY } from './history';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState(null, '', '/');
	window.localStorage.clear();
});

function countWords(text: string): number {
	return text.split(/\s+/u).filter(Boolean).length;
}

function stubLatest(count: number) {
	const documents = Array.from({ length: count }, (_, index) => ({
		documentId: `d${index}`,
		title: `Dokument ${index}`,
		url: `https://przyklad.example/${index}`,
		publisher: 'Urząd',
		publishedAt: '2026-11-01',
		fetchedAt: '2026-11-02T10:00:00Z',
		sourceType: 'urzedowy',
		domain: 'przyklad.example',
	}));
	vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ corpusVersion: 'x', documents }), { status: 200 })));
}

describe('pierwszy ekran strony głównej', () => {
	it('ma hasło dosłownie, jedno pole, jeden przycisk i do 35 słów', () => {
		stubLatest(0);
		const { container } = render(<App />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(BRAND_TAGLINE);
		expect(container.querySelectorAll('textarea')).toHaveLength(1);
		const hero = container.querySelector('.hero') as HTMLElement;
		expect(within(hero).getAllByRole('button')).toHaveLength(1);
		const header = container.querySelector('.site-header') as HTMLElement;
		const visible = [header, hero]
			.map((node) => {
				const clone = node.cloneNode(true) as HTMLElement;
				clone.querySelectorAll('.visually-hidden, [aria-hidden="true"]').forEach((item) => item.remove());
				return clone.textContent ?? '';
			})
			.join(' ');
		expect(countWords(visible)).toBeLessThanOrEqual(35);
	});

	it('rezerwuje miejsce na ilustrację: zaślepka z kodu albo plik z tekstem alternatywnym', () => {
		const placeholder = render(<HeroIllustration />);
		expect(placeholder.container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
		expect(placeholder.container.querySelector('img')).toBeNull();
		cleanup();
		const custom = render(<HeroIllustration src="/postac.webp" alt="Postać z mapą i lupą" />);
		expect(custom.container.querySelector('img')?.getAttribute('alt')).toBe('Postać z mapą i lupą');
		cleanup();
		render(<Hero illustration={{ src: '/a.png', alt: 'Opis' }}><p>Pole</p></Hero>);
		expect(screen.getByAltText('Opis')).toBeTruthy();
	});

	it('licznik znaków pojawia się dopiero blisko limitu', () => {
		stubLatest(0);
		render(<App />);
		const field = screen.getByLabelText(/Wklej informację lub link/);
		fireEvent.change(field, { target: { value: 'a'.repeat(100) } });
		expect(screen.queryByText(/Znaków:/)).toBeNull();
		fireEvent.change(field, { target: { value: 'a'.repeat(1700) } });
		expect(screen.getByText('Znaków: 1700 z 2000')).toBeTruthy();
	});
});

describe('sekcje pod polem', () => {
	it('pokazują po 3 pozycje, reszta pod "Pokaż więcej"', async () => {
		stubLatest(5);
		window.localStorage.setItem(
			HISTORY_KEY,
			JSON.stringify(
				Array.from({ length: 5 }, (_, index) => ({
					id: `${index}`.repeat(64),
					text: `Sprawdzenie ${index}`,
					label: 'potwierdzone',
					checkedAt: '2026-11-20T10:00:00Z',
				})),
			),
		);
		const { container } = render(<App />);
		await screen.findByRole('link', { name: /Dokument 0/ });
		const sections = container.querySelectorAll('.home-section');
		expect(sections).toHaveLength(2);
		for (const section of sections) {
			expect(section.querySelectorAll('.home-list__item')).toHaveLength(3);
			fireEvent.click(within(section as HTMLElement).getByRole('button', { name: HOME_TEXTS.showMore }));
			expect(section.querySelectorAll('.home-list__item')).toHaveLength(5);
		}
		expect(container.querySelector('.home-section__note')).toBeNull();
	});
});
