import type { Hono } from 'hono';
import type { CaseStore } from '../cases/store';
import { MESSAGES_PL, apiError } from './errors';

export const CASE_STATUS_PATH = '/api/records/:id/obieg';
const RECORD_ID_RE = /^[0-9a-f]{64}$/;

export function registerCaseStatusRoute(app: Hono, store: CaseStore): void {
	app.get(CASE_STATUS_PATH, (c) => {
		const id = c.req.param('id') ?? '';
		if (!RECORD_ID_RE.test(id)) return apiError(c, 400, 'niepoprawne_wejscie', MESSAGES_PL.invalidId);
		c.header('Cache-Control', 'no-store');
		return c.json(store.publicStatusForRecord(id), 200);
	});
}
