# Mylik

Zespół: Iteracja7.

Prototyp weryfikacji doniesień (HackNation 2026). Obywatel wysyła tekst lub adres URL, a system sprawdza twierdzenia w zamkniętym, wersjonowanym korpusie źródeł i odpowiada po polsku: werdykt, uzasadnienie, siła podstawy i cytaty ze źródeł albo uczciwe wstrzymanie się. Mylik nie jest „sędzią prawdy”.

## Uruchomienie krok po kroku

Wymagania: Node.js 24 lub nowszy (wbudowany `node:sqlite`), npm. Bez Dockera, bez bazy zewnętrznej.

```bash
git clone <adres-repozytorium> mylik && cd mylik
npm install
cp .env.example .env          # w trybie bez klucza ustaw w .env: LLM_PROVIDER=mock
npm run corpus:ingest         # buduje korpus w data/mylik.sqlite z data/sources.json i data/raw/
npm run build                 # buduje interfejs do dist/web (i sprawdza typy)
npm start                     # serwer: http://localhost:8787
```

Sprawdzenie, że działa:

```bash
curl -s localhost:8787/api/health
curl -s -X POST localhost:8787/api/verify -H 'content-type: application/json' \
  -d '{"text":"Obywatele Unii Europejskiej mogą podróżować w strefie Schengen bez kontroli granicznych."}'
curl -s -X POST localhost:8787/sms/webhook -H 'content-type: application/json' \
  -d '{"text":"Obywatele Unii Europejskiej mogą podróżować w strefie Schengen bez kontroli granicznych."}'
curl -s localhost:8787/api/stats
```

Symulator SMS w przeglądarce: `http://localhost:8787/sms`.

Pozostałe polecenia: `npm test` (testy, bez sieci i bez klucza), `npm run typecheck`, `npm run dev` (serwer z przeładowaniem), `npm run dev:web` (interfejs Vite z proxy do `/api`), `bash tests/e2e/smoke.sh` (test dymny całości: build, ingest do bazy tymczasowej, start w trybie `mock`, zapytania `curl`, zatrzymanie).

Surowe teksty źródeł (`data/raw/*.txt`) są w repozytorium, więc `npm run corpus:ingest` działa bez sieci. Odświeżenie źródeł z internetu: `npm run corpus:fetch`, potem ponownie `npm run corpus:ingest`.

## Konfiguracja `.env`

Plik `.env` jest ignorowany przez git; wzór to `.env.example`. Zmienne ustawione w środowisku procesu mają pierwszeństwo przed `.env`.

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `LLM_PROVIDER` | `mock` | Dostawca modelu: `mock`, `anthropic` (`mistral` jeszcze niezaimplementowany). |
| `ANTHROPIC_API_KEY` | brak | Klucz Anthropic. Brak klucza przy `anthropic` daje stan „awaria techniczna”, nigdy werdykt. |
| `ANTHROPIC_MODEL` | pusty | Model Anthropic; pusty oznacza domyślny `claude-sonnet-5-5` (Claude Sonnet 5.5, stała w `src/llm/anthropic.ts`). Tańsza opcja: `claude-haiku-5-5` (Claude Haiku 5.5). |
| `DB_PATH` | `data/mylik.sqlite` | Baza SQLite (korpus, rekordy, log zdarzeń). Ścieżka względna liczona od katalogu projektu. Jedyne miejsce zapisu serwera. |
| `PORT` | `8787` | Port HTTP (na hostingu z Passengerem nadawany automatycznie). |
| `RATE_LIMIT_PER_MIN` | `20` | Limit zgłoszeń na minutę na klienta: osobno `POST /api/*` (odpowiedź 429 JSON) i `POST /sms/webhook` (429 tekstem). `GET` bez limitu. |
| `TRUSTED_PROXY_HOPS` | `0` | Liczba zaufanych proxy przed serwerem (np. `1` za Passengerem/nginx). Przy `0` nagłówek `X-Forwarded-For` jest ignorowany i liczy się adres połączenia. |
| `RETENTION_DAYS` | `30` | Retencja rekordów i zdarzeń: czyszczenie przy starcie i co godzinę. Ręcznie: `npx tsx src/security/purge-cli.ts [--all]`. |
| `EVAL_RESULTS_PATH` | `data/eval/results.json` | Wyniki zestawu testowego (profil błędów w rekordzie). Plik opcjonalny. |
| `KNOWN_OPS_DIR` | `data/known-ops` | Znane operacje informacyjne (EUvsDisinfo), tylko ostrzeżenia. Brak plików nie przeszkadza. |
| `INCIDENTS_PATH` | brak | Plik bazy incydentów (JSON/CSV), tylko ostrzeżenia. Brak = wyszukiwanie domyślne; brak pliku nie przeszkadza. |
| `PUBLIC_BASE_URL` | brak | Publiczny adres serwisu dla odsyłacza na karcie SVG; brak = adres względny. |

`GET /api/health` zwraca nazwę dostawcy i modelu (bez klucza). Konfiguracja wypisywana przy starcie zawiera tylko informację, czy klucz jest ustawiony.

## Tryb bez klucza (`mock`)

`LLM_PROVIDER=mock` uruchamia deterministyczną atrapę modelu (`src/llm/mock.ts`): bez sieci, bez klucza, ten sam wynik dla tego samego wejścia. Atrapa stosuje proste reguły leksykalne i służy do testów oraz pokazu przepływu; nie jest prawdziwą oceną. Cała reszta (wyszukiwanie w korpusie, bramka cytatów, reguły werdyktu, zapis rekordu) działa tak samo jak z prawdziwym modelem.

Uwaga: `.env.example` ma `LLM_PROVIDER=anthropic`. Bez klucza zmień to w `.env` na `mock` albo uruchom `LLM_PROVIDER=mock npm start`.

## Architektura w skrócie

- Jeden proces Node, jeden port. Serwer Hono (`src/server`) obsługuje API i serwuje zbudowany interfejs z `dist/web` (ścieżki SPA zwracają `index.html`; bez builda serwer odpowiada komunikatem „Zbuduj interfejs: npm run build”).
- Jeden silnik `engine.verify(input) -> VerifyOutcome` (`src/engine`). Kanały tylko przyjmują wejście i renderują zapisany rekord; serwer WWW wymusza kanał `www` i nie zawiera logiki weryfikacji.
- Potok: przygotowanie wejścia i maskowanie danych osobowych (`src/input`) -> ekstrakcja twierdzeń (model) -> wyszukiwanie FTS5 w korpusie (`src/corpus`) -> ocena stanowisk fragmentów (model) -> bramka cytatów (kod: cytat musi być dosłownym podciągiem fragmentu) -> werdykt i siła podstawy (kod, `src/engine/rules.ts`) -> zapis rekordu.
- Model nigdy nie podaje URL-i ani metadanych źródeł; widzi tylko identyfikator i treść fragmentu. Metadane wstawia kod z bazy.
- Brak klucza, limit, wyjątek to zawsze stan techniczny (`kind: "state"`), nigdy werdykt. Wykryte sygnały prompt injection trafiają do rekordu i do logu zdarzeń (tabela `events`, bez treści zgłoszeń).
- API (`src/contracts/api.ts`): `POST /api/verify` (JSON, maks. 16 KB, dokładnie jedno z `text`/`url`), `GET /api/records/:id`, `GET /api/sources`, `GET /api/health`. Dodatkowo w tym samym serwerze: `GET /api/records/:id/card.svg` (karta do pobrania, `?download=1`), `GET /api/stats` (agregaty bez treści zgłoszeń), `POST /sms/webhook` (JSON lub formularz, pole `text`/`tresc`/`body`; odpowiedź zwykłym tekstem, ten sam rekord co WWW) i `GET /sms` (symulator telefonu).
- Nagłówki bezpieczeństwa: CSP ograniczone do własnego originu, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: no-referrer`; brak CORS. Log na stdout: jedna linia na żądanie (metoda, ścieżka, status, czas), bez treści zgłoszeń i sekretów.

## Struktura katalogów

```
src/contracts/   kontrakty (typy i schematy zod) wspólne dla wszystkich modułów
src/config.ts    odczyt konfiguracji ze zmiennych środowiskowych
src/db/          otwieranie bazy SQLite i schemat
src/corpus/      katalog źródeł, podział na fragmenty, ingest, wyszukiwarka FTS5
src/input/       walidacja, normalizacja i maskowanie danych osobowych
src/llm/         dostawcy modelu (mock, anthropic) i prompty
src/engine/      potok weryfikacji, bramka cytatów, reguły werdyktu, zapis rekordów
src/server/      serwer HTTP (Hono): trasy, pliki statyczne, składanie zależności
src/main.ts      punkt wejścia serwera
web/             interfejs React (budowany przez Vite do dist/web)
data/            katalog źródeł (sources.json), surowe teksty (raw/), baza (mylik.sqlite)
scripts/         ingest i pobieranie źródeł
tests/           testy (vitest), w tym e2e serwera i test dymny tests/e2e/smoke.sh
```
