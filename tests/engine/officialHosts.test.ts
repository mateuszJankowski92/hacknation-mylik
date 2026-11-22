// Zad. 43: jawna lista hostów urzędowych i ścisłe rozpoznanie adresu (granica bezpieczeństwa), bez sieci.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  defaultOfficialHosts,
  loadOfficialHosts,
  officialHostList,
  OfficialHostsFileSchema,
} from '../../src/engine/officialHosts';

const list = loadOfficialHosts('data/official-hosts.json');
const ok = (url: string) => list.match(url)?.entry.host ?? null;

describe('rozpoznanie hosta urzędowego: przypadki dozwolone', () => {
  it('zus.pl i www.zus.pl: https, port domyślny', () => {
    expect(ok('https://zus.pl/')).toBe('zus.pl');
    expect(ok('https://www.zus.pl/o-zus/aktualnosci/-/artykul')).toBe('zus.pl');
    expect(ok('https://www.zus.pl:443/o-zus')).toBe('zus.pl');
  });
  it('wielkie litery w hoście i końcowa kropka po normalizacji', () => {
    expect(ok('https://WWW.ZUS.PL/x')).toBe('zus.pl');
    expect(ok('https://www.zus.pl./x')).toBe('zus.pl');
  });
  it('strefa gov.pl obejmuje subdomeny, a wpis szczegółowy wygrywa z sufiksem', () => {
    expect(ok('https://www.gov.pl/web/rcb/komunikat')).toBe('gov.pl');
    expect(ok('https://odyseusz.gov.pl/')).toBe('gov.pl');
    expect(ok('https://uokik.gov.pl/aktualnosci')).toBe('uokik.gov.pl');
    expect(list.match('https://mazowiecka.policja.gov.pl/ra/x')?.entry.publisher).toBe('Komenda Stołeczna i Wojewódzka Policja mazowiecka');
    expect(list.match('https://slaska.policja.gov.pl/x')?.entry.publisher).toBe('Policja');
  });
  it('wpis z katalogu źródeł i instytucja centralna', () => {
    expect(ok('https://moje.cert.pl/komunikaty/')).toBe('moje.cert.pl');
    expect(ok('https://meteo.imgw.pl/')).toBe('imgw.pl');
    expect(ok('https://ec.europa.eu/info')).toBe('europa.eu');
  });
  it('nazwa międzynarodowa (punycode) i zapis Unicode prowadzą do tego samego hosta ASCII', () => {
    const l = officialHostList({
      version: 1,
      qualification: 'Organ władzy publicznej lub instytucja publiczna: test.',
      hosts: [{ host: 'xn--zus-jwa.pl', publisher: 'Test IDN', rule: 'instytucja', basis: 'test' }],
    });
    expect(l.match('https://zusł.pl/x')?.entry.publisher).toBe('Test IDN');
    expect(l.match('https://XN--ZUS-JWA.PL/x')?.entry.publisher).toBe('Test IDN');
    expect(l.match('https://www.zusl.pl/x')).toBeNull();
  });
});

describe('rozpoznanie hosta urzędowego: odrzucenia', () => {
  const rejected: [string, string][] = [
    ['http bez TLS', 'http://www.zus.pl/x'],
    ['inny protokół', 'ftp://zus.pl/x'],
    ['login w adresie, host urzędu jako nazwa użytkownika', 'https://zus.pl@inny.host/x'],
    ['login i hasło przy hoście urzędu', 'https://user:haslo@zus.pl/x'],
    ['host zawiera wpis w środku', 'https://zus.pl.inny.host/x'],
    ['host zaczyna się od wpisu bez kropki', 'https://zus.plinny.host/x'],
    ['podróbka z doklejonym przedrostkiem', 'https://evilzus.pl/x'],
    ['podróbka z myślnikiem', 'https://zus-pl.example.com/x'],
    ['port niestandardowy', 'https://www.zus.pl:8443/x'],
    ['port 80 na https', 'https://www.zus.pl:80/x'],
    ['adres IPv4', 'https://93.184.216.34/x'],
    ['adres IPv4 zapisany szesnastkowo', 'https://0x5db8d822/x'],
    ['adres IPv6', 'https://[2606:2800:220:1::1]/x'],
    ['adres lokalny', 'https://localhost/x'],
    ['nie adres', 'zus.pl bez protokołu'],
    ['pusty', ''],
    ['sam sufiks bez wpisu', 'https://pl/x'],
    ['inna domena kończąca się na pl', 'https://example.pl/x'],
    ['ukośnik wsteczny udający koniec hosta', 'https://inny.host\\@zus.pl/x'],
    ['kodowanie kropki w hoście', 'https://zus.pl%2Einny.host/x'],
  ];
  for (const [name, url] of rejected) {
    it(`odrzuca: ${name}`, () => {
      expect(list.match(url)).toBeNull();
    });
  }
  it('redakcje, serwisy prasowe i fact-checking nie są na liście', () => {
    for (const url of [
      'https://konkret24.tvn24.pl/x',
      'https://tvn24.pl/x',
      'https://www.pap.pl/x',
      'https://fakenews.pl/x',
      'https://demagog.org.pl/x',
      'https://www.polskieradio.pl/x',
      'https://portalpasazera.pl/',
    ])
      expect(list.match(url)).toBeNull();
  });
  it('wykluczenie bardziej szczegółowe niż wpis wygrywa (eeas.europa.eu poza strefą europa.eu)', () => {
    expect(list.match('https://eeas.europa.eu/x')).toBeNull();
    expect(list.match('https://www.eeas.europa.eu/x')).toBeNull();
  });
});

describe('plik data/official-hosts.json', () => {
  const file = JSON.parse(readFileSync('data/official-hosts.json', 'utf8')) as { hosts: { host: string; rule: string }[]; excluded: { host: string }[] };
  const sources = (JSON.parse(readFileSync('data/sources.json', 'utf8')) as { sources: { id: string; domain: string; sourceType: string }[] }).sources;

  it('przechodzi schemat, zus.pl jest na liście', () => {
    expect(OfficialHostsFileSchema.safeParse(file).success).toBe(true);
    expect(file.hosts.map((h) => h.host)).toContain('zus.pl');
    expect(file.hosts.length).toBeGreaterThan(15);
  });
  it('każda domena wydawcy typu urzędowego albo prawo z katalogu źródeł jest objęta listą', () => {
    const official = sources.filter((s) => s.sourceType === 'urzedowe' || s.sourceType === 'prawo');
    expect(official.length).toBeGreaterThan(10);
    for (const s of official) expect(list.match(`https://${s.domain}/`), `${s.id} (${s.domain})`).not.toBeNull();
  });
  it('żadna domena redakcji (factcheck) ani organizacji z katalogu nie jest objęta listą', () => {
    for (const s of sources.filter((x) => x.sourceType === 'factcheck' || x.id === 'fakenews-pl' || x.id === 'eeas'))
      expect(list.match(`https://${s.domain}/`), `${s.id} (${s.domain})`).toBeNull();
  });
  it('wpisy typu katalog wskazują istniejące źródła', () => {
    const ids = new Set(sources.map((s) => s.id));
    const parsed = OfficialHostsFileSchema.parse(file);
    for (const h of parsed.hosts.filter((x) => x.rule === 'katalog'))
      for (const id of h.basis.split(',').map((x) => x.trim())) expect(ids.has(id), `${h.host}: ${id}`).toBe(true);
  });
  it('powtórzony host albo host jednocześnie na liście i wykluczony odrzuca schemat', () => {
    const base = { version: 1, qualification: 'Organ władzy publicznej lub instytucja publiczna: test.' };
    const h = { host: 'a.gov.pl', publisher: 'Urząd A', rule: 'katalog', basis: 'x' };
    expect(OfficialHostsFileSchema.safeParse({ ...base, hosts: [h, h] }).success).toBe(false);
    expect(OfficialHostsFileSchema.safeParse({ ...base, hosts: [h], excluded: [{ host: 'a.gov.pl', reason: 'powód wykluczenia testowy' }] }).success).toBe(false);
    expect(OfficialHostsFileSchema.safeParse({ ...base, hosts: [{ ...h, host: 'https://a.gov.pl/' }] }).success).toBe(false);
  });
  it('lista domyślna wczytuje się z repozytorium', () => {
    expect(defaultOfficialHosts()?.match('https://www.zus.pl/')).not.toBeNull();
  });
});
