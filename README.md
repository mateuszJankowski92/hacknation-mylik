# Mylik

_Mapa to nie terytorium. Mylik sprawdza mapę, zanim w nią uwierzysz._

Zespół: Iteracja7.

Prototyp weryfikacji doniesień (HackNation 2026). Obywatel wysyła tekst lub adres URL, a system sprawdza twierdzenia w zamkniętym, wersjonowanym korpusie źródeł i odpowiada po polsku: werdykt, uzasadnienie, siła podstawy i cytaty ze źródeł albo uczciwe wstrzymanie się. Mylik nie jest „sędzią prawdy”.

## Uruchomienie krok po kroku

Wymagania: Node.js 24 lub nowszy (wbudowany `node:sqlite`), npm. Bez Dockera, bez bazy zewnętrznej.

```bash
git clone <adres-repozytorium> mylik && cd mylik
npm ci
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

Adapter SMS (w prototypie: symulator) jest w przeglądarce pod `http://localhost:8787/sms`. Prototyp nie ma bramki operatora: SMS nie działa pod prawdziwym numerem, a `POST /sms/webhook` jest tylko punktem, do którego bramka mogłaby kiedyś wysyłać wiadomości (koszt: `src/sms/KOSZT.md`). Odsyłacz w odpowiedzi SMS wskazuje stronę wyniku `/r/<id>` (z `PUBLIC_BASE_URL`, jeśli ustawiony). Godzina w odpowiedziach jest podawana w czasie polskim (Europe/Warsaw).

Pozostałe polecenia: `npm test` (testy, bez sieci i bez klucza), `npm run typecheck`, `npm run dev` (serwer z przeładowaniem), `npm run dev:web` (interfejs Vite z proxy do `/api`), `bash tests/e2e/smoke.sh` (test dymny całości: build, ingest do bazy tymczasowej, start w trybie `mock`, zapytania `curl`, zatrzymanie).

## Skąd bierze się korpus (odtwarzalność)

Wybrana metoda: **migawka w repozytorium**. Zbiór źródeł (733 dokumenty, ok. 3 MB tekstu w `data/raw/`, lista i licencje w `data/sources.json`) jest zacommitowany, więc czysty klon buduje ten sam korpus bez sieci i bez naszej maszyny. Uzasadnienie: wynik ma być powtarzalny dla jury, a strony źródeł się zmieniają i mogą zniknąć. W repozytorium są tylko treści, które wolno przechowywać: informacja publiczna organów władzy, akty prawne, treści na licencjach otwartych (CC BY 4.0, EEAS). Źródła bez licencji otwartej (CERT Polska, Konkret24, fakenews.pl, NASK) mają tylko krótki początek tekstu (800 do 2500 znaków), zapisany w polu `excerptChars`.

Sprawdzenie, że pliki są nietknięte, i że korpus jest ten sam:

```bash
(cd data/raw && shasum -a 256 -c SHA256SUMS | grep -vc ': OK$')   # 0 = wszystkie sumy zgodne (na Linuksie: sha256sum -c)
npm run corpus:ingest    # oczekiwane: documents=733 passages=3543 version=cb62b4255ea0
```

`version` to skrót z treści i metadanych wszystkich dokumentów, więc ta sama wartość oznacza ten sam korpus.

Odświeżenie z internetu (opcjonalne, zmienia wersję korpusu): `npm run corpus:fetch`, potem `npm run corpus:ingest`. Pobieranie sprawdza `robots.txt` każdego serwisu, trzyma odstęp co najmniej 1,1 s między żądaniami do jednego serwisu i zapisuje daty pobrania (`data/raw/_fetched.json`) oraz strony pominięte (`data/raw/_skipped.json`). Treści stron mogły się zmienić od migawki, więc po odświeżeniu sumy w `SHA256SUMS` i `version` będą inne; wyniki z migawki trzeba wtedy liczyć od nowa. Szczegóły: `docs/ZRODLA.md`.

**EUvsDisinfo.** Zbiór znanych operacji informacyjnych (`npm run known-ops:fetch`) nie jest w repozytorium, bo warunki jego ponownego użycia nie są potwierdzone (`data/known-ops/_terms.json`). Bez niego system działa normalnie: po prostu nie dodaje ostrzeżeń o znanych operacjach i nie zgłasza z tego powodu błędu.

## Jak odtworzyć wyniki testów

- `npm test`: testy jednostkowe i e2e, bez sieci i bez klucza.
- `npm run eval -- --mock`: zestaw testowy na atrapie modelu (deterministyczny, bez kosztu, bez sieci). Mierzy przepływ, nie jakość oceny. Przebieg zapisuje `data/eval/results.json`; żeby zachować nasze wyniki z żywego modelu, przywróć plik poleceniem `git checkout data/eval/results.json`.
- Przebieg na żywym modelu (`npm run eval`, opcje w nagłówku `scripts/eval.ts`) wymaga `ANTHROPIC_API_KEY` i kosztuje (liczone za tokeny). Wyniki naszych przebiegów są zapisane w `data/eval/` (`results.json`, `results_live.json`) wraz z kosztem; dla jury wystarczy je przejrzeć.

## Konfiguracja `.env`

Plik `.env` jest ignorowany przez git; wzór to `.env.example`. Zmienne ustawione w środowisku procesu mają pierwszeństwo przed `.env`.

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `LLM_PROVIDER` | `mock` | Dostawca modelu: `mock`, `anthropic` (`mistral` jeszcze niezaimplementowany). |
| `ANTHROPIC_API_KEY` | brak | Klucz Anthropic. Brak klucza przy `anthropic` daje stan „awaria techniczna”, nigdy werdykt. |
| `ANTHROPIC_MODEL` | pusty | Model Anthropic; pusty oznacza domyślny `claude-haiku-5-5` (Claude Haiku 5.5, stała w `src/llm/anthropic.ts`). Opcja dokładniejsza i droższa: `claude-sonnet-5-5` (Claude Sonnet 5.5). |
| `DB_PATH` | `data/mylik.sqlite` | Baza SQLite (korpus, rekordy, log zdarzeń). Ścieżka względna liczona od katalogu projektu. Jedyne miejsce zapisu serwera. |
| `PORT` | `8787` | Port HTTP (na hostingu z Passengerem nadawany automatycznie). |
| `RATE_LIMIT_PER_MIN` | `20` | Limit zgłoszeń na minutę na klienta: osobno `POST /api/*` (odpowiedź 429 JSON) i `POST /sms/webhook` (429 tekstem). `GET` bez limitu. |
| `TRUSTED_PROXY_HOPS` | `0` | Liczba zaufanych proxy przed serwerem (np. `1` za Passengerem/nginx). Przy `0` nagłówek `X-Forwarded-For` jest ignorowany i liczy się adres połączenia. |
| `RETENTION_DAYS` | `30` | Retencja rekordów i zdarzeń: czyszczenie przy starcie i co godzinę. Ręcznie: `npx tsx src/security/purge-cli.ts [--all]`. |
| `EVAL_RESULTS_PATH` | `data/eval/results.json` | Wyniki zestawu testowego (profil błędów w rekordzie). Plik opcjonalny. |
| `KNOWN_OPS_DIR` | `data/known-ops` | Znane operacje informacyjne (EUvsDisinfo), tylko ostrzeżenia. Brak plików nie przeszkadza. |
| `INCIDENTS_PATH` | brak | Plik bazy incydentów (JSON/CSV), tylko ostrzeżenia. Brak = wyszukiwanie domyślne; brak pliku nie przeszkadza. |
| `PUBLIC_BASE_URL` | brak | Publiczny adres serwisu dla odsyłacza na karcie SVG; brak = adres względny. |
| `SUPPORT_GATE_PROVIDER` | pusty (Haiku) | `basal`: bramka wsparcia na modelu Basal (`BASAL_URL`, `BASAL_TOKEN`, `BASAL_TIMEOUT_MS`, `BASAL_MIN_CONFIDENCE`, `BASAL_ASSESS`); przy awarii automatycznie Haiku. Szczegóły: docs/ZALEZNOSCI.md. |
| `LIVE_LAYER` | `off` | Druga warstwa źródeł (zad. 29): `on` = gdy zbiór urzędowy nie da rozstrzygającej podstawy, szukanie na żywo wyłącznie w serwisach z `data/live-sources.json` (wymaga `LLM_PROVIDER=anthropic`). `off` = system działa jak dotąd. Opis: `docs/ZRODLA.md`. |
| `LIVE_SOURCES_PATH` | `data/live-sources.json` | Jawna lista serwisów drugiej warstwy (do audytu). |

`GET /api/health` zwraca nazwę dostawcy i modelu (bez klucza). Konfiguracja wypisywana przy starcie zawiera tylko informację, czy klucz jest ustawiony.

## Tryb bez klucza (`mock`)

`LLM_PROVIDER=mock` uruchamia deterministyczną atrapę modelu (`src/llm/mock.ts`): bez sieci, bez klucza, ten sam wynik dla tego samego wejścia. Atrapa stosuje proste reguły leksykalne i służy do testów oraz pokazu przepływu; nie jest prawdziwą oceną. Cała reszta (wyszukiwanie w korpusie, bramka cytatów, reguły werdyktu, zapis rekordu) działa tak samo jak z prawdziwym modelem.

Uwaga: `.env.example` ma `LLM_PROVIDER=anthropic`. Bez klucza zmień to w `.env` na `mock` albo uruchom `LLM_PROVIDER=mock npm start`.

## Architektura w skrócie

- Jeden proces Node, jeden port. Serwer Hono (`src/server`) obsługuje API i serwuje zbudowany interfejs z `dist/web` (ścieżki SPA zwracają `index.html`; bez builda serwer odpowiada komunikatem „Zbuduj interfejs: npm run build”).
- Jeden silnik `engine.verify(input) -> VerifyOutcome` (`src/engine`). Kanały tylko przyjmują wejście i renderują zapisany rekord; serwer WWW wymusza kanał `www` i nie zawiera logiki weryfikacji.
- Potok: przygotowanie wejścia i maskowanie danych osobowych (`src/input`) -> ekstrakcja twierdzeń i wariantów słów do wyszukiwania (model) -> wyszukiwanie FTS5 w korpusie (`src/corpus`): kilka zapytań "za" scalonych rangami i zapytanie "przeciw", pula do 30 fragmentów -> wybór do 10 kandydatów tanim wywołaniem modelu (`src/engine/ranker.ts`; przy błędzie zostaje kolejność z wyszukiwania) -> ocena stanowisk fragmentów (model, porcje "za" i "przeciw" równolegle) -> bramka cytatów (kod: cytat musi być dosłownym podciągiem fragmentu) -> bramka wsparcia (model, każdy cytat osobno, równolegle) -> werdykt i siła podstawy (kod, `src/engine/rules.ts`) -> zapis rekordu. Twierdzenia jednego zgłoszenia sprawdzane są równolegle.
- Zależności zewnętrzne (Anthropic, Basal na maszynie GPU, EUvsDisinfo), co do nich trafia i jak je wymienić: docs/ZALEZNOSCI.md.
- Limit czasu na zgłoszenie: 22 s (`DEFAULT_DEADLINE_MS` w `src/engine/pipeline.ts`). Po nim obywatel dostaje stan „awaria techniczna” (detal `deadline`), nigdy werdykt; rekord nie jest zapisywany.
- Model nigdy nie podaje URL-i ani metadanych źródeł; widzi tylko identyfikator i treść fragmentu. Metadane wstawia kod z bazy.
- Brak klucza, limit, wyjątek to zawsze stan techniczny (`kind: "state"`), nigdy werdykt. Wykryte sygnały prompt injection trafiają do rekordu i do logu zdarzeń (tabela `events`, bez treści zgłoszeń).
- API (`src/contracts/api.ts`): `POST /api/verify` (JSON, maks. 16 KB, dokładnie jedno z `text`/`url`), `GET /api/records/:id`, `GET /api/sources`, `GET /api/health`. Dodatkowo w tym samym serwerze: `GET /api/records/:id/card.svg` (karta do pobrania, `?download=1`), `GET /api/stats` (agregaty bez treści zgłoszeń), `POST /sms/webhook` (adapter SMS, w prototypie: symulator; JSON lub formularz, pole `text`/`tresc`/`body`; odpowiedź zwykłym tekstem, ten sam rekord co WWW) i `GET /sms` (symulator telefonu, bez operatora).
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
src/live/        druga warstwa źródeł: lista serwisów, wyszukiwanie adresów, pobranie stron (LIVE_LAYER)
src/server/      serwer HTTP (Hono): trasy, pliki statyczne, składanie zależności
src/main.ts      punkt wejścia serwera
web/             interfejs React (budowany przez Vite do dist/web)
data/            katalog źródeł (sources.json), surowe teksty (raw/), baza (mylik.sqlite)
scripts/         ingest i pobieranie źródeł
tests/           testy (vitest), w tym e2e serwera i test dymny tests/e2e/smoke.sh
```
