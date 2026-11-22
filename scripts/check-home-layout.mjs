import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VITE_PORT = Number(process.env.LAYOUT_VITE_PORT ?? 5183);
const CHROME_PORT = Number(process.env.LAYOUT_CHROME_PORT ?? 9383);
const SHOTS_DIR = process.env.LAYOUT_SHOTS_DIR;
const DESKTOP_WIDTHS = [1280, 1440, 1920, 2200];
const MIN_STAGE_SHARE = 0.38;
const MIN_EXAMPLES_SHARE = 0.9;
// Właściciel wybrał dwa razy większą postać na telefonie: przycisk ma zostać na pierwszym ekranie, nie wyżej niż 700 px.
const PHONE = { width: 393, height: 852, maxButtonTop: 700 };
const TOLERANCE = 1;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MEASURE = `(() => {
	const box = (selector) => {
		const element = document.querySelector(selector);
		if (!element) return null;
		const rect = element.getBoundingClientRect();
		return { left: rect.left, right: rect.right, top: rect.top, width: rect.width, height: rect.height };
	};
	const app = document.querySelector('.app');
	const style = getComputedStyle(app);
	const container = {
		left: app.getBoundingClientRect().left + parseFloat(style.paddingLeft),
		right: app.getBoundingClientRect().right - parseFloat(style.paddingRight),
	};
	container.width = container.right - container.left;
	return {
		container,
		stage: box('.hero__stage'),
		examples: box('.examples'),
		button: box('.hero .button'),
		scrollWidth: document.documentElement.scrollWidth,
		innerWidth: window.innerWidth,
	};
})()`;

async function main() {
	const vite = spawn('npx', ['vite', '--port', String(VITE_PORT), '--strictPort'], { stdio: 'ignore' });
	const profile = mkdtempSync(join(tmpdir(), 'mylik-layout-'));
	const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CHROME_PORT}`, '--no-first-run', '--disable-gpu', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
	const stop = () => {
		vite.kill();
		chrome.kill();
	};
	try {
		let target;
		for (let attempt = 0; attempt < 60 && !target; attempt++) {
			try {
				const list = await (await fetch(`http://127.0.0.1:${CHROME_PORT}/json`)).json();
				target = list.find((entry) => entry.type === 'page');
			} catch {
				await sleep(250);
			}
		}
		if (!target) throw new Error('Chrome nie wystartował');
		for (let attempt = 0; attempt < 60; attempt++) {
			try {
				if ((await fetch(`http://localhost:${VITE_PORT}/`)).ok) break;
			} catch {
				await sleep(250);
			}
		}
		const socket = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise((resolve) => (socket.onopen = resolve));
		let counter = 0;
		const pending = new Map();
		socket.onmessage = (message) => {
			const data = JSON.parse(message.data);
			if (data.id && pending.has(data.id)) {
				pending.get(data.id)(data);
				pending.delete(data.id);
			}
		};
		const send = (method, params = {}) =>
			new Promise((resolve) => {
				const id = ++counter;
				pending.set(id, resolve);
				socket.send(JSON.stringify({ id, method, params }));
			});
		await send('Page.enable');

		async function measureAt(width, height, mobile, shotName) {
			await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
			await send('Page.navigate', { url: `http://localhost:${VITE_PORT}/` });
			await sleep(3500);
			const reply = await send('Runtime.evaluate', { expression: MEASURE, returnByValue: true });
			if (SHOTS_DIR && shotName) {
				mkdirSync(SHOTS_DIR, { recursive: true });
				const shot = await send('Page.captureScreenshot', { format: 'png' });
				writeFileSync(join(SHOTS_DIR, `${shotName}.png`), Buffer.from(shot.result.data, 'base64'));
			}
			return reply.result.result.value;
		}

		const failures = [];
		const check = (label, ok, detail) => {
			console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}: ${detail}`);
			if (!ok) failures.push(label);
		};

		for (const width of DESKTOP_WIDTHS) {
			const height = width >= 1920 ? 1080 : 800;
			const m = await measureAt(width, height, false, `home_${width}`);
			const stageShare = m.stage.width / m.container.width;
			const examplesShare = m.examples.width / m.container.width;
			check(`${width} scena >= 38% kontenera`, stageShare >= MIN_STAGE_SHARE, `${(stageShare * 100).toFixed(1)}%`);
			check(
				`${width} scena w obrębie kontenera`,
				m.stage.right <= m.container.right + TOLERANCE && m.stage.left >= m.container.left - TOLERANCE,
				`${Math.round(m.stage.left)}-${Math.round(m.stage.right)} w ${Math.round(m.container.left)}-${Math.round(m.container.right)}`,
			);
			check(`${width} rząd podpowiedzi >= 90% kontenera`, examplesShare >= MIN_EXAMPLES_SHARE, `${(examplesShare * 100).toFixed(1)}%`);
		}

		const phone = await measureAt(PHONE.width, PHONE.height, true, 'home_phone');
		check('telefon bez przewijania w poziomie', phone.scrollWidth <= phone.innerWidth, `${phone.scrollWidth} <= ${phone.innerWidth}`);
		check(`telefon przycisk Sprawdź <= ${PHONE.maxButtonTop}px`, phone.button.top + phone.button.height <= PHONE.maxButtonTop, `dół ${Math.round(phone.button.top + phone.button.height)}px`);
		check('telefon podpowiedzi pod przyciskiem', phone.examples.top >= phone.button.top, `góra ${Math.round(phone.examples.top)}px`);

		socket.close();
		stop();
		if (failures.length > 0) {
			console.error(`\nUsterki układu: ${failures.length}`);
			process.exit(1);
		}
		console.log('\nUkład strony głównej w porządku');
		process.exit(0);
	} catch (error) {
		stop();
		console.error(error);
		process.exit(1);
	}
}

main();
