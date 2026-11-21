import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CASE_SAVED_SENTENCE_PL } from '../../src/cases/texts';
import { VerifyOutcomeSchema } from '../../src/contracts/index';
import { ingestCatalog } from '../../src/corpus/index';
import { engineFingerprint } from '../../src/engine/fingerprint';
import { openDb } from '../../src/db/open';
import { loadConfig } from '../../src/config';
import { bootstrap, type Bootstrapped } from '../../src/server/bootstrap';
import { CLERK_CSP, CLERK_TITLE } from '../../src/server/clerk';

const TOKEN = 'test-token-urzednika-1234567890';
const PERSON = 'Anna Testowa';
const MATCHING = 'Ogród botaniczny w Lipinach jest otwarty codziennie od godziny ósmej.';
const UNCOVERED = 'Kometa Halleya przeleciała nisko nad Zakopanem podczas ostatniej pełni księżyca.';
const UNCOVERED_SIMILAR = 'Kometa Halleya przeleciała nisko nad Zakopanem w czasie ostatniej pełni księżyca!';
const UNCOVERED_OTHER = 'Prezydent miasta Brzeziny ogłosił bezpłatny przejazd tramwajami dla wszystkich mieszkańców.';

function makeCorpus(): { root: string; catalogPath: string } {
	const root = mkdtempSync(join(tmpdir(), 'mylik-clerk-'));
	mkdirSync(join(root, 'data/raw'), { recursive: true });
	writeFileSync(
		join(root, 'data/raw/park-1.txt'),
		'Zarząd zieleni poinformował, że ogród botaniczny w Lipinach jest otwarty codziennie od godziny ósmej.',
	);
	const catalogPath = join(root, 'sources.json');
	writeFileSync(
		catalogPath,
		JSON.stringify({
			version: 1,
			sources: [
				{
					id: 'zielen',
					publisher: 'Zarząd Zieleni (test)',
					domain: 'zielen.example.gov',
					sourceType: 'urzedowe',
					license: 'test',
					documents: [
						{ id: 'park-1', title: 'Godziny otwarcia ogrodu', url: 'https://zielen.example.gov/ogrod', publishedAt: '2026-09-01', file: 'data/raw/park-1.txt' },
					],
				},
			],
		}),
	);
	return { root, catalogPath };
}

function boot(env: Record<string, string | undefined> = { URZEDNIK_TOKEN: TOKEN, URZEDNIK_OSOBA: PERSON, URZEDNIK_ADRES_POWIADOMIEN: 'opiekun@example.org' }): Bootstrapped {
	const db = openDb(':memory:');
	const { root, catalogPath } = makeCorpus();
	ingestCatalog(db, catalogPath, root);
	return bootstrap({
		env,
		db,
		config: { llmProvider: 'mock', anthropicApiKey: undefined, incidentsPath: join(tmpdir(), 'mylik-clerk-brak-incydentow.json') },
		incidents: null,
		distDir: join(tmpdir(), 'mylik-clerk-no-dist'),
		log: null,
		warn: () => {},
		retention: false,
	});
}

async function sms(b: Bootstrapped, text: string): Promise<string> {
	const res = await b.app.request('/sms/webhook', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text }),
	});
	expect(res.status).toBe(200);
	return res.text();
}

async function verify(b: Bootstrapped, text: string) {
	const res = await b.app.request('/api/verify', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text }),
	});
	const out = VerifyOutcomeSchema.parse(await res.json());
	if (out.kind !== 'record') throw new Error('oczekiwano rekordu');
	return out;
}

const bearer = { authorization: `Bearer ${TOKEN}` };

function get(b: Bootstrapped, path: string, headers: Record<string, string> = bearer) {
	return b.app.request(path, { headers });
}

function postForm(b: Bootstrapped, path: string, data: Record<string, string>, headers: Record<string, string> = bearer) {
	return b.app.request(path, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
		body: new URLSearchParams(data).toString(),
	});
}

describe('scenariusz H: brak dowodów i powtórne podobne zgłoszenie', () => {
	it('jedna sprawa z licznikiem 2, obywatel widzi "zapisano", nigdy "przekazano"', async () => {
		const b = boot();
		const first = await verify(b, UNCOVERED);
		expect(first.record.claims[0]!.verdict).toBe('brak_wystarczajacych_dowodow');
		await sms(b, UNCOVERED_SIMILAR);
		const [secondLink] = b.cases.list()[0]!.records.filter((r) => r.recordId !== first.record.id);
		expect(secondLink).toBeDefined();
		const second = { record: { id: secondLink!.recordId } };

		const cases = (await (await get(b, '/urzednik/api/sprawy')).json()) as { count: number; cases: Array<{ reportCount: number; channels: Record<string, number>; state: string; records: unknown[] }> };
		expect(cases.count).toBe(1);
		expect(cases.cases[0]).toMatchObject({ reportCount: 2, state: 'nowa', channels: { www: 1, sms: 1 } });
		expect(cases.cases[0]!.records).toHaveLength(2);

		for (const out of [first, second]) {
			const res = await b.app.request(`/api/records/${out.record.id}/obieg`);
			expect(res.status).toBe(200);
			const body = (await res.json()) as { status: string; forwardedAt?: string };
			expect(body).toEqual({ status: 'zapisano' });
			expect(JSON.stringify(body)).not.toMatch(/przekaz/i);
		}
		expect(CASE_SAVED_SENTENCE_PL).toContain('Jeszcze nikomu go nie przekazałem');
	});

	it('trzecie, inne twierdzenie bez dowodów to osobna sprawa; potwierdzone nie tworzy sprawy', async () => {
		const b = boot();
		await verify(b, UNCOVERED);
		await verify(b, UNCOVERED_OTHER);
		const ok = await verify(b, MATCHING);
		expect(ok.record.claims[0]!.verdict).toBe('potwierdzone');
		expect(b.cases.list()).toHaveLength(2);
		const res = await b.app.request(`/api/records/${ok.record.id}/obieg`);
		expect(await res.json()).toEqual({ status: 'brak' });
	});

	it('identyczne zgłoszenie z pamięci podręcznej też liczy powtórzenie', async () => {
		const b = boot();
		await verify(b, UNCOVERED);
		const again = await verify(b, UNCOVERED);
		expect(again.cached).toBe(true);
		const [only] = b.cases.list();
		expect(only!.reportCount).toBe(2);
		expect(only!.records).toHaveLength(1);
	});

	it('po oznaczeniu przez urzędnika obywatel widzi "przekazano" z datą; wcześniej nie', async () => {
		const b = boot();
		const out = await verify(b, UNCOVERED);
		const caseId = b.cases.list()[0]!.id;
		const before = await (await b.app.request(`/api/records/${out.record.id}/obieg`)).json();
		expect(before).toEqual({ status: 'zapisano' });
		const res = await postForm(b, `/urzednik/sprawa/${caseId}/przekaz`, {});
		expect(res.status).toBe(303);
		const after = (await (await b.app.request(`/api/records/${out.record.id}/obieg`)).json()) as { status: string; forwardedAt?: string };
		expect(after.status).toBe('przekazano');
		expect(after.forwardedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(b.cases.get(caseId)).toMatchObject({ forwardedTo: PERSON, state: 'w_toku' });
	});

	it('niepoprawny identyfikator rekordu w /obieg daje 400', async () => {
		const b = boot();
		expect((await b.app.request('/api/records/abc/obieg')).status).toBe(400);
	});
});

describe('uprawnienia widoku urzędnika', () => {
	const paths = ['/urzednik', '/urzednik/sprawa/1', '/urzednik/eksport.csv', '/urzednik/eksport.json', '/urzednik/api/sprawy', '/urzednik/api/sprawy/1', '/urzednik/api/licznik'];

	it('bez tokenu: 401 na stronie, w API i w eksporcie (nic nie wycieka)', async () => {
		const b = boot();
		await verify(b, UNCOVERED);
		for (const path of paths) {
			const res = await b.app.request(path);
			expect(res.status, path).toBe(401);
			const text = await res.text();
			expect(text, path).not.toContain('Kometa');
		}
	});

	it('zły token: 401; token w query string nie działa', async () => {
		const b = boot();
		expect((await get(b, '/urzednik', { authorization: 'Bearer zly-token-zly-token-zly' })).status).toBe(401);
		expect((await get(b, `/urzednik/api/sprawy?token=${TOKEN}`, {})).status).toBe(401);
		expect((await get(b, '/urzednik/api/sprawy', { 'x-urzednik-token': 'zly' })).status).toBe(401);
	});

	it('poprawny token w nagłówku Bearer albo X-Urzednik-Token: 200', async () => {
		const b = boot();
		expect((await get(b, '/urzednik', bearer)).status).toBe(200);
		expect((await get(b, '/urzednik/api/licznik', { 'x-urzednik-token': TOKEN })).status).toBe(200);
	});

	it('brak tokenu w konfiguracji albo token za krótki: zawsze 401, także przy pustym nagłówku', async () => {
		for (const env of [{}, { URZEDNIK_TOKEN: 'krotki' }]) {
			const b = boot(env);
			expect((await b.app.request('/urzednik')).status).toBe(401);
			expect((await get(b, '/urzednik', { authorization: 'Bearer krotki' })).status).toBe(401);
			expect((await get(b, '/urzednik', { authorization: 'Bearer ' })).status).toBe(401);
			expect((await get(b, '/urzednik/api/sprawy', { 'x-urzednik-token': '' })).status).toBe(401);
		}
	});

	it('logowanie formularzem ustawia ciasteczko HttpOnly SameSite=Strict; złe hasło 401 bez ciasteczka', async () => {
		const b = boot();
		const bad = await postForm(b, '/urzednik/logowanie', { token: 'zly' }, {});
		expect(bad.status).toBe(401);
		expect(bad.headers.get('set-cookie')).toBeNull();
		const ok = await postForm(b, '/urzednik/logowanie', { token: TOKEN }, {});
		expect(ok.status).toBe(303);
		const cookie = ok.headers.get('set-cookie') ?? '';
		expect(cookie).toMatch(/HttpOnly/i);
		expect(cookie).toMatch(/SameSite=Strict/i);
		expect(cookie).toMatch(/Path=\/urzednik/);
		expect(cookie).not.toContain(TOKEN);
		const session = cookie.split(';')[0]!;
		const page = await b.app.request('/urzednik', { headers: { cookie: session } });
		expect(page.status).toBe(200);
	});

	it('sesja z ciasteczka: zmiana z innego originu jest odrzucona (403), z tego samego przechodzi', async () => {
		const b = boot();
		await verify(b, UNCOVERED);
		const id = b.cases.list()[0]!.id;
		const ok = await postForm(b, '/urzednik/logowanie', { token: TOKEN }, {});
		const session = (ok.headers.get('set-cookie') ?? '').split(';')[0]!;
		const foreign = await postForm(b, `/urzednik/sprawa/${id}/stan`, { stan: 'zamknieta' }, { cookie: session, origin: 'https://zly.example', host: 'mylik.example' });
		expect(foreign.status).toBe(403);
		expect(b.cases.get(id)!.state).toBe('nowa');
		const same = await postForm(b, `/urzednik/sprawa/${id}/stan`, { stan: 'zamknieta' }, { cookie: session, origin: 'https://mylik.example', host: 'mylik.example' });
		expect(same.status).toBe(303);
		expect(b.cases.get(id)!.state).toBe('zamknieta');
	});

	it('zmiany stanu bez tokenu: 401 i nic się nie zmienia', async () => {
		const b = boot();
		await verify(b, UNCOVERED);
		const id = b.cases.list()[0]!.id;
		expect((await postForm(b, `/urzednik/sprawa/${id}/stan`, { stan: 'zamknieta' }, {})).status).toBe(401);
		expect((await postForm(b, `/urzednik/sprawa/${id}/przekaz`, {}, {})).status).toBe(401);
		expect((await postForm(b, `/urzednik/sprawa/${id}/notatka`, { notatka: 'x' }, {})).status).toBe(401);
		const apiPost = await b.app.request(`/urzednik/api/sprawy/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stan: 'zamknieta' }) });
		expect(apiPost.status).toBe(401);
		expect(b.cases.get(id)).toMatchObject({ state: 'nowa', note: '', forwardedAt: null });
	});

	it('nieudane próby są limitowane (429), poprawny token nie jest liczony', async () => {
		const b = boot();
		let last = 0;
		for (let i = 0; i < 12; i += 1) last = (await b.app.request('/urzednik/api/sprawy', { headers: { authorization: 'Bearer zly-zly-zly-zly-zly-zly' } })).status;
		expect(last).toBe(429);
		for (let i = 0; i < 15; i += 1) expect((await get(b, '/urzednik/api/licznik')).status).toBe(200);
	});

	it('nagłówki strony: bez indeksowania, bez cache, ścisły CSP bez skryptów', async () => {
		const b = boot();
		const res = await get(b, '/urzednik');
		expect(res.headers.get('x-robots-tag')).toContain('noindex');
		expect(res.headers.get('cache-control')).toBe('no-store');
		const csp = res.headers.get('content-security-policy') ?? '';
		expect(csp).toBe(CLERK_CSP);
		expect(csp).toContain("default-src 'none'");
		expect(csp).not.toMatch(/script-src/);
		expect(await res.text()).not.toMatch(/<script/i);
	});

	it('strona obywatela nie linkuje do widoku urzędnika (web/index.html i kod interfejsu)', () => {
		const root = fileURLToPath(new URL('../../web/', import.meta.url));
		const files: string[] = [join(root, 'index.html')];
		const walk = (dir: string): void => {
			for (const name of readdirSync(dir)) {
				const full = join(dir, name);
				if (statSync(full).isDirectory()) walk(full);
				else if (/\.(tsx?|css|html)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(full);
			}
		};
		walk(join(root, 'src'));
		for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/urzednik/i);
	});
});

describe('widok urzędnika: lista, podgląd, zmiany, eksport', () => {
	async function withCases() {
		const b = boot();
		await verify(b, UNCOVERED);
		await sms(b, UNCOVERED_SIMILAR);
		await verify(b, UNCOVERED_OTHER);
		return b;
	}

	it('lista: nazwa widoku, sprawy wg liczby powtórzeń, licznik oczekujących, filtr stanu', async () => {
		const b = await withCases();
		const html = await (await get(b, '/urzednik')).text();
		expect(html).toContain(CLERK_TITLE);
		expect(html).toContain('Czekają na człowieka (stan: nowa): 2');
		expect(html).toContain('System nie wysyła e-maili');
		expect(html.indexOf('Kometa')).toBeLessThan(html.indexOf('Prezydent'));
		const id = b.cases.list()[0]!.id;
		b.cases.setState(id, 'zamknieta');
		const closed = await (await get(b, '/urzednik?stan=zamknieta')).text();
		expect(closed).toContain('Kometa');
		expect(closed).not.toContain('Prezydent');
		const fresh = await (await get(b, '/urzednik?stan=nowa')).text();
		expect(fresh).toContain('Prezydent');
		expect(fresh).not.toContain('Kometa');
		const licznik = (await (await get(b, '/urzednik/api/licznik')).json()) as { oczekujace: number; powiadomienia: { wysylka: boolean } };
		expect(licznik).toMatchObject({ oczekujace: 1, powiadomienia: { adresUstawiony: true, wysylka: false } });
	});

	it('podgląd sprawy: odsyłacze do rekordów, czego szukał system, przycisk przekazania z osobą z konfiguracji', async () => {
		const b = await withCases();
		const item = b.cases.list()[0]!;
		const html = await (await get(b, `/urzednik/sprawa/${item.id}`)).text();
		expect(html).toContain('Czego szukał system');
		expect(html).toContain('Szukane słowa');
		for (const r of item.records) expect(html).toContain(`href="/r/${r.recordId}"`);
		expect(html).toContain(`Oznacz jako przekazane do: ${PERSON}`);
		expect(html).toContain('Zgłoszenia</dt><dd>2</dd>');
	});

	it('słowo "przekazane" występuje tylko w widoku urzędnika, nie w wersji dla obywatela (API rekordu)', async () => {
		const b = await withCases();
		const out = await verify(b, UNCOVERED);
		expect(JSON.stringify(out)).not.toMatch(/przekaz/i);
	});

	it('zmiana stanu, notatka i przekazanie z formularzy; po przekazaniu widać datę i osobę', async () => {
		const b = await withCases();
		const id = b.cases.list()[0]!.id;
		expect((await postForm(b, `/urzednik/sprawa/${id}/stan`, { stan: 'w_toku' })).status).toBe(303);
		expect(b.cases.get(id)!.state).toBe('w_toku');
		expect((await postForm(b, `/urzednik/sprawa/${id}/stan`, { stan: 'cokolwiek' })).status).toBe(400);
		expect((await postForm(b, `/urzednik/sprawa/${id}/notatka`, { notatka: '<b>ważne</b> & "cytat"' })).status).toBe(303);
		const html = await (await get(b, `/urzednik/sprawa/${id}`)).text();
		expect(html).toContain('&lt;b&gt;ważne&lt;/b&gt; &amp; &quot;cytat&quot;');
		expect(html).not.toContain('<b>ważne</b>');
		await postForm(b, `/urzednik/sprawa/${id}/przekaz`, {});
		const after = await (await get(b, `/urzednik/sprawa/${id}`)).text();
		expect(after).toContain(`Oznaczono jako przekazane do: <strong>${PERSON}</strong>`);
	});

	it('bez osoby w konfiguracji przekazanie jest niemożliwe (409 w API, 400 w formularzu)', async () => {
		const b = boot({ URZEDNIK_TOKEN: TOKEN });
		await verify(b, UNCOVERED);
		const id = b.cases.list()[0]!.id;
		const api = await b.app.request(`/urzednik/api/sprawy/${id}/przekaz`, { method: 'POST', headers: bearer });
		expect(api.status).toBe(409);
		expect((await postForm(b, `/urzednik/sprawa/${id}/przekaz`, {})).status).toBe(400);
		expect(b.cases.get(id)!.forwardedAt).toBeNull();
	});

	it('API JSON: lista, pojedyncza sprawa, zmiana stanu i notatki, błędne dane', async () => {
		const b = await withCases();
		const id = b.cases.list()[0]!.id;
		const one = (await (await get(b, `/urzednik/api/sprawy/${id}`)).json()) as { id: number; reportCount: number };
		expect(one).toMatchObject({ id, reportCount: 2 });
		expect((await get(b, '/urzednik/api/sprawy/99999')).status).toBe(404);
		const patch = await b.app.request(`/urzednik/api/sprawy/${id}`, { method: 'POST', headers: { ...bearer, 'content-type': 'application/json' }, body: JSON.stringify({ stan: 'zamknieta', notatka: 'sprawdzone' }) });
		expect(patch.status).toBe(200);
		expect(b.cases.get(id)).toMatchObject({ state: 'zamknieta', note: 'sprawdzone' });
		const bad = await b.app.request(`/urzednik/api/sprawy/${id}`, { method: 'POST', headers: { ...bearer, 'content-type': 'application/json' }, body: JSON.stringify({ stan: 'x' }) });
		expect(bad.status).toBe(400);
		const filtered = (await (await get(b, '/urzednik/api/sprawy?stan=zamknieta')).json()) as { count: number };
		expect(filtered.count).toBe(1);
	});

	it('eksport CSV i JSON zawiera te same sprawy', async () => {
		const b = await withCases();
		const csvRes = await get(b, '/urzednik/eksport.csv');
		expect(csvRes.status).toBe(200);
		expect(csvRes.headers.get('content-type')).toContain('text/csv');
		expect(csvRes.headers.get('content-disposition')).toContain('biale-plamy.csv');
		const csv = await csvRes.text();
		expect(csv.split('\r\n').filter((l) => l.length > 0)).toHaveLength(3);
		const jsonRes = await get(b, '/urzednik/eksport.json');
		expect(jsonRes.headers.get('content-type')).toContain('application/json');
		const json = (await jsonRes.json()) as { count: number; cases: Array<{ claimText: string }> };
		expect(json.count).toBe(2);
		expect(json.cases.map((c) => c.claimText).join(' ')).toContain('Kometa');
	});

	it('nieznany adres pod /urzednik i niepoprawny numer sprawy', async () => {
		const b = boot();
		expect((await get(b, '/urzednik/nic')).status).toBe(404);
		expect((await get(b, '/urzednik/sprawa/abc')).status).toBe(400);
		expect((await get(b, '/urzednik/sprawa/12345')).status).toBe(404);
	});
});

describe('konfiguracja widoku urzędnika', () => {
	it('token nie trafia do zredagowanej konfiguracji ani do logu zdarzeń', async () => {
		const cfg = loadConfig({ URZEDNIK_TOKEN: TOKEN, URZEDNIK_OSOBA: PERSON });
		expect(cfg.clerkToken).toBe(TOKEN);
		const { redactedConfig } = await import('../../src/config');
		expect(JSON.stringify(redactedConfig(cfg))).not.toContain(TOKEN);
	});
});

describe('silnik zamrożony', () => {
	it('skrót silnika (src/engine, src/llm, src/contracts) się nie zmienił', () => {
		expect(engineFingerprint()).toBe('108928016877');
	});
});
