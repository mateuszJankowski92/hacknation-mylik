// Serwowanie zbudowanego interfejsu (dist/web) z fallbackiem SPA na index.html.
// Tylko odczyt plików; brak zapisu poza bazą.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { Context } from 'hono';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

export const BUILD_HINT = 'Zbuduj interfejs: npm run build';

/** Zwraca handler GET dla ścieżek spoza /api. */
export interface StaticOptions {
  /** Podmiana metadanych w index.html dla ścieżki SPA (title, Open Graph, JSON-LD). */
  transformIndex?: (html: string, path: string, requestUrl: string) => string;
  /** Dodatkowe nagłówki odpowiedzi HTML dla ścieżki SPA. */
  indexHeaders?: (path: string) => Record<string, string>;
}

export function createStaticHandler(distDir: string, options: StaticOptions = {}) {
  const root = resolve(distDir);

  function fileIn(urlPath: string): string | null {
    let decoded: string;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      return null;
    }
    if (decoded.includes('\0')) return null;
    const full = normalize(join(root, decoded));
    if (full !== root && !full.startsWith(root + sep)) return null; // ochrona przed ../
    try {
      return existsSync(full) && statSync(full).isFile() ? full : null;
    } catch {
      return null;
    }
  }

  return (c: Context): Response => {
    const indexPath = join(root, 'index.html');
    if (!existsSync(indexPath)) {
      return c.text(BUILD_HINT, 503, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    const path = c.req.path;
    const file = path === '/' ? null : fileIn(path);
    if (file) {
      const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
      const immutable = file.startsWith(join(root, 'assets') + sep);
      return c.body(readFileSync(file), 200, {
        'Content-Type': type,
        'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
    }
    // Brakujący plik zasobu (z rozszerzeniem) -> 404; ścieżka SPA -> index.html.
    if (path !== '/' && extname(path) !== '') return c.text('Nie znaleziono', 404);
    const raw = readFileSync(indexPath, 'utf8');
    const html = options.transformIndex ? options.transformIndex(raw, path, c.req.url) : raw;
    return c.body(html, 200, {
      'Content-Type': MIME['.html']!,
      'Cache-Control': 'no-cache',
      ...(options.indexHeaders?.(path) ?? {}),
    });
  };
}
