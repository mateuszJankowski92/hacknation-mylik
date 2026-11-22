// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ClaimResult, VerificationRecord } from '../../src/contracts/record';
import { STATES, STATE_LABELS_PL, VERDICTS, VERDICT_LABELS_PL } from '../../src/contracts/verdict';
import { DiscordNote } from './components/DiscordNote';
import { ResultTag, RESULT_TAG_LOOK, StanceTag, type ResultTone } from './components/ResultTag';
import { RecordView } from './components/RecordView';
import { splitInputByClaims } from './components/ClaimSummary';
import { FIXTURE_OUTCOMES } from './fixtures/outcomes';
import { DISCORD_INVITE_URL } from './siteConfig';
import { INITIAL_PROGRESS, reduceProgress, type ProgressState, type WaitingEvent } from './visuals/progress';
import { waitingLines } from './visuals/waitingLines';
import { formatCheckedAt } from './visuals/waitingConfig';

afterEach(cleanup);

const HERE = dirname(fileURLToPath(import.meta.url));
const styles = readFileSync(join(HERE, 'styles.css'), 'utf8');
const highContrast = readFileSync(join(HERE, 'a11y', 'a11y.css'), 'utf8');

function tokens(block: string): Record<string, string> {
	return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)].map((match) => [match[1], match[2].toLowerCase()]));
}

const light = tokens(/:root\s*\{([^}]*)\}/.exec(styles)![1]);
const high = tokens(/html\[data-contrast='high'\]\s*\{([^}]*)\}/.exec(highContrast)![1]);

function luminance(hex: string): number {
	const channels = [1, 3, 5].map((index) => {
		const value = parseInt(hex.slice(index, index + 2), 16) / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function ratio(foreground: string, background: string): number {
	const [bright, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
	return (bright + 0.05) / (dark + 0.05);
}

const TONES: ResultTone[] = ['confirmed', 'misleading', 'false', 'unproven', 'unverifiable', 'state'];

describe('metka wyniku: jedno źródło prawdy', () => {
	it('mapa pokrywa pięć werdyktów i trzy stany, z brzmieniem z wytycznych', () => {
		expect(Object.keys(RESULT_TAG_LOOK).sort()).toEqual([...VERDICTS, ...STATES].sort());
		for (const verdict of VERDICTS) expect(RESULT_TAG_LOOK[verdict].label).toBe(VERDICT_LABELS_PL[verdict]);
		for (const state of STATES) expect(RESULT_TAG_LOOK[state].label).toBe(STATE_LABELS_PL[state]);
	});

	it('każda metka ma ikonę i napis, więc znaczenie nie zależy od koloru', () => {
		for (const kind of [...VERDICTS, ...STATES]) {
			const { container } = render(<ResultTag kind={kind} size="lg" />);
			expect(container.querySelector('svg[aria-hidden="true"] path, svg[aria-hidden="true"] circle')).not.toBeNull();
			expect(container.querySelector('.result-tag__label')?.textContent?.replace(/\u00a0/g, ' ')).toBe(RESULT_TAG_LOOK[kind].label);
			cleanup();
		}
	});

	it('każdy werdykt ma inną ikonę, a trzy stany mają ton bez koloru werdyktu', () => {
		const icons = VERDICTS.map((verdict) => RESULT_TAG_LOOK[verdict].icon);
		expect(new Set(icons).size).toBe(VERDICTS.length);
		for (const state of STATES) expect(RESULT_TAG_LOOK[state].tone).toBe('state');
	});

	it('metka z licznikiem czyta się "napis: liczba"', () => {
		const { container } = render(<ResultTag kind="potwierdzone" count={4} />);
		expect(container.textContent?.replace(/\u00a0/g, ' ')).toBe('potwierdzone: 4');
	});

	it('znaczek stanowiska: potwierdza i przeczy w tym samym systemie, kontekst bez znaczka', () => {
		const { container } = render(
			<>
				<StanceTag stance="potwierdza" />
				<StanceTag stance="obala" />
				<StanceTag stance="kontekst" />
			</>,
		);
		const tags = [...container.querySelectorAll('.result-tag')];
		expect(tags.map((tag) => [tag.getAttribute('data-tone'), tag.textContent])).toEqual([
			['confirmed', 'potwierdza'],
			['false', 'przeczy'],
		]);
	});
});

describe('kontrast metek', () => {
	for (const tone of TONES) {
		it(`jasny: napis ${tone}, ikona, kontur i licznik min. 4,5:1`, () => {
			const bg = light[`tag-${tone}-bg`];
			expect(ratio(light[`tag-${tone}-fg`], bg), 'napis').toBeGreaterThanOrEqual(4.5);
			expect(ratio(light[`tag-${tone}-accent`], bg), 'akcent i licznik').toBeGreaterThanOrEqual(4.5);
		});

		it(`wysoki kontrast: ${tone} to kontur z napisem na czerni, bez pasteli`, () => {
			expect(high[`tag-${tone}-bg`]).toBe('#000000');
			expect(ratio(high[`tag-${tone}-fg`], high[`tag-${tone}-bg`])).toBeGreaterThanOrEqual(7);
			expect(ratio(high[`tag-${tone}-accent`], high[`tag-${tone}-bg`])).toBeGreaterThanOrEqual(7);
		});
	}

	it('paleta jest pastelowa i stonowana (jasne tło, bez jaskrawych świateł drogowych)', () => {
		for (const tone of TONES.filter((item) => item !== 'state')) {
			expect(luminance(light[`tag-${tone}-bg`]), tone).toBeGreaterThan(0.7);
			const [r, g, b] = [1, 3, 5].map((index) => parseInt(light[`tag-${tone}-accent`].slice(index, index + 2), 16));
			expect(Math.max(r, g, b) - Math.min(r, g, b), `${tone} nasycenie akcentu`).toBeLessThan(140);
		}
	});

	it('trzy stany techniczne mają kontur przerywany', () => {
		const css = readFileSync(join(HERE, 'components', 'tag.css'), 'utf8');
		expect(css).toMatch(/\[data-tone='state'\]\s*\{[^}]*border-style: dashed/);
	});
});

function listFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : listFiles(path);
		return /\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
	});
}

describe('kolory werdyktu tylko dla wyniku', () => {
	const palette = Object.entries(light)
		.filter(([name]) => name.startsWith('tag-') && !name.startsWith('tag-state'))
		.map(([, value]) => value);
	const owners = new Set(['styles.css', join('a11y', 'a11y.css'), join('components', 'tag.css')]);

	it('zmienne --tag-* i ich wartości występują tylko w arkuszach metki', () => {
		for (const file of listFiles(HERE)) {
			const relative = file.slice(HERE.length + 1);
			if (owners.has(relative)) continue;
			const text = readFileSync(file, 'utf8').toLowerCase();
			expect(text, relative).not.toMatch(/--tag-/);
			for (const color of palette) expect(text, `${relative} ${color}`).not.toContain(color);
		}
	});

	it('kolor wyniku stosuje wyłącznie komponent metki (ramki pytania, zapisu i listy są neutralne)', () => {
		const tag = readFileSync(join(HERE, 'components', 'tag.css'), 'utf8');
		for (const tone of TONES) expect(tag).toContain(`[data-tone='${tone}']`);
		for (const file of ['components/sheet.css', 'components/home.css', 'components/discord.css', 'components/examples.css']) {
			expect(readFileSync(join(HERE, file), 'utf8'), file).not.toMatch(/--tag-|data-tone/);
		}
	});
});

function recordOf(key: string): VerificationRecord {
	const outcome = FIXTURE_OUTCOMES[key]!;
	if (outcome.kind !== 'record') throw new Error('brak rekordu');
	return structuredClone(outcome.record);
}

describe('arkusz: etykieta wysoko, podsumowanie, fragmenty', () => {
	it('duża metka stoi w bloku zdania, przed odsyłaczem do źródeł, razem ze wskaźnikiem pewności', () => {
		const { container } = render(<RecordView record={recordOf('potwierdzone')} />);
		const lead = container.querySelector('.record-claim__lead')!;
		expect(lead.querySelector('.result-tag[data-size="lg"][data-kind="potwierdzone"]')).not.toBeNull();
		expect(lead.querySelector('.record-claim__certainty .confidence__picture')).not.toBeNull();
		expect(lead.querySelector('.confidence__why')).toBeNull();
		expect(container.querySelector('details .confidence__why')).not.toBeNull();
	});

	it('stany nie pokazują wskaźnika, a wstrzymanie go nie ma', () => {
		const { container } = render(<RecordView record={recordOf('brak_z_silnika')} />);
		expect(container.querySelector('.confidence')).toBeNull();
		expect(container.querySelector('.result-tag[data-kind="brak_wystarczajacych_dowodow"]')).not.toBeNull();
	});

	it('podsumowanie przy kilku twierdzeniach: licznik i metki z liczbami', () => {
		const base = recordOf('potwierdzone');
		const first = base.claims[0]!;
		const verdicts = ['potwierdzone', 'potwierdzone', 'brak_wystarczajacych_dowodow'] as const;
		const claims: ClaimResult[] = verdicts.map((verdict, index) => ({
			...structuredClone(first),
			verdict,
			claim: { ...first.claim, id: `c${index + 1}` },
		}));
		const { container } = render(<RecordView record={{ ...base, claims }} />);
		const summary = container.querySelector('.record__summary')!;
		expect(summary.textContent?.replace(/\u00a0/g, ' ')).toBe('3 twierdzenia:potwierdzone: 2brak wystarczających dowodów: 1');
		expect(container.querySelectorAll('article.record-claim .verdict__label .result-tag')).toHaveLength(3);
	});

	it('fragmenty zgłoszenia: tylko gdy twierdzenia są dosłownymi fragmentami tekstu', () => {
		const base = recordOf('potwierdzone');
		const first = base.claims[0]!;
		const input = 'Wrocław ma nowy most. Szkoły będą zamknięte w piątek. Reszta to komentarz.';
		const claims: ClaimResult[] = ['Wrocław ma nowy most.', 'Szkoły będą zamknięte w piątek.'].map((text, index) => ({
			...structuredClone(first),
			claim: { ...first.claim, id: `c${index + 1}`, text },
		}));
		const pieces = splitInputByClaims(input, claims);
		expect(pieces?.filter((piece) => piece.result).map((piece) => piece.text)).toEqual(['Wrocław ma nowy most', 'Szkoły będą zamknięte w piątek']);
		expect(pieces?.map((piece) => piece.text).join('')).toBe(input);
		const { container } = render(<RecordView record={{ ...base, claims, maskedInput: input }} />);
		expect(container.querySelector('details.record__fragments summary')?.textContent).toBe('Fragmenty zgłoszenia');
		expect(container.querySelectorAll('.record__fragment mark')).toHaveLength(2);
		cleanup();
		const paraphrased = claims.map((result) => ({ ...result, claim: { ...result.claim, text: `Ktoś twierdzi: ${result.claim.text} (parafraza)` } }));
		expect(splitInputByClaims(input, paraphrased)).toBeNull();
		const view = render(<RecordView record={{ ...base, claims: paraphrased, maskedInput: input }} />);
		expect(view.container.querySelector('.record__fragments')).toBeNull();
	});
});

function play(events: WaitingEvent[]): ProgressState {
	return events.reduce(reduceProgress, INITIAL_PROGRESS);
}

describe('ekran czekania: nowe zdarzenia', () => {
	const base: WaitingEvent[] = [
		{ type: 'zgloszenie_przeczytane', claims: 1 },
		{ type: 'przeszukano', claim: 0, documents: 733 },
		{ type: 'indeks_redakcji', claim: 0, queries: 8, candidates: 20 },
		{ type: 'fragmenty_za', claim: 0, count: 2 },
		{ type: 'szukanie_przeciw_koniec', claim: 0, count: 1 },
		{ type: 'twierdzenie_ocenione', claim: 0, candidates: 3, passed: 1, decisive: 1, sources: 1 },
	];

	it('mapa etap -> zdanie z liczbami ze zdarzeń', () => {
		const lines = waitingLines(play(base)).map((line) => line.text);
		expect(lines).toEqual([
			'Przeczytałem zgłoszenie.',
			'Przeszukałem 733 dokumenty.',
			'Zapytałem redakcje: 8 zapytań, 20 podobnych tez.',
			'Znalazłem 3 fragmenty, 1 przeszedł kontrolę cytatu.',
		]);
	});

	it('druga kontrola, błąd indeksu, strona urzędu i najwyżej 5 linii', () => {
		const withSecond = play([...base, { type: 'druga_kontrola', claim: 0, checked: 1, total: 1, agreed: 1, ok: true }]);
		expect(waitingLines(withSecond).at(-1)?.text).toBe('Drugi model sprawdził cytaty: 1 z 1 zgodny.');
		const failed = play([base[0]!, { type: 'indeks_redakcji_blad', claim: 0, reason: 'timeout' }]);
		expect(waitingLines(failed).map((line) => line.text)).toContain('Indeks redakcji nie odpowiada.');
		const official = play([base[0]!, { type: 'strona_urzedu', publisher: 'GIS', quotes: 1, confirmedClaims: 1, claims: 1 }]);
		const officialLine = waitingLines(official).find((line) => line.id === 'official');
		expect(officialLine).toMatchObject({ text: 'Czytam stronę urzędu: GIS.', status: 'current' });
		const everything = play([
			...base,
			{ type: 'strona_urzedu', publisher: 'GIS', quotes: 1, confirmedClaims: 1, claims: 1 },
			{ type: 'druga_kontrola', claim: 0, checked: 1, total: 1, agreed: 1, ok: true },
		]);
		expect(waitingLines(everything).length).toBeLessThanOrEqual(5);
	});

	it('bez nowych zdarzeń nie wymyśla zdań o dokumentach i redakcjach', () => {
		const text = waitingLines(play(base.slice(0, 1))).map((line) => line.text).join(' ');
		expect(text).not.toMatch(/Przeszukałem|redakcje/);
	});

	it('przy wielu twierdzeniach sumuje liczby, a kroki czekają na wszystkie', () => {
		const state = play([
			{ type: 'zgloszenie_przeczytane', claims: 2 },
			{ type: 'twierdzenie_ocenione', claim: 0, candidates: 3, passed: 1, decisive: 1, sources: 1 },
			{ type: 'fragmenty_za', claim: 0, count: 3 },
		]);
		expect(waitingLines(state).at(-1)?.status).toBe('current');
		const both = reduceProgress(state, { type: 'twierdzenie_ocenione', claim: 1, candidates: 2, passed: 2, decisive: 2, sources: 2 });
		expect(waitingLines(both).find((line) => line.id === 'search')?.text).toBe('Znalazłem 5 fragmentów, 3 przeszły kontrolę cytatu.');
	});

	it('czas sprawdzenia z pamięci: godzina tego samego dnia, inaczej data z godziną', () => {
		const now = new Date('2026-11-22T12:00:00+01:00');
		expect(formatCheckedAt('2026-11-22T09:15:00+01:00', now)).toBe('09:15');
		expect(formatCheckedAt('2026-11-20T09:15:00+01:00', now)).toBe('20.11.2026, 09:15');
	});
});

describe('karteczka o Discordzie', () => {
	it('ma polecenie, odnośnik z nowej karty i adres z jednego pliku konfiguracyjnego', () => {
		render(<DiscordNote />);
		const link = screen.getByRole('link', { name: /Dodaj Mylika/ });
		expect(link.getAttribute('href')).toBe(DISCORD_INVITE_URL);
		expect(DISCORD_INVITE_URL).toBe('https://discord.com/oauth2/authorize?client_id=1573837655911694416');
		expect(link.getAttribute('target')).toBe('_blank');
		expect(link.getAttribute('rel')).toBe('noopener noreferrer');
		expect(document.body.textContent?.replace(/\u00a0/g, ' ')).toContain('Możesz też zapytać na Discordzie: /sprawdz');
		expect(document.querySelector('.discord-note svg')?.getAttribute('aria-hidden')).toBe('true');
		for (const file of listFiles(HERE)) {
			if (file.endsWith('siteConfig.ts')) continue;
			expect(readFileSync(file, 'utf8'), file).not.toContain('client_id=1573837655911694416');
		}
	});
});
