import { createHash, timingSafeEqual } from 'node:crypto';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { casesToCsv, casesToJson } from '../cases/export';
import type { CaseStore } from '../cases/store';
import { CASE_STATES, CASE_STATE_LABELS_PL, isCaseState, type CaseItem, type CaseState } from '../cases/types';
import { rateLimit } from '../security/rate-limit';

export const CLERK_BASE = '/urzednik';
export const CLERK_TITLE = 'Białe plamy';
export const CLERK_MIN_TOKEN_LENGTH = 16;
export const CLERK_COOKIE = 'urzednik';
const COOKIE_MAX_AGE_S = 8 * 3600;
const MAX_FORM_BYTES = 16 * 1024;
const FAILED_AUTH_PER_MIN = 10;

export interface ClerkDeps {
	store: CaseStore;
	token?: string;
	person?: string;
	notifyAddress?: string;
	secureCookie?: boolean;
	trustedProxyHops?: number;
	now?: () => Date;
	logEvent?: (type: string, detail: Record<string, string | number | boolean | null>) => void;
}

function sha256(text: string): Buffer {
	return createHash('sha256').update(text, 'utf8').digest();
}

function safeEqual(a: string, b: string): boolean {
	return timingSafeEqual(sha256(a), sha256(b));
}

export function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (ch) => {
		switch (ch) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '"':
				return '&quot;';
			default:
				return '&#39;';
		}
	});
}

const DATE_TIME = new Intl.DateTimeFormat('pl-PL', {
	timeZone: 'Europe/Warsaw',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

export function formatWarsaw(iso: string | null): string {
	if (!iso) return '-';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	const p = Object.fromEntries(DATE_TIME.formatToParts(date).map((part) => [part.type, part.value]));
	return `${p.day}.${p.month}.${p.year}, ${p.hour}:${p.minute}`;
}

const CSS = `
body{font:16px/1.5 system-ui,sans-serif;margin:0;color:#1a1a1a;background:#fafafa}
main{max-width:70rem;margin:0 auto;padding:1.5rem 1rem 4rem}
h1{font-size:1.6rem;margin:0 0 .25rem}
h2{font-size:1.2rem;margin:2rem 0 .5rem}
.lead{color:#444;margin:0 0 1rem}
.box{background:#fff;border:1px solid #ccc;border-radius:6px;padding:.75rem 1rem;margin:1rem 0}
.counter{font-size:1.1rem}
table{border-collapse:collapse;width:100%;background:#fff}
th,td{border:1px solid #ccc;padding:.4rem .6rem;text-align:left;vertical-align:top}
th{background:#eee}
td.num{text-align:right;font-variant-numeric:tabular-nums}
nav a,.filters a{margin-right:1rem}
.filters a[aria-current=page]{font-weight:700;text-decoration:none;color:#000}
button{font:inherit;padding:.5rem .9rem;margin:.2rem .4rem .2rem 0;min-height:44px;cursor:pointer}
textarea,input[type=password]{font:inherit;width:100%;box-sizing:border-box;padding:.5rem}
textarea{min-height:8rem}
dl{display:grid;grid-template-columns:max-content 1fr;gap:.25rem 1rem;margin:0}
dt{font-weight:600}
dd{margin:0}
.muted{color:#555}
.claim{font-size:1.2rem;margin:.5rem 0 1rem}
code{word-break:break-all}
`;

const CSS_HASH = `'sha256-${createHash('sha256').update(CSS).digest('base64')}'`;

export const CLERK_CSP = [
	"default-src 'none'",
	`style-src ${CSS_HASH}`,
	"form-action 'self'",
	"base-uri 'none'",
	"frame-ancestors 'none'",
].join('; ');

function layout(title: string, body: string): string {
	return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

function loginPage(message: string): string {
	return layout(
		CLERK_TITLE,
		`<h1>${escapeHtml(CLERK_TITLE)}</h1>
<p class="lead">${escapeHtml(message)}</p>
<form method="post" action="${CLERK_BASE}/logowanie" class="box">
<p><label for="token">Token dostępu</label></p>
<p><input id="token" name="token" type="password" autocomplete="off" required></p>
<p><button type="submit">Wejdź</button></p>
</form>`,
	);
}

function stateFilter(raw: string | undefined): CaseState | undefined {
	return isCaseState(raw) ? raw : undefined;
}

function channelsText(channels: Record<string, number>): string {
	const parts = Object.entries(channels).map(([name, n]) => `${name}: ${n}`);
	return parts.length ? parts.join(', ') : '-';
}

function listBody(deps: ClerkDeps, items: CaseItem[], filter: CaseState | undefined): string {
	const counts = deps.store.counts();
	const pending = counts.nowa;
	const recipient = deps.person ?? deps.notifyAddress;
	const filters = [
		{ key: undefined, label: 'wszystkie', n: counts.nowa + counts.w_toku + counts.zamknieta },
		...CASE_STATES.map((s) => ({ key: s as CaseState | undefined, label: CASE_STATE_LABELS_PL[s], n: counts[s] })),
	]
		.map((f) => {
			const href = f.key ? `${CLERK_BASE}?stan=${f.key}` : CLERK_BASE;
			const current = f.key === filter ? ' aria-current="page"' : '';
			return `<a href="${href}"${current}>${escapeHtml(f.label)} (${f.n})</a>`;
		})
		.join('');
	const rows = items
		.map((c) => {
			const forwarded = c.forwardedAt
				? `${escapeHtml(formatWarsaw(c.forwardedAt))}, ${escapeHtml(c.forwardedTo ?? '')}`
				: '-';
			return `<tr>
<td class="num">${c.reportCount}</td>
<td><a href="${CLERK_BASE}/sprawa/${c.id}">${escapeHtml(c.claimText)}</a></td>
<td>${escapeHtml(CASE_STATE_LABELS_PL[c.state])}</td>
<td>${escapeHtml(formatWarsaw(c.firstSeen))}</td>
<td>${escapeHtml(formatWarsaw(c.lastSeen))}</td>
<td>${escapeHtml(channelsText(c.channels))}</td>
<td>${forwarded}</td>
</tr>`;
		})
		.join('\n');
	const table = items.length
		? `<table>
<caption class="muted">Sprawy od największej liczby zgłoszeń</caption>
<thead><tr><th>Zgłoszenia</th><th>Twierdzenie</th><th>Stan</th><th>Pierwsze</th><th>Ostatnie</th><th>Kanały</th><th>Przekazanie</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`
		: '<p class="box">Brak spraw w tym widoku.</p>';
	const notify = deps.notifyAddress
		? `Adres do powiadomień ustawiony w konfiguracji: ${escapeHtml(deps.notifyAddress)}.`
		: 'Adres do powiadomień nie jest ustawiony w konfiguracji.'
	return `<h1>${escapeHtml(CLERK_TITLE)}</h1>
<p class="lead">Pytania, na które sprawdzone źródła jeszcze nie odpowiadają. Każda biała plama to temat na komunikat. Teksty są po zamaskowaniu danych osobowych.</p>
<div class="box">
<p class="counter"><strong>Czekają na człowieka (stan: nowa): ${pending}</strong></p>
<p class="muted">To jedyne powiadomienie: liczba na tej stronie i pod ${CLERK_BASE}/api/licznik. System nie wysyła e-maili ani wiadomości. ${notify} Odbiorca oznaczeń: ${recipient ? escapeHtml(recipient) : 'nie ustawiono'}.</p>
</div>
<p class="filters">${filters}</p>
${table}
<h2>Eksport</h2>
<p><a href="${CLERK_BASE}/eksport.csv${filter ? `?stan=${filter}` : ''}">CSV</a> <a href="${CLERK_BASE}/eksport.json${filter ? `?stan=${filter}` : ''}">JSON</a></p>
<form method="post" action="${CLERK_BASE}/wyloguj"><button type="submit">Wyloguj</button></form>`;
}

function listItems(label: string, list: readonly string[]): string {
	if (list.length === 0) return `<dt>${escapeHtml(label)}</dt><dd class="muted">brak</dd>`;
	return `<dt>${escapeHtml(label)}</dt><dd>${list.map(escapeHtml).join(', ')}</dd>`;
}

function detailBody(deps: ClerkDeps, c: CaseItem): string {
	const base = `${CLERK_BASE}/sprawa/${c.id}`;
	const info = c.searchInfo;
	const recipient = deps.person ?? deps.notifyAddress;
	const stateButtons = CASE_STATES.map((s) =>
		s === c.state
			? `<button type="submit" name="stan" value="${s}" disabled>${escapeHtml(CASE_STATE_LABELS_PL[s])} (obecny)</button>`
			: `<button type="submit" name="stan" value="${s}">Ustaw: ${escapeHtml(CASE_STATE_LABELS_PL[s])}</button>`,
	).join('');
	const forwarded = c.forwardedAt
		? `<p>Oznaczono jako przekazane do: <strong>${escapeHtml(c.forwardedTo ?? '')}</strong>, ${escapeHtml(formatWarsaw(c.forwardedAt))}.${
				c.forwardedReportCount !== null && c.reportCount > c.forwardedReportCount
					? ` Nowych zgłoszeń od tego czasu: ${c.reportCount - c.forwardedReportCount}.`
					: ''
			}</p>`
		: '<p class="muted">Ta sprawa nie została jeszcze oznaczona jako przekazana.</p>';
	const forwardForm = recipient
		? `<form method="post" action="${base}/przekaz"><button type="submit">Oznacz jako przekazane do: ${escapeHtml(recipient)}</button></form>`
		: '<p class="muted">Ustaw URZEDNIK_OSOBA w konfiguracji, żeby móc oznaczać sprawy jako przekazane.</p>';
	const records = c.records.length
		? `<ul>${c.records
				.map(
					(r) =>
						`<li><a href="/r/${escapeHtml(r.recordId)}"><code>${escapeHtml(r.recordId)}</code></a> <span class="muted">(${escapeHtml(formatWarsaw(r.linkedAt))})</span></li>`,
				)
				.join('')}</ul>`
		: '<p class="muted">Brak odsyłaczy.</p>';
	const refutation = info.refutationPerformed
		? `tak, znaleziono: ${info.refutationFound}${info.refutationQueries.length ? `; zapytania: ${info.refutationQueries.map(escapeHtml).join(', ')}` : ''}`
		: 'nie wykonano';
	return `<p><a href="${CLERK_BASE}">&larr; Wszystkie sprawy</a></p>
<h1>Sprawa ${c.id}</h1>
<p class="claim">${escapeHtml(c.claimText)}</p>
<dl>
<dt>Stan</dt><dd>${escapeHtml(CASE_STATE_LABELS_PL[c.state])}</dd>
<dt>Zgłoszenia</dt><dd>${c.reportCount}</dd>
<dt>Kanały</dt><dd>${escapeHtml(channelsText(c.channels))}</dd>
<dt>Pierwsze zgłoszenie</dt><dd>${escapeHtml(formatWarsaw(c.firstSeen))}</dd>
<dt>Ostatnie zgłoszenie</dt><dd>${escapeHtml(formatWarsaw(c.lastSeen))}</dd>
</dl>
<h2>Zmiana stanu</h2>
<form method="post" action="${base}/stan">${stateButtons}</form>
<h2>Przekazanie</h2>
${forwarded}
${forwardForm}
<h2>Czego szukał system</h2>
<dl>
<dt>Rodzaj twierdzenia</dt><dd>${escapeHtml(info.claimKind || '-')}</dd>
${listItems('Szukane słowa', info.searchTerms)}
${listItems('Słowa przeciwne', info.counterTerms)}
<dt>Próba obalenia</dt><dd>${refutation}</dd>
<dt>Znalezione dowody</dt><dd>${info.evidenceCount}</dd>
<dt>Powód braku</dt><dd>${escapeHtml(info.abstainReason || '-')}</dd>
${listItems('Siła podstawy: powody', info.strengthReasons)}
${listItems('Ograniczenia', info.limitations)}
</dl>
<h2>Odsyłacze do sprawdzeń (rekordy)</h2>
${records}
<h2>Notatka urzędnika</h2>
<form method="post" action="${base}/notatka">
<p><label for="notatka">Notatka (widoczna tylko tutaj)</label></p>
<p><textarea id="notatka" name="notatka" maxlength="2000">${escapeHtml(c.note)}</textarea></p>
<p><button type="submit">Zapisz notatkę</button></p>
</form>`;
}

async function formBody(c: Context): Promise<Record<string, unknown>> {
	try {
		return await c.req.parseBody();
	} catch {
		return {};
	}
}

function parseCaseId(raw: string | undefined): number | null {
	if (!raw || !/^\d{1,9}$/.test(raw)) return null;
	const id = Number.parseInt(raw, 10);
	return id > 0 ? id : null;
}

export function createClerkApp(deps: ClerkDeps): Hono {
	const app = new Hono();
	const now = deps.now ?? (() => new Date());
	const configured = typeof deps.token === 'string' && deps.token.length >= CLERK_MIN_TOKEN_LENGTH;
	const token = configured ? (deps.token as string) : '';
	const sessionValue = configured ? sha256(`urzednik-sesja:${token}`).toString('hex') : '';
	const recipient = deps.person ?? deps.notifyAddress;

	function authKind(c: Context): 'header' | 'cookie' | null {
		if (!configured) return null;
		const bearer = /^Bearer\s+(.+)$/i.exec(c.req.header('authorization') ?? '')?.[1];
		const candidate = bearer ?? c.req.header('x-urzednik-token');
		if (candidate && safeEqual(candidate, token)) return 'header';
		const cookie = getCookie(c, CLERK_COOKIE);
		if (cookie && safeEqual(cookie, sessionValue)) return 'cookie';
		return null;
	}

	function isHttps(c: Context): boolean {
		if (deps.secureCookie !== undefined) return deps.secureCookie;
		if (c.req.url.startsWith('https:')) return true;
		return (deps.trustedProxyHops ?? 0) > 0 && c.req.header('x-forwarded-proto') === 'https';
	}

	function html(c: Context, status: 200 | 400 | 401 | 404, body: string): Response {
		return c.html(body, status);
	}

	function isMachinePath(path: string): boolean {
		return path.startsWith(`${CLERK_BASE}/api/`) || path.startsWith(`${CLERK_BASE}/eksport.`);
	}

	function denied(c: Context): Response {
		if (isMachinePath(c.req.path)) {
			c.header('WWW-Authenticate', 'Bearer realm="urzednik"');
			return c.json({ error: 'brak_dostepu', message: 'Wymagany token dostępu.' }, 401);
		}
		return html(c, 401, loginPage(configured ? 'Wymagany token dostępu.' : 'Widok jest wyłączony: brak tokenu w konfiguracji serwera.'));
	}

	const isLogin = (c: Context) => c.req.method === 'POST' && c.req.path === `${CLERK_BASE}/logowanie`;

	app.use(`${CLERK_BASE}/*`, async (c, next) => {
		await next();
		c.header('Cache-Control', 'no-store');
		c.header('X-Robots-Tag', 'noindex, nofollow');
		c.header('Content-Security-Policy', CLERK_CSP);
	});

	const failedAuthLimiter = rateLimit({
		limit: FAILED_AUTH_PER_MIN,
		trustedProxyHops: deps.trustedProxyHops ?? 0,
		appliesTo: (c) => isLogin(c) || authKind(c) === null,
	});
	app.use(`${CLERK_BASE}/*`, failedAuthLimiter);

	const formLimit = bodyLimit({
		maxSize: MAX_FORM_BYTES,
		onError: (c) => c.json({ error: 'niepoprawne_wejscie', message: 'Zbyt duże dane.' }, 413),
	});

	const guard: MiddlewareHandler = async (c, next) => {
		if (isLogin(c)) return next();
		const kind = authKind(c);
		if (kind === null) return denied(c);
		const method = c.req.method;
		if (kind === 'cookie' && method !== 'GET' && method !== 'HEAD') {
			const origin = c.req.header('origin');
			if (origin) {
				let host = '';
				try {
					host = new URL(origin).host;
				} catch {
					host = '';
				}
				const trusted = (deps.trustedProxyHops ?? 0) > 0 ? c.req.header('x-forwarded-host') : undefined;
				if (host !== c.req.header('host') && host !== trusted) return c.json({ error: 'brak_dostepu', message: 'Niedozwolone źródło żądania.' }, 403);
			}
		}
		return next();
	};
	app.use(`${CLERK_BASE}/*`, guard);
	app.post(`${CLERK_BASE}/*`, formLimit);

	app.post(`${CLERK_BASE}/logowanie`, async (c) => {
		let candidate = '';
		const login = await formBody(c);
		candidate = typeof login.token === 'string' ? login.token : '';
		if (!configured || !safeEqual(candidate, token)) return html(c, 401, loginPage('Niepoprawny token.'));
		setCookie(c, CLERK_COOKIE, sessionValue, {
			httpOnly: true,
			sameSite: 'Strict',
			path: CLERK_BASE,
			maxAge: COOKIE_MAX_AGE_S,
			secure: isHttps(c),
		});
		return c.redirect(CLERK_BASE, 303);
	});

	app.post(`${CLERK_BASE}/wyloguj`, (c) => {
		deleteCookie(c, CLERK_COOKIE, { path: CLERK_BASE });
		return c.redirect(CLERK_BASE, 303);
	});

	app.get(CLERK_BASE, (c) => {
		const filter = stateFilter(c.req.query('stan'));
		return html(c, 200, layout(CLERK_TITLE, listBody(deps, deps.store.list({ state: filter }), filter)));
	});

	app.get(`${CLERK_BASE}/sprawa/:id`, (c) => {
		const id = parseCaseId(c.req.param('id'));
		if (id === null) return html(c, 400, layout(CLERK_TITLE, `<p>Niepoprawny numer sprawy.</p><p><a href="${CLERK_BASE}">Wróć</a></p>`));
		const item = deps.store.get(id);
		if (!item) return html(c, 404, layout(CLERK_TITLE, `<p>Nie ma takiej sprawy.</p><p><a href="${CLERK_BASE}">Wróć</a></p>`));
		return html(c, 200, layout(`Sprawa ${id}: ${CLERK_TITLE}`, detailBody(deps, item)));
	});

	app.post(`${CLERK_BASE}/sprawa/:id/stan`, async (c) => {
		const id = parseCaseId(c.req.param('id'));
		const body = await formBody(c);
		const stan = typeof body.stan === 'string' ? body.stan : '';
		if (id === null || !isCaseState(stan) || !deps.store.setState(id, stan)) return html(c, 400, layout(CLERK_TITLE, `<p>Nie udało się zmienić stanu.</p><p><a href="${CLERK_BASE}">Wróć</a></p>`));
		deps.logEvent?.('case_state', { caseId: id, state: stan });
		return c.redirect(`${CLERK_BASE}/sprawa/${id}`, 303);
	});

	app.post(`${CLERK_BASE}/sprawa/:id/notatka`, async (c) => {
		const id = parseCaseId(c.req.param('id'));
		const body = await formBody(c);
		const note = typeof body.notatka === 'string' ? body.notatka : '';
		if (id === null || !deps.store.setNote(id, note)) return html(c, 400, layout(CLERK_TITLE, `<p>Nie udało się zapisać notatki.</p><p><a href="${CLERK_BASE}">Wróć</a></p>`));
		deps.logEvent?.('case_note', { caseId: id });
		return c.redirect(`${CLERK_BASE}/sprawa/${id}`, 303);
	});

	app.post(`${CLERK_BASE}/sprawa/:id/przekaz`, (c) => {
		const id = parseCaseId(c.req.param('id'));
		if (id === null || !recipient || !deps.store.markForwarded(id, recipient))
			return html(c, 400, layout(CLERK_TITLE, `<p>Nie udało się oznaczyć sprawy (brak osoby w konfiguracji albo brak sprawy).</p><p><a href="${CLERK_BASE}">Wróć</a></p>`));
		deps.logEvent?.('case_forwarded', { caseId: id });
		return c.redirect(`${CLERK_BASE}/sprawa/${id}`, 303);
	});

	app.get(`${CLERK_BASE}/eksport.csv`, (c) => {
		const items = deps.store.list({ state: stateFilter(c.req.query('stan')), limit: 5000 });
		return c.body(casesToCsv(items), 200, {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="biale-plamy.csv"',
		});
	});

	app.get(`${CLERK_BASE}/eksport.json`, (c) => {
		const items = deps.store.list({ state: stateFilter(c.req.query('stan')), limit: 5000 });
		c.header('Content-Disposition', 'attachment; filename="biale-plamy.json"');
		return c.json(casesToJson(items, now()), 200);
	});

	app.get(`${CLERK_BASE}/api/licznik`, (c) =>
		c.json(
			{
				oczekujace: deps.store.pendingCount(),
				powiadomienia: { adresUstawiony: Boolean(deps.notifyAddress), wysylka: false },
			},
			200,
		),
	);

	app.get(`${CLERK_BASE}/api/sprawy`, (c) => {
		const items = deps.store.list({ state: stateFilter(c.req.query('stan')), limit: 5000 });
		return c.json({ count: items.length, cases: items }, 200);
	});

	app.get(`${CLERK_BASE}/api/sprawy/:id`, (c) => {
		const id = parseCaseId(c.req.param('id'));
		const item = id === null ? null : deps.store.get(id);
		if (!item) return c.json({ error: 'nie_znaleziono', message: 'Nie ma takiej sprawy.' }, 404);
		return c.json(item, 200);
	});

	app.post(`${CLERK_BASE}/api/sprawy/:id`, async (c) => {
		const id = parseCaseId(c.req.param('id'));
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: 'niepoprawne_wejscie', message: 'Wyślij JSON.' }, 400);
		}
		const fields = typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
		const stan = fields.stan;
		const notatka = fields.notatka;
		const validState = stan === undefined || isCaseState(stan);
		const validNote = notatka === undefined || typeof notatka === 'string';
		if (id === null || !deps.store.get(id) || !validState || !validNote || (stan === undefined && notatka === undefined))
			return c.json({ error: 'niepoprawne_wejscie', message: 'Podaj istniejącą sprawę oraz stan i/lub notatkę.' }, 400);
		if (isCaseState(stan)) deps.store.setState(id, stan);
		if (typeof notatka === 'string') deps.store.setNote(id, notatka);
		return c.json(deps.store.get(id), 200);
	});

	app.post(`${CLERK_BASE}/api/sprawy/:id/przekaz`, (c) => {
		const id = parseCaseId(c.req.param('id'));
		if (id === null || !deps.store.get(id)) return c.json({ error: 'nie_znaleziono', message: 'Nie ma takiej sprawy.' }, 404);
		if (!recipient) return c.json({ error: 'brak_osoby', message: 'Brak osoby w konfiguracji (URZEDNIK_OSOBA).' }, 409);
		deps.store.markForwarded(id, recipient);
		deps.logEvent?.('case_forwarded', { caseId: id });
		return c.json(deps.store.get(id), 200);
	});

	app.all(`${CLERK_BASE}/*`, (c) => c.json({ error: 'nie_znaleziono', message: 'Nie ma takiego adresu.' }, 404));

	return app;
}
