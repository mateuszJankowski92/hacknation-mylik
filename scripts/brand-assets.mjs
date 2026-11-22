// Generuje ikony strony i obraz podglądu linków z SVG znaku i grafiki postaci.
// Użycie: node scripts/brand-assets.mjs   (wymaga zainstalowanego Google Chrome; bez nowych zależności)
// Wyniki: web/public/favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, og-image.png
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'web', 'public');
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PUBLIC_HOST = (process.env.PUBLIC_BASE_URL || 'https://mylik.acwo.usermd.net').replace(/^https?:\/\//, '').replace(/\/+$/, '');
if (!existsSync(CHROME)) throw new Error('Brak Chrome: ustaw CHROME_BIN');

const mark = readFileSync(join(PUBLIC, 'brand', 'znak-kartka.svg'), 'utf8');
const markUri = `data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}`;
const tmp = mkdtempSync(join(tmpdir(), 'mylik-brand-'));

function shot(html, out, width, height) {
	const page = join(tmp, 'page.html');
	writeFileSync(page, html);
	execFileSync(CHROME, [
		'--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
		'--allow-file-access-from-files', `--window-size=${width},${height}`, `--screenshot=${out}`, `file://${page}`,
	], { stdio: 'ignore' });
}

function iconHtml(size, scale) {
	const inner = Math.round(size * scale);
	return `<!doctype html><body style="margin:0;width:${size}px;height:${size}px;background:#f1e6d3;display:grid;place-items:center"><img src="${markUri}" width="${inner}" height="${inner}"></body>`;
}

function icoFromPng(png) {
	const header = Buffer.alloc(22);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(1, 4);
	header.writeUInt8(32, 6);
	header.writeUInt8(32, 7);
	header.writeUInt16LE(1, 12);
	header.writeUInt16LE(32, 14);
	header.writeUInt32LE(png.length, 16);
	header.writeUInt32LE(22, 18);
	return Buffer.concat([header, png]);
}

shot(iconHtml(180, 0.72), join(PUBLIC, 'apple-touch-icon.png'), 180, 180);
shot(iconHtml(192, 0.72), join(PUBLIC, 'icon-192.png'), 192, 192);
shot(iconHtml(512, 0.72), join(PUBLIC, 'icon-512.png'), 512, 512);
const png32 = join(tmp, 'favicon-32.png');
shot(`<!doctype html><body style="margin:0;width:32px;height:32px;background:transparent"><img src="${markUri}" width="32" height="32"></body>`.replace('<body', '<body'), png32, 32, 32);
writeFileSync(join(PUBLIC, 'favicon.ico'), icoFromPng(readFileSync(png32)));

const character = `file://${join(PUBLIC, 'postacie', 'start', 'praca__spoczynek.webp')}`;
const og = `<!doctype html><meta charset="utf-8"><body style="margin:0;width:1200px;height:630px;background:#fbf6ec;position:relative;overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#26221f">
<div style="position:absolute;right:0;top:0;width:560px;height:630px;background:#fff"></div>
<img src="${character}" style="position:absolute;right:0;top:0;height:630px;width:504px;margin-right:28px;object-fit:cover">
<div style="position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:16px"><img src="${markUri}" width="56" height="56"><span style="font-size:44px;font-weight:700;letter-spacing:-0.5px">Mylik<span style="color:#ee9b4b">.</span></span></div>
<div style="position:absolute;left:72px;top:200px;width:600px">
<div style="font-size:84px;line-height:1.05;font-weight:800;letter-spacing:-2px">Informacja to nie fakt.</div>
<div style="margin-top:28px;font-size:32px;line-height:1.4;color:#5a524c">Mylik sprawdza informację w źródłach, zanim w nią uwierzysz.</div></div>
<div style="position:absolute;left:72px;bottom:56px;font-size:26px;color:#1f5f5a;font-weight:600">${PUBLIC_HOST}</div>
<div style="position:absolute;left:0;bottom:0;width:560px;height:10px;background:#ee9b4b"></div>
</body>`;
shot(og, join(PUBLIC, 'og-image.png'), 1200, 630);

rmSync(tmp, { recursive: true, force: true });
console.log('Gotowe: favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, og-image.png w web/public');
