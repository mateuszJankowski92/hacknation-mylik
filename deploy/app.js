// Wejście Passengera na hostingu (MyDevil, strona typu nodejs). Kopiowane przez scripts/deploy.sh
// do ~/domains/<domena>/public_nodejs/app.js. Bez sekretów: klucze są w .env obok (uprawnienia 600).
//
// Ustawienia wdrożeniowe (nie sekrety) jako wartości domyślne: zmienna już ustawiona w środowisku
// wygrywa; .env wczytywany w src/main.ts NIE nadpisuje tego, co tu ustawiono.
const defaults = {
  NODE_ENV: 'production',
  // Jeden zaufany pośrednik (nginx/Passenger) przed aplikacją: limit żądań liczony po adresie klienta.
  TRUSTED_PROXY_HOPS: '1',
  PUBLIC_BASE_URL: 'https://mylik.acwo.usermd.net',
  // Model instancji pokazowej: Claude Opus 5.5 (decyzja właściciela z 22.11.2026: dokładniej, drożej, wolniej).
  // Tańszy wariant: 'claude-haiku-5-5' (na nim zrobiono pełne pomiary, zob. docs/WYNIKI.md).
  ANTHROPIC_MODEL: 'claude-opus-5-5',
};
for (const [k, v] of Object.entries(defaults)) {
  if (process.env[k] === undefined || process.env[k] === '') process.env[k] = v;
}

// Bez await na najwyższym poziomie: Passenger ładuje ten plik przez require() (require(esm) w Node 26).
import('./src/_build/main.mjs').catch((e) => {
  console.error('MYLIK: start nieudany', e);
  process.exit(1);
});
