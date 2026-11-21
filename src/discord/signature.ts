import { createPublicKey, verify, type KeyObject } from 'node:crypto';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const PUBLIC_KEY_HEX = /^[0-9a-f]{64}$/i;
const SIGNATURE_HEX = /^[0-9a-f]{128}$/i;
const MAX_TIMESTAMP_CHARS = 64;

const keyCache = new Map<string, KeyObject>();

function loadPublicKey(publicKeyHex: string): KeyObject | null {
	if (!PUBLIC_KEY_HEX.test(publicKeyHex)) return null;
	const cached = keyCache.get(publicKeyHex);
	if (cached) return cached;
	try {
		const key = createPublicKey({
			key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
			format: 'der',
			type: 'spki',
		});
		keyCache.set(publicKeyHex, key);
		return key;
	} catch {
		return null;
	}
}

export interface DiscordSignatureInput {
	publicKey: string | undefined;
	signature: string | undefined | null;
	timestamp: string | undefined | null;
	rawBody: Uint8Array;
}

export function verifyDiscordSignature(input: DiscordSignatureInput): boolean {
	const { publicKey, signature, timestamp, rawBody } = input;
	if (!publicKey || !signature || !timestamp) return false;
	if (timestamp.length > MAX_TIMESTAMP_CHARS || !SIGNATURE_HEX.test(signature)) return false;
	const key = loadPublicKey(publicKey.trim());
	if (!key) return false;
	try {
		const message = Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody]);
		return verify(null, message, key, Buffer.from(signature, 'hex'));
	} catch {
		return false;
	}
}
