import { Hono } from 'hono';
import type { Engine } from '../contracts/index';
import { renderCardSvg } from './svg';

export { escapeXml, renderCardSvg, wrapText } from './svg';

export interface CardDeps {
	engine: Pick<Engine, 'getRecord'>;
	baseUrl?: string;
}

const RECORD_ID_RE = /^[0-9a-f]{64}$/;
const CARD_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

export function cardUrlFor(baseUrl: string | undefined, id: string): string {
	const base = (baseUrl ?? '').replace(/\/+$/, '');
	return `${base}/r/${id}`;
}

export function createCardApp(deps: CardDeps): Hono {
	const app = new Hono();

	app.get('/api/records/:id/card.svg', (c) => {
		const id = c.req.param('id');
		const notFound = () => c.json({ error: 'nie_znaleziono', message: 'Nie znalazłem takiego sprawdzenia.' }, 404);
		if (!RECORD_ID_RE.test(id)) return notFound();
		const record = deps.engine.getRecord(id);
		if (!record) return notFound();

		const claimParam = Number.parseInt(c.req.query('claim') ?? '', 10);
		const claimIndex = Number.isInteger(claimParam) && claimParam >= 1 ? claimParam - 1 : 0;
		const svg = renderCardSvg(record, { cardUrl: cardUrlFor(deps.baseUrl, record.id), claimIndex });

		const disposition = c.req.query('download') === '1' ? 'attachment' : 'inline';
		c.header('Content-Type', 'image/svg+xml; charset=utf-8');
		c.header('Content-Disposition', `${disposition}; filename="mylik-${record.id.slice(0, 8)}.svg"`);
		c.header('Cache-Control', 'public, max-age=300');
		c.header('Content-Security-Policy', CARD_CSP);
		c.header('X-Content-Type-Options', 'nosniff');
		return c.body(svg);
	});

	return app;
}
