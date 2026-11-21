import { describe, expect, it } from 'vitest';
import type { NeedsClarification, PreparedInput } from '../contracts';
import { isUnavailableInput, maskPii, OPEN_QUESTION_MESSAGE, prepareInput, questionToStatement, type InputRejection } from './index';

function makePesel(prefix: string): string {
	const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
	const sum = weights.reduce((acc, w, i) => acc + Number(prefix[i]) * w, 0);
	return prefix + String((10 - (sum % 10)) % 10);
}

function makeNip(prefix: string): string {
	const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
	const control = weights.reduce((acc, w, i) => acc + Number(prefix[i]) * w, 0) % 11;
	return control === 10 ? makeNip(String(Number(prefix) + 1).padStart(9, '0')) : prefix + control;
}

function makeLuhn(prefix: string): string {
	for (let check = 0; check < 10; check++) {
		const candidate = prefix + check;
		let sum = 0;
		let double = false;
		for (let i = candidate.length - 1; i >= 0; i--) {
			let d = Number(candidate[i]);
			if (double) {
				d *= 2;
				if (d > 9) d -= 9;
			}
			sum += d;
			double = !double;
		}
		if (sum % 10 === 0) return candidate;
	}
	throw new Error('unreachable');
}

function makeIban(bban: string): string {
	const rearranged = bban + '252100';
	let remainder = 0;
	for (const ch of rearranged) remainder = (remainder * 10 + Number(ch)) % 97;
	return String(98 - remainder).padStart(2, '0') + bban;
}

function makeIdCard(letters: string, middle: string): string {
	const weights = [7, 3, 1, 9, 7, 3, 1, 7, 3];
	for (let check = 0; check < 10; check++) {
		const value = letters + check + middle;
		let sum = 0;
		for (let i = 0; i < 9; i++) {
			const code = value.charCodeAt(i);
			sum += (i < 3 ? code - 55 : code - 48) * weights[i];
		}
		if (sum % 10 === 0) return value;
	}
	throw new Error('unreachable');
}

function corrupt(value: string): string {
	const last = value[value.length - 1];
	return value.slice(0, -1) + String((Number(last) + 1) % 10);
}

describe('maskPii', () => {
	it('maskuje e-mail', () => {
		const result = maskPii('Pisz na jan.kowalski@example.pl po szczegóły');
		expect(result.text).toBe('Pisz na [E-MAIL] po szczegóły');
		expect(result.masks).toEqual([{ type: 'E-MAIL', count: 1 }]);
	});

	it('maskuje polskie i międzynarodowe telefony', () => {
		expect(maskPii('Zadzwoń 600 100 200').text).toBe('Zadzwoń [TELEFON]');
		expect(maskPii('Zadzwoń 600-100-200').text).toBe('Zadzwoń [TELEFON]');
		expect(maskPii('Zadzwoń +48 600 100 200').text).toBe('Zadzwoń [TELEFON]');
		expect(maskPii('Zadzwoń 0048 600100200').text).toBe('Zadzwoń [TELEFON]');
		expect(maskPii('Zadzwoń +44 20 7946 0958').text).toBe('Zadzwoń [TELEFON]');
	});

	it('maskuje PESEL tylko z poprawną sumą kontrolną', () => {
		const valid = makePesel('4405140135');
		expect(maskPii(`PESEL ${valid}`).text).toBe('PESEL [PESEL]');
		const invalid = corrupt(valid);
		expect(maskPii(`PESEL ${invalid}`).text).toBe(`PESEL ${invalid}`);
	});

	it('maskuje NIP tylko z poprawną sumą kontrolną, także z myślnikami', () => {
		const valid = makeNip('123456789');
		const dashed = `${valid.slice(0, 3)}-${valid.slice(3, 6)}-${valid.slice(6, 8)}-${valid.slice(8)}`;
		expect(maskPii(`NIP ${valid}`).text).toBe('NIP [NIP]');
		expect(maskPii(`NIP ${dashed}`).text).toBe('NIP [NIP]');
		const invalid = corrupt(valid);
		expect(maskPii(`NIP ${invalid}`).text).toBe(`NIP ${invalid}`);
	});

	it('maskuje konto/IBAN z poprawną sumą kontrolną', () => {
		const iban = makeIban('10901014000000071218981325'.slice(0, 24));
		const spaced = iban.replace(/(\d{2})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4 $5 $6 $7');
		expect(maskPii(`Konto ${iban}`).text).toBe('Konto [IBAN]');
		expect(maskPii(`Konto PL${iban}`).text).toBe('Konto [IBAN]');
		expect(maskPii(`Konto PL ${spaced}`).text).toBe('Konto [IBAN]');
		const invalid = corrupt(iban);
		expect(maskPii(`Konto ${invalid}`).text).toBe(`Konto ${invalid}`);
	});

	it('maskuje karty zgodne z Luhnem', () => {
		const card = makeLuhn('453201511283036');
		const spaced = card.replace(/(\d{4})(?=\d)/g, '$1 ');
		expect(maskPii(`Karta ${card}`).text).toBe('Karta [KARTA]');
		expect(maskPii(`Karta ${spaced}`).text).toBe('Karta [KARTA]');
		const invalid = corrupt(card);
		expect(maskPii(`Karta ${invalid}`).text).toBe(`Karta ${invalid}`);
	});

	it('maskuje dowód z poprawną cyfrą kontrolną', () => {
		const card = makeIdCard('XYZ', '12345');
		const wrong = card.slice(0, 3) + String((Number(card[3]) + 1) % 10) + card.slice(4);
		expect(maskPii(`Dowód ${card}`).text).toBe('Dowód [DOWOD]');
		expect(maskPii(`Dowód ${wrong}`).text).toBe(`Dowód ${wrong}`);
	});

	it('maskuje adresy IPv4 i ignoruje niepoprawne', () => {
		expect(maskPii('Serwer 203.0.113.42 padł').text).toBe('Serwer [ADRES-IP] padł');
		expect(maskPii('Wersja 999.1.1.1').text).toBe('Wersja 999.1.1.1');
	});

	it('nie maskuje zwykłych liczb, dat, kwot i numerów ustaw', () => {
		const samples = [
			'Ustawa z dnia 12.03.2024 r. poz. 1234 wchodzi w życie',
			'Art. 123 ust. 4 kodeksu karnego',
			'Wydano 1 234 567 zł w 2023 roku',
			'W 2024 roku było 12345678 uczestników',
			'Dz.U. 2022 poz. 2000 oraz 15,5 mld zł',
			'Zebrano 1234567890123 podpisów',
		];
		for (const sample of samples) {
			const result = maskPii(sample);
			expect(result.text).toBe(sample);
			expect(result.masks).toEqual([]);
		}
	});

	it('liczy wielokrotne dane', () => {
		const result = maskPii('a@b.pl, c@d.pl i 600 100 200 oraz 601 200 300');
		expect(result.masks).toEqual([
			{ type: 'E-MAIL', count: 2 },
			{ type: 'TELEFON', count: 2 },
		]);
		expect(result.text).toBe('[E-MAIL], [E-MAIL] i [TELEFON] oraz [TELEFON]');
	});

	it('jest idempotentne', () => {
		const input = `Mail jan@example.pl tel +48 600 100 200 pesel ${makePesel('4405140135')} ip 10.1.2.3`;
		const once = maskPii(input).text;
		expect(maskPii(once).text).toBe(once);
		expect(maskPii(once).masks).toEqual([]);
	});

	it('działa szybko na patologicznych danych', () => {
		const inputs = ['a'.repeat(2000), '1 '.repeat(1000), '1'.repeat(2000), '1-'.repeat(1000), 'a@'.repeat(1000), '+1 '.repeat(700), '1.'.repeat(1000)];
		for (const input of inputs) {
			const start = performance.now();
			maskPii(input);
			expect(performance.now() - start).toBeLessThan(50);
		}
	});
});

function asPrepared(result: PreparedInput | NeedsClarification): PreparedInput {
	if ('needsClarification' in result) throw new Error(`oczekiwano PreparedInput: ${result.message}`);
	return result;
}

function asClarification(result: PreparedInput | NeedsClarification): NeedsClarification {
	if (!('needsClarification' in result)) throw new Error('oczekiwano NeedsClarification');
	return result;
}

describe('prepareInput: tekst', () => {
	it('daje ten sam normalizedInput dla równoważnych zapisów', () => {
		const base = 'Szczepionki powodują autyzm u dzieci.';
		const variants = [
			base,
			'  Szczepionki   powodują\tautyzm u dzieci  ',
			'SZCZEPIONKI POWODUJĄ AUTYZM U DZIECI',
			'Szczepionki powodują autyzm u dzieci',
			'Szczepionki\npowodują autyzm u dzieci!',
			'Szczepionki powodują autyzm u dzieci .',
			'Szczepionki powodują\u200b autyzm u dzieci.',
			base.normalize('NFD'),
		];
		const keys = variants.map((text) => asPrepared(prepareInput({ text, channel: 'sms' })).normalizedInput);
		expect(new Set(keys).size).toBe(1);
		expect(asPrepared(prepareInput({ text: base, channel: 'www' })).normalizedInput).toBe(keys[0]);
	});

	it('rozróżnia zdania o różnej treści; klucz bez polskich znaków (bramki SMS), wyświetlany tekst z nimi', () => {
		const first = asPrepared(prepareInput({ text: 'Żółć jest gorzka w smaku', channel: 'www' }));
		const second = asPrepared(prepareInput({ text: 'Żółć jest słodka w smaku', channel: 'www' }));
		expect(first.normalizedInput).not.toBe(second.normalizedInput);
		expect(first.normalizedInput).toBe('zolc jest gorzka w smaku');
		expect(asPrepared(prepareInput({ text: 'Zolc jest gorzka w smaku', channel: 'sms' })).normalizedInput).toBe(first.normalizedInput);
		expect(first.maskedInput).toBe('Żółć jest gorzka w smaku');
		expect(first.kind).toBe('tekst');
	});

	it('maskuje dane osobowe przed policzeniem klucza', () => {
		const pesel = makePesel('4405140135');
		const result = asPrepared(
			prepareInput({ text: `Mój mail to jan.kowalski@example.pl a PESEL ${pesel}, sprawdź to`, channel: 'www' }),
		);
		for (const field of [result.maskedInput, result.normalizedInput]) {
			expect(field).not.toContain('jan.kowalski');
			expect(field).not.toContain(pesel);
		}
		expect(result.masks).toEqual([
			{ type: 'E-MAIL', count: 1 },
			{ type: 'PESEL', count: 1 },
		]);
	});

	it('prosi o doprecyzowanie przy zbyt krótkim, zbyt długim i bezliterowym tekście', () => {
		expect(asClarification(prepareInput({ text: 'krótko', channel: 'www' })).message).toContain('pełne zdanie');
		expect(asClarification(prepareInput({ text: '', channel: 'www' })).needsClarification).toBe(true);
		expect(asClarification(prepareInput({ text: '12345 67890 !!! 000', channel: 'www' })).needsClarification).toBe(true);
		expect(asClarification(prepareInput({ text: 'a'.repeat(2001), channel: 'www' })).message).toContain('za długi');
		expect(asPrepared(prepareInput({ text: 'a'.repeat(2000), channel: 'www' })).kind).toBe('tekst');
	});

	it('wymaga dokładnie jednego z pól text/url', () => {
		expect(asClarification(prepareInput({ text: 'Jakieś długie zdanie', url: 'https://example.pl', channel: 'www' })).needsClarification).toBe(true);
		expect(asClarification(prepareInput({ channel: 'www' })).needsClarification).toBe(true);
	});

	it('jest czysta: ta sama wartość wejściowa daje ten sam wynik', () => {
		const input = { text: 'Ceny prądu wzrosną o 50 procent', channel: 'www' } as const;
		expect(prepareInput(input)).toEqual(prepareInput(input));
	});
});

describe('prepareInput: URL', () => {
	function url(value: string): PreparedInput | NeedsClarification {
		return prepareInput({ url: value, channel: 'www' });
	}

	it('normalizuje host, fragment, parametry śledzące, kolejność i ukośnik', () => {
		const result = asPrepared(url('HTTPS://Www.Example.PL:443/Wiadomosci/?b=2&utm_source=x&a=1&fbclid=abc&gclid=1&igshid=2&mc_cid=3&mc_eid=4#sekcja'));
		expect(result.kind).toBe('url');
		expect(result.normalizedInput).toBe('https://www.example.pl/Wiadomosci?a=1&b=2');
		expect(result.urlInfo).toEqual({ host: 'www.example.pl', url: 'https://www.example.pl/Wiadomosci?a=1&b=2' });
	});

	it('daje ten sam klucz dla równoważnych adresów', () => {
		const first = asPrepared(url('http://example.pl/a/?x=1&y=2&utm_campaign=z'));
		const second = asPrepared(url('http://EXAMPLE.pl:80/a?y=2&x=1#top'));
		expect(first.normalizedInput).toBe(second.normalizedInput);
	});

	it('zachowuje root i niedomyślny port', () => {
		expect(asPrepared(url('https://example.pl/')).normalizedInput).toBe('https://example.pl/');
		expect(asPrepared(url('https://example.pl:8443/x')).normalizedInput).toBe('https://example.pl:8443/x');
	});

	it('odrzuca niebezpieczne i niepoprawne adresy', () => {
		const bad = [
			'javascript:alert(1)',
			'file:///etc/passwd',
			'ftp://example.pl/x',
			'http://user:pass@example.pl',
			'http://localhost',
			'http://localhost:3000/x',
			'http://192.168.0.1',
			'http://127.0.0.1',
			'http://10.0.0.5/x',
			'http://172.16.4.4',
			'http://169.254.169.254/latest',
			'http://[::1]/',
			'http://drukarka.local/',
			'http://wiki.internal/',
			'https://example.pl/' + 'a'.repeat(2100),
			'',
			'to nie jest adres',
		];
		for (const value of bad) {
			expect(asClarification(url(value)).needsClarification).toBe(true);
		}
	});

	it('adres lokalny lub wewnętrzny jest jasny, ale niedostępny (nie do doprecyzowania)', () => {
		for (const value of ['http://127.0.0.1:9000/panel', 'http://localhost', 'http://[::1]/', 'http://wiki.internal/']) {
			const r = asClarification(url(value)) as InputRejection;
			expect(r.unavailable).toBe(true);
			expect(isUnavailableInput(r)).toBe(true);
		}
		for (const value of ['to nie jest adres', 'http://user:pass@example.pl', 'javascript:alert(1)']) {
			expect(isUnavailableInput(asClarification(url(value)))).toBe(false);
		}
	});

	it('maskuje dane osobowe w zapytaniu URL', () => {
		const result = asPrepared(url('https://example.pl/a?email=jan%40example.pl&tel=600100200&q=sprawa'));
		expect(result.maskedInput).not.toContain('jan');
		expect(result.maskedInput).not.toContain('600100200');
		expect(result.normalizedInput).toBe(result.maskedInput);
		expect(result.masks).toEqual([
			{ type: 'E-MAIL', count: 1 },
			{ type: 'TELEFON', count: 1 },
		]);
	});

	it('akceptuje adres bez schematu jako https', () => {
		expect(asPrepared(url('example.pl/artykul')).normalizedInput).toBe('https://example.pl/artykul');
	});
});

describe('prepareInput: zapis z różnych kanałów', () => {
	const base = 'Od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł.';
	const variants = [
		base,
		'od 1 marca opłata za wywóz śmieci w lipnie wzrośnie do 40 zł',
		'OD 1 MARCA OPŁATA ZA WYWÓZ ŚMIECI W LIPNIE WZROŚNIE DO 40 ZŁ!',
		'Od 1 marca oplata za wywoz smieci w Lipnie wzrosnie do 40 zl.',
		'„Od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł.”',
		'"Od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł."',
		'«Od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł»',
		'Od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł...',
		'Od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł…',
		'Od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł?!',
		'Od\u00a01 marca opłata za wywóz śmieci w Lipnie wzrośnie do\u00a040 zł.',
		'Od 1 marca opłata za wywóz śmieci\r\nw Lipnie wzrośnie do 40 zł.',
		'Od １ marca opłata za wywóz śmieci w Lipnie wzrośnie do ４０ zł.',
		'Czy od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł?',
		'Czy to prawda, że od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł?',
		'Słyszałam, że od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł.',
		'Od 1 marca opłata za wywóz śmieci w Lipnie wzrośnie do 40 zł, prawda?',
	];
	it('kilkanaście zapisów tej samej treści daje jeden klucz, niezależnie od kanału', () => {
		const keys = variants.flatMap((text) =>
			(['www', 'sms'] as const).map((channel) => asPrepared(prepareInput({ text, channel })).normalizedInput),
		);
		expect(new Set(keys).size).toBe(1);
	});
	it('myślniki różnego rodzaju dają ten sam klucz', () => {
		const a = asPrepared(prepareInput({ text: 'Trasa Kraków – Tarnów jest zamknięta w nocy.', channel: 'www' }));
		const b = asPrepared(prepareInput({ text: 'Trasa Kraków-Tarnów jest zamknięta w nocy', channel: 'sms' }));
		expect(a.normalizedInput).toBe(b.normalizedInput);
	});
	it('inna liczba albo zaprzeczenie daje inny klucz', () => {
		const k = (text: string) => asPrepared(prepareInput({ text, channel: 'www' })).normalizedInput;
		expect(k(base)).not.toBe(k(base.replace('40', '50')));
		expect(k(base)).not.toBe(k(base.replace('wzrośnie', 'nie wzrośnie')));
	});
	it('sam adres wklejony jako tekst traktowany jak adres', () => {
		const r = asPrepared(prepareInput({ text: '  https://example.pl/artykul?utm_source=x ', channel: 'sms' }));
		expect(r.kind).toBe('url');
		expect(r.normalizedInput).toBe(asPrepared(prepareInput({ url: 'https://example.pl/artykul', channel: 'www' })).normalizedInput);
	});
});

describe('prepareInput: pytania', () => {
	it('pytanie tak/nie i wstęp relacjonujący przechodzą jako twierdzenie', () => {
		for (const text of [
			'Czy Lipno ma nowy most na rzece od 2020 roku?',
			'Czy naprawdę w Lipnie otwarto nowy most?',
			'Czy prawdą jest, że w Lipnie otwarto nowy most?',
			'Podobno w Lipnie otwarto nowy most.',
			'Ponoć w Lipnie otwarto nowy most',
			'Słyszałem w radiu, że w Lipnie otwarto nowy most.',
			'Sąsiad mi powiedział, że w Lipnie otwarto nowy most.',
			'W Lipnie otwarto nowy most, tak?',
		]) {
			const r = prepareInput({ text, channel: 'www' });
			expect('needsClarification' in r, text).toBe(false);
		}
		expect(questionToStatement('Czy Lipno ma nowy most na rzece od 2020 roku?')).toBe('Lipno ma nowy most na rzece od 2020 roku.');
		expect(questionToStatement('Podobno w Lipnie otwarto nowy most.')).toBe('W Lipnie otwarto nowy most.');
	});
	it('zwykłe zdanie i daty zostają bez zmian', () => {
		for (const t of ['W dniu 21.11.2026 ogłoszono alert.', 'Kolega przysłał mi taki wpis: „Most jest zamknięty”.', 'Cena wynosi 10.5 zł.'])
			expect(questionToStatement(t)).toBe(t);
		expect(questionToStatement('W dniu 21.11.2026 ogłoszono alert. Czy to prawda?')).toBe('W dniu 21.11.2026 ogłoszono alert.');
	});
	it('pytanie otwarte bez tezy: prośba o zdanie do sprawdzenia z przykładem', () => {
		for (const text of ['Kto wygrał wczoraj mecz?', 'Ile kosztuje bilet do Lipna?', 'Gdzie jest najbliższy urząd?', 'Dlaczego podnieśli ceny prądu?', 'Czy to prawda?']) {
			const r = asClarification(prepareInput({ text, channel: 'www' }));
			expect(r.message, text).toBe(OPEN_QUESTION_MESSAGE);
		}
	});
	it('pytanie otwarte obok tezy nie blokuje sprawdzenia', () => {
		const r = prepareInput({ text: 'Ile to kosztuje? Podobno opłata wzrośnie do 40 zł.', channel: 'www' });
		expect('needsClarification' in r).toBe(false);
	});
});

