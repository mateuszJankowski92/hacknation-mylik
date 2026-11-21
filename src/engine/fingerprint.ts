// Skrót wersji silnika: SHA-256 z treści plików, od których zależą werdykty (silnik, prompty i dostawcy
// modelu, kontrakty). Ten sam skrót zapisuje ewaluacja w pliku wyników; silnik pokazuje profil omylności
// tylko wtedy, gdy plik powstał dla dokładnie tej wersji (każda zmiana tych plików go unieważnia).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FINGERPRINT_DIRS = ['engine', 'llm', 'contracts'] as const;

function listTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listTs(p));
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

/** Skrót z plików w `srcDir` (domyślnie katalog src obok tego modułu); 12 znaków szesnastkowych. */
export function computeEngineFingerprint(srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')): string {
  const h = createHash('sha256');
  for (const d of FINGERPRINT_DIRS) {
    for (const file of listTs(join(srcDir, d))) {
      h.update(relative(srcDir, file).split('\\').join('/'));
      h.update('\0');
      h.update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
      h.update('\0');
    }
  }
  return h.digest('hex').slice(0, 12);
}

let cached: string | null = null;
/** Skrót bieżącej wersji silnika (liczony raz na proces). Błąd odczytu = `nieznana` (profil się nie pokaże). */
export function engineFingerprint(): string {
  if (cached === null) {
    try {
      cached = computeEngineFingerprint();
    } catch {
      cached = 'nieznana';
    }
  }
  return cached;
}
