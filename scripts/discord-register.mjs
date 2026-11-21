import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DISCORD_API_BASE = 'https://discord.com/api/v10';

const GUILD_INSTALL = 0;
const USER_INSTALL = 1;
const CONTEXT_GUILD = 0;
const CONTEXT_BOT_DM = 1;
const CONTEXT_PRIVATE_CHANNEL = 2;
const OPTION_STRING = 3;
const OPTION_BOOLEAN = 5;
const COMMAND_SLASH = 1;
const COMMAND_MESSAGE = 3;

export const COMMANDS = [
	{
		name: 'sprawdz',
		type: COMMAND_SLASH,
		description: 'Sprawdź wiadomość lub adres strony w źródłach i zobacz wynik ze źródłem i datą',
		integration_types: [GUILD_INSTALL, USER_INSTALL],
		contexts: [CONTEXT_GUILD, CONTEXT_BOT_DM, CONTEXT_PRIVATE_CHANNEL],
		options: [
			{
				name: 'tekst',
				type: OPTION_STRING,
				description: 'Wiadomość albo adres strony do sprawdzenia (do 2000 znaków)',
				required: true,
				min_length: 1,
				max_length: 2000,
			},
			{
				name: 'publicznie',
				type: OPTION_BOOLEAN,
				description: 'Pokaż wynik wszystkim w tym miejscu (domyślnie widzisz go tylko Ty)',
				required: false,
			},
		],
	},
	{
		name: 'Sprawdź z Mylikiem',
		type: COMMAND_MESSAGE,
		integration_types: [GUILD_INSTALL, USER_INSTALL],
		contexts: [CONTEXT_GUILD, CONTEXT_BOT_DM, CONTEXT_PRIVATE_CHANNEL],
	},
];

function isFilled(value) {
	return typeof value === 'string' && value.trim() !== '';
}

export function missingVariables(env) {
	return ['DISCORD_APPLICATION_ID', 'DISCORD_BOT_TOKEN'].filter((name) => !isFilled(env[name]));
}

export async function registerCommands({ env, fetchImpl = fetch }) {
	const missing = missingVariables(env);
	if (missing.length > 0) return { ok: false, reason: 'missing_env', missing };
	const applicationId = env.DISCORD_APPLICATION_ID.trim();
	if (!/^\d{1,25}$/.test(applicationId)) return { ok: false, reason: 'bad_application_id' };
	const response = await fetchImpl(`${DISCORD_API_BASE}/applications/${applicationId}/commands`, {
		method: 'PUT',
		headers: {
			'content-type': 'application/json',
			authorization: `Bot ${env.DISCORD_BOT_TOKEN.trim()}`,
			'user-agent': 'DiscordBot (https://mylik.invalid, 0.1.0)',
		},
		body: JSON.stringify(COMMANDS),
	});
	if (!response.ok) {
		let code = null;
		try {
			const body = await response.json();
			if (typeof body?.code === 'number') code = body.code;
		} catch {
			code = null;
		}
		return { ok: false, reason: 'http_error', status: response.status, code };
	}
	const registered = await response.json();
	const names = Array.isArray(registered) ? registered.map((command) => String(command?.name ?? '')) : [];
	return { ok: true, names };
}

function loadEnvFiles() {
	const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	for (const path of [join(root, '.env'), '.env']) {
		try {
			process.loadEnvFile(path);
			break;
		} catch {
			continue;
		}
	}
}

async function main() {
	if (process.argv.includes('--dry-run')) {
		console.log(JSON.stringify(COMMANDS, null, 2));
		return 0;
	}
	loadEnvFiles();
	const result = await registerCommands({ env: process.env });
	if (result.ok) {
		console.log(`Zarejestrowano globalnie komendy: ${result.names.join(', ')}`);
		return 0;
	}
	if (result.reason === 'missing_env') {
		console.error(`Brak wartości zmiennych: ${result.missing.join(', ')}. Uzupełnij je w środowisku lub w .env.`);
	} else if (result.reason === 'bad_application_id') {
		console.error('DISCORD_APPLICATION_ID powinien być liczbą (identyfikator aplikacji z portalu Discorda).');
	} else {
		console.error(`Discord odrzucił rejestrację (HTTP ${result.status}${result.code === null ? '' : `, kod ${result.code}`}).`);
	}
	return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().then(
		(code) => {
			process.exitCode = code;
		},
		() => {
			console.error('Rejestracja komend nie powiodła się (błąd sieci).');
			process.exitCode = 1;
		},
	);
}
