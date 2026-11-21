// Klasyfikacja adresów IP dla ochrony SSRF. Czyste funkcje, bez I/O.
import { isIP } from 'node:net';

function v4Parts(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? nums : null;
}

/** Adres IPv4 niepubliczny: prywatny, lokalny, link-local, CGNAT, testowy, multicast, zarezerwowany. */
export function isBlockedIpv4(ip: string): boolean {
  const p = v4Parts(ip);
  if (!p) return true;
  const [a, b, c] = p as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local, metadane chmur
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  return a >= 224; // multicast i zarezerwowane, w tym 255.255.255.255
}

/** Rozwija zapis IPv6 do 8 grup 16-bitowych; null, gdy niepoprawny. */
function v6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zone = s.indexOf('%');
  if (zone >= 0) s = s.slice(0, zone);
  // końcówka w zapisie IPv4 (np. ::ffff:1.2.3.4)
  const lastColon = s.lastIndexOf(':');
  const tail = s.slice(lastColon + 1);
  if (tail.includes('.')) {
    const p = v4Parts(tail);
    if (!p) return null;
    s = `${s.slice(0, lastColon + 1)}${((p[0]! << 8) | p[1]!).toString(16)}:${((p[2]! << 8) | p[3]!).toString(16)}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const parse = (part: string) => (part === '' ? [] : part.split(':').map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN)));
  const head = parse(halves[0]!);
  const rest = halves.length === 2 ? parse(halves[1]!) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 && head.length !== 8) return null;
  if (halves.length === 2 && missing < 1) return null;
  const groups = halves.length === 2 ? [...head, ...Array(missing).fill(0), ...rest] : head;
  return groups.length === 8 && groups.every((g) => Number.isInteger(g)) ? groups : null;
}

/** Adres IPv6 niepubliczny (w tym IPv4 osadzone w IPv6 wskazujące na adres niepubliczny). */
export function isBlockedIpv6(ip: string): boolean {
  const g = v6Groups(ip);
  if (!g) return true;
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  const embedded = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  // ::ffff:a.b.c.d (mapped) i ::a.b.c.d (compat)
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return isBlockedIpv4(embedded(g[6]!, g[7]!));
  // 64:ff9b::/96 (NAT64)
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isBlockedIpv4(embedded(g[6]!, g[7]!));
  // 2002::/16 (6to4): osadzony IPv4 w grupach 1-2
  if (g[0] === 0x2002) return isBlockedIpv4(embedded(g[1]!, g[2]!));
  const first = g[0]!;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (przestarzałe)
  if ((first & 0xff00) === 0xff00) return true; // multicast
  if (first === 0x2001 && g[1] === 0x0db8) return true; // dokumentacja
  if (first === 0x0100 && g.slice(1, 4).every((x) => x === 0)) return true; // discard 100::/64
  return false;
}

/** Czy adres IP (v4 lub v6) jest niedozwolony jako cel pobrania. Niepoprawny zapis = niedozwolony. */
export function isBlockedIp(ip: string): boolean {
  const v = isIP(ip.includes('%') ? ip.slice(0, ip.indexOf('%')) : ip);
  if (v === 4) return isBlockedIpv4(ip);
  if (v === 6) return isBlockedIpv6(ip);
  return true;
}

/** Nazwy hostów odrzucane przed rozwiązaniem DNS. */
export function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan') || h.endsWith('.home.arpa')) return true;
  return false;
}
