# Mylik

_Mapa to nie terytorium. Mylik sprawdza mapę, zanim w nią uwierzysz._

Zespół: Iteracja7.

Prototyp weryfikacji doniesień (HackNation 2026). Obywatel wysyła tekst lub adres URL, a system sprawdza twierdzenia w zamkniętym, wersjonowanym korpusie źródeł i odpowiada po polsku: werdykt, uzasadnienie, siła podstawy i cytaty ze źródeł albo uczciwe wstrzymanie się. Mylik nie jest „sędzią prawdy”.

## Uruchomienie krok po kroku

Wymagania: Node.js 24 lub nowszy (wbudowany `node:sqlite`; instrukcję sprawdzono na Node 26), npm. Bez Dockera, bez bazy zewnętrznej, bez klucza i bez sieci poza `localhost`.

```bash
git clone <adres-repozytorium> mylik && cd mylik
npm ci
npm run corpus:ingest         # buduje korpus w data/mylik.sqlite z data/sources.json i data/raw/ (ok. 1 s)
                              # oczekiwane: documents=733 passages=3543 version=cb62b4255ea0
npm run build                 # buduje interfejs do dist/web (i sprawdza typy; ostrzeżenie o "node:crypto" jest nieszkodliwe)
LLM_PROVIDER=mock npm start   # serwer w tym oknie terminala: http://localhost:8787 (zatrzymanie: Ctrl+C)
```

Plik `.env` jest opcjonalny: bez niego domyślnym dostawcą modelu jest atrapa `mock` (zob. "Tryb bez klucza"). `.env.example` (kopia: `cp .env.example .env`) też ma `LLM_PROVIDER=mock`; prawdziwy model wymaga `LLM_PROVIDER=anthropic` i `ANTHROPIC_API_KEY` w `.env`. Gdy port 8787 jest zajęty (błąd `EADDRINUSE`), uruchom z innym: `PORT=8799 LLM_PROVIDER=mock npm start` i podmień port w poleceniach niżej.

Sprawdzenie, że działa (w drugim oknie terminala):

```bash
curl -s localhost:8787/api/health     # {"ok":true,"provider":"mock",...,"corpusVersion":"cb62b4255ea0","documents":733}
curl -s -X POST localhost:8787/api/verify -H 'content-type: application/json' \
  -d '{"text":"Obywatele Unii Europejskiej mogą podróżować w strefie Schengen bez kontroli granicznych."}'
                                      # {"kind":"record","record":{"id":"<id>",...}}: werdykt "potwierdzone" z cytatem
curl -s -X POST localhost:8787/sms/webhook -H 'content-type: application/json' \
  -d '{"text":"Obywatele Unii Europejskiej mogą podróżować w strefie Schengen bez kontroli granicznych."}'
                                      # odpowiedź zwykłym tekstem, ten sam rekord (odsyłacz /r/<id>)
curl -s localhost:8787/api/stats
```

W przeglądarce: strona główna `http://localhost:8787/`, wynik `http://localhost:8787/r/<id>` (id z odpowiedzi `/api/verify`) i symulator SMS `http://localhost:8787/sms`.

Adapter SMS (w prototypie: symulator) jest w przeglądarce pod `http://localhost:8787/sms`. Prototyp nie ma bramki operatora: SMS nie działa pod prawdziwym numerem, a `POST /sms/webhook` jest tylko punktem, do którego bramka mogłaby kiedyś wysyłać wiadomości (koszt: `src/sms/KOSZT.md`). Odsyłacz w odpowiedzi SMS wskazuje stronę wyniku `/r/<id>` (z `PUBLIC_BASE_URL`, jeśli ustawiony). Godzina w odpowiedziach jest podawana w czasie polskim (Europe/Warsaw).

## Mylik na Discordzie

Trzeci adapter obok WWW i SMS: komenda `/sprawdz tekst:<wiadomość lub adres>` (opcja `publicznie`, domyślnie wynik widzi tylko pytający) i polecenie „Sprawdź z Mylikiem” z menu wiadomości. Działa bez stałego połączenia (webhook `POST /discord/interactions`, podpis Ed25519 sprawdzany kluczem `DISCORD_PUBLIC_KEY`), więc pasuje do hostingu z Passengerem. Odpowiedź jest odroczona (Discord dostaje ją w 3 s), a wynik uzupełnia wiadomość po zakończeniu pracy silnika; ten sam silnik, ten sam rekord i ta sama treść (`shortAnswer` z `src/render`) co w WWW i SMS, z odsyłaczem `/r/<id>` na `PUBLIC_BASE_URL`.

Dodanie Mylika na Discordzie (jednorazowo, w [portalu deweloperów](https://discord.com/developers/applications)):

1. Utwórz aplikację. Na stronie **General Information** skopiuj **Application ID** i **Public Key** do `.env` jako `DISCORD_APPLICATION_ID` i `DISCORD_PUBLIC_KEY`.
2. Na stronie **Bot** wygeneruj token i wpisz go jako `DISCORD_BOT_TOKEN` (służy tylko do rejestracji komend; serwer go nie czyta).
3. Na stronie **Installation** włącz **Guild Install** i **User Install** (komendy są zarejestrowane dla obu kontekstów, także dla wiadomości prywatnych).
4. Wdróż serwer z uzupełnionymi `DISCORD_PUBLIC_KEY` i `DISCORD_APPLICATION_ID` (puste = kanał wyłączony, `POST /discord/interactions` zwraca 503), a w **General Information** wpisz **Interactions Endpoint URL**: `https://<twoja-domena>/discord/interactions`. Discord od razu wyśle PING z podpisem; zapis się powiedzie tylko, gdy serwer odpowie poprawnie.
5. Zarejestruj komendy globalnie: `node scripts/discord-register.mjs` (idempotentne: jedno zbiorcze `PUT`, można powtarzać; token tylko z środowiska lub `.env`, nigdzie niewypisywany). `--dry-run` wypisuje definicje komend bez sieci.

Uruchomienie lokalne bez Discorda: nic się nie zmienia (puste zmienne `DISCORD_*` wyłączają kanał). Cały adapter jest sprawdzany testami bez sieci: `npx vitest run tests/discord tests/engine/channels.test.ts` (para kluczy Ed25519 powstaje w teście, Discord jest atrapą `fetch`). Ręcznie, bez prawdziwego Discorda, wystarczy test dymny z podpisem z `tests/discord/helpers.ts`; prawdziwa komenda wymaga publicznego adresu HTTPS (np. tunelu do `localhost:8787`) wpisanego jako Interactions Endpoint URL.

Prywatność i bezpieczeństwo: identyfikator użytkownika Discorda nie jest zapisywany ani przekazywany do silnika (do limitu zgłoszeń służy skrót z losową solą, tylko w pamięci procesu); wiadomości nie pingują nikogo (`allowed_mentions` puste, znaczniki `<@...>` usuwane z tekstu); limit zgłoszeń na użytkownika to `RATE_LIMIT_PER_MIN` na minutę; załączniki i obrazki są pomijane.

Pozostałe polecenia: `npm test` (78 plików, 1231 testów i 1 pominięty, bez sieci i bez klucza), `npm run typecheck`, `npm run dev` (serwer z przeładowaniem), `npm run dev:web` (interfejs Vite z proxy do `/api`), `bash tests/e2e/smoke.sh` (test dymny całości: build, ingest do bazy tymczasowej, start w trybie `mock`, zapytania `curl`, zatrzymanie).

## Wyniki w skrócie

Silnik dd6f303f5e02 (zamrożony), zestaw kontrolny v2 (176 przypadków), Claude Haiku 5.5, bez drugiej warstwy źródeł: macro-F1 0,701, poprawność cytowań 79,7% (sędzia: model), wstrzymanie się 15/21, odporność na prompt injection 8/8, spójność kanałów WWW i SMS 5/5, mediana czasu 7,5 s, koszt silnika ok. 0,0034 USD na zgłoszenie. Trafność, poprawność cytowań i wstrzymanie się są **poniżej celów MVP** (0,75, 85%, 80%); to jeden przebieg z rozrzutem co najmniej 0,06 macro-F1, a v2 posłużył do jednej decyzji o progu. Profil omylności pokazywany obywatelowi: 14/58, 12/43, 28/70 (siła średnia, niska, brak). Szczegóły i ograniczenia: [docs/WYNIKI.md](docs/WYNIKI.md), [docs/MIERNIKI.md](docs/MIERNIKI.md).

Co jest wyłączone domyślnie: druga warstwa źródeł (media i instytucje, eksperymentalna, `LIVE_LAYER=off`) i Basal (`SUPPORT_GATE_PROVIDER` pusty; pomiar na żywo niewykonany). Zbioru EUvsDisinfo nie ma w repozytorium (licencja niepotwierdzona).

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
| `RATE_LIMIT_PER_MIN` | `20` | Limit zgłoszeń na minutę na klienta: osobno `POST /api/*` (odpowiedź 429 JSON) i `POST /sms/webhook` (429 tekstem); na Discordzie liczony na użytkownika (skrót w pamięci), z odpowiedzią w wiadomości. `GET` bez limitu. |
| `TRUSTED_PROXY_HOPS` | `0` | Liczba zaufanych proxy przed serwerem (np. `1` za Passengerem/nginx). Przy `0` nagłówek `X-Forwarded-For` jest ignorowany i liczy się adres połączenia. |
| `RETENTION_DAYS` | `30` | Retencja rekordów i zdarzeń: czyszczenie przy starcie i co godzinę. Ręcznie: `npx tsx src/security/purge-cli.ts [--all]`. |
| `EVAL_RESULTS_PATH` | `data/eval/results.json` | Wyniki zestawu testowego (profil błędów w rekordzie). Plik opcjonalny. |
| `KNOWN_OPS_DIR` | `data/known-ops` | Znane operacje informacyjne (EUvsDisinfo), tylko ostrzeżenia. Brak plików nie przeszkadza. |
| `INCIDENTS_PATH` | brak | Plik bazy incydentów (JSON/CSV), tylko ostrzeżenia. Brak = wyszukiwanie domyślne; brak pliku nie przeszkadza. |
| `PUBLIC_BASE_URL` | brak | Publiczny adres serwisu dla odsyłacza na karcie SVG; brak = adres względny. |
| `SUPPORT_GATE_PROVIDER` | pusty (Haiku) | `basal`: bramka wsparcia na modelu Basal (`BASAL_URL`, `BASAL_TOKEN`, `BASAL_TIMEOUT_MS`, `BASAL_MIN_CONFIDENCE`, `BASAL_ASSESS`); przy awarii automatycznie Haiku. Szczegóły: docs/ZALEZNOSCI.md. |
| `LIVE_LAYER` | `off` | Druga warstwa źródeł (zad. 29): `on` = gdy zbiór urzędowy nie da rozstrzygającej podstawy, szukanie na żywo wyłącznie w serwisach z `data/live-sources.json` (wymaga `LLM_PROVIDER=anthropic`). `off` = system działa jak dotąd. Opis: `docs/ZRODLA.md`. |
| `LIVE_SOURCES_PATH` | `data/live-sources.json` | Jawna lista serwisów drugiej warstwy (do audytu). |
| `URZEDNIK_TOKEN` | brak | Token widoku urzędnika `/urzednik` (min. 16 znaków). Bez tokenu każdy adres pod `/urzednik` zwraca 401. Opis: `docs/PETLA_INFORMACJI.md`. |
| `URZEDNIK_OSOBA` | brak | Osoba z etykiety przycisku „Oznacz jako przekazane do: …” w widoku urzędnika. |
| `URZEDNIK_ADRES_POWIADOMIEN` | brak | Adres osoby do powiadomień wskazanej przez administratora. Przygotowane miejsce: e-maili nie wysyłamy. |
| `CASE_RETENTION_DAYS` | `365` | Po ilu dniach bez nowego zgłoszenia sprawa urzędnika jest usuwana. |
| `DISCORD_APPLICATION_ID` | brak | Identyfikator aplikacji Discord; gdy ustawiony, interakcje z innym identyfikatorem są odrzucane. Opis: „Mylik na Discordzie”. |
| `DISCORD_PUBLIC_KEY` | brak | Klucz publiczny aplikacji Discord (64 znaki hex) do sprawdzania podpisu Ed25519. Bez niego `POST /discord/interactions` zwraca 503. |
| `DISCORD_BOT_TOKEN` | brak | Token bota, wyłącznie dla `scripts/discord-register.mjs` (rejestracja komend); serwer go nie czyta. |

`GET /api/health` zwraca nazwę dostawcy i modelu (bez klucza). Konfiguracja wypisywana przy starcie zawiera tylko informację, czy klucz jest ustawiony.

## Tryb bez klucza (`mock`)

`LLM_PROVIDER=mock` uruchamia deterministyczną atrapę modelu (`src/llm/mock.ts`): bez sieci, bez klucza, ten sam wynik dla tego samego wejścia. Atrapa stosuje proste reguły leksykalne i służy do testów oraz pokazu przepływu; nie jest prawdziwą oceną. Cała reszta (wyszukiwanie w korpusie, bramka cytatów, reguły werdyktu, zapis rekordu) działa tak samo jak z prawdziwym modelem.

Uwaga: przy `LLM_PROVIDER=anthropic` bez klucza każde zgłoszenie kończy się stanem "awaria techniczna", nigdy werdyktem. Do pokazu bez klucza zostaw `mock`.

## Architektura w skrócie

- Jeden proces Node, jeden port. Serwer Hono (`src/server`) obsługuje API i serwuje zbudowany interfejs z `dist/web` (ścieżki SPA zwracają `index.html`; bez builda serwer odpowiada komunikatem „Zbuduj interfejs: npm run build”).
- Jeden silnik `engine.verify(input) -> VerifyOutcome` (`src/engine`). Kanały tylko przyjmują wejście i renderują zapisany rekord; serwer WWW wymusza kanał `www` i nie zawiera logiki weryfikacji.
- Potok: przygotowanie wejścia i maskowanie danych osobowych (`src/input`) -> ekstrakcja twierdzeń i wariantów słów do wyszukiwania (model) -> wyszukiwanie FTS5 w korpusie (`src/corpus`): kilka zapytań "za" scalonych rangami i zapytanie "przeciw", pula do 30 fragmentów -> wybór do 10 kandydatów tanim wywołaniem modelu (`src/engine/ranker.ts`; przy błędzie zostaje kolejność z wyszukiwania) -> ocena stanowisk fragmentów (model, porcje "za" i "przeciw" równolegle) -> bramka cytatów (kod: cytat musi być dosłownym podciągiem fragmentu) -> bramka wsparcia (model, każdy cytat osobno, równolegle) -> werdykt i siła podstawy (kod, `src/engine/rules.ts`) -> zapis rekordu. Twierdzenia jednego zgłoszenia sprawdzane są równolegle.
- Zależności zewnętrzne (Anthropic, Basal na maszynie GPU, EUvsDisinfo), co do nich trafia i jak je wymienić: docs/ZALEZNOSCI.md.
- Limit czasu na zgłoszenie: 22 s (`DEFAULT_DEADLINE_MS` w `src/engine/pipeline.ts`). Po nim obywatel dostaje stan „awaria techniczna” (detal `deadline`), nigdy werdykt; rekord nie jest zapisywany.
- Model nigdy nie podaje URL-i ani metadanych źródeł; widzi tylko identyfikator i treść fragmentu. Metadane wstawia kod z bazy.
- Brak klucza, limit, wyjątek to zawsze stan techniczny (`kind: "state"`), nigdy werdykt. Wykryte sygnały prompt injection trafiają do rekordu i do logu zdarzeń (tabela `events`, bez treści zgłoszeń).
- API (`src/contracts/api.ts`): `POST /api/verify` (JSON, maks. 16 KB, dokładnie jedno z `text`/`url`), `GET /api/records/:id`, `GET /api/sources`, `GET /api/health`. Dodatkowo w tym samym serwerze: `GET /api/records/:id/card.svg` (karta do pobrania, `?download=1`), `GET /api/stats` (agregaty bez treści zgłoszeń), `POST /sms/webhook` (adapter SMS, w prototypie: symulator; JSON lub formularz, pole `text`/`tresc`/`body`; odpowiedź zwykłym tekstem, ten sam rekord co WWW) i `GET /sms` (symulator telefonu, bez operatora), a także `POST /discord/interactions` (adapter Discord: webhook interakcji z podpisem Ed25519, odpowiedź odroczona i uzupełniona przez webhook interakcji).
- Pętla informacji: twierdzenia bez wystarczających dowodów trafiają jako sprawy (`src/cases`, deduplikacja, licznik powtórzeń) do widoku urzędnika `/urzednik` (token z `URZEDNIK_TOKEN`, bez tokenu 401, eksport CSV i JSON); `GET /api/records/:id/obieg` mówi interfejsowi, czy pytanie „zapisano”, czy urzędnik oznaczył je jako „przekazano”. Maili nie wysyłamy. [docs/PETLA_INFORMACJI.md](docs/PETLA_INFORMACJI.md).
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
src/cases/       sprawy urzędnika: deduplikacja, magazyn, eksport, zdania dla obywatela (pętla informacji)
src/live/        druga warstwa źródeł: lista serwisów, wyszukiwanie adresów, pobranie stron (LIVE_LAYER)
src/server/      serwer HTTP (Hono): trasy, pliki statyczne, składanie zależności
src/main.ts      punkt wejścia serwera
web/             interfejs React (budowany przez Vite do dist/web)
data/            katalog źródeł (sources.json), surowe teksty (raw/), baza (mylik.sqlite)
scripts/         ingest i pobieranie źródeł
tests/           testy (vitest), w tym e2e serwera i test dymny tests/e2e/smoke.sh
```

## Dokumentacja zgłoszenia

| Temat | Plik |
|---|---|
| Architektura i przepływ danych (F5) | [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) |
| Role postaci na żywo (wygląd wyniku, 12 ról) | [docs/ROLE_NA_ZYWO.md](docs/ROLE_NA_ZYWO.md) |
| Modele i dostawcy (F5, T13) | [docs/MODELE.md](docs/MODELE.md), [docs/ZALEZNOSCI.md](docs/ZALEZNOSCI.md) |
| Źródła, licencje, kwalifikacja i aktualizacja (F6) | [docs/ZRODLA.md](docs/ZRODLA.md), licencje przy każdym źródle w `data/sources.json` |
| Etykiety i ich definicje | [docs/ETYKIETY.md](docs/ETYKIETY.md) |
| Ryzyka (F8) | [docs/RYZYKA.md](docs/RYZYKA.md) |
| Wyniki testów i jak je odtworzyć (F7) | [docs/WYNIKI.md](docs/WYNIKI.md), [docs/MIERNIKI.md](docs/MIERNIKI.md) |
| Koszt 1 000 zapytań, koszt kanału, zachowanie przy ruchu (T14) | [docs/KOSZTY.md](docs/KOSZTY.md) |
| Pętla informacji: sprawy i widok urzędnika (scenariusz H) | [docs/PETLA_INFORMACJI.md](docs/PETLA_INFORMACJI.md) |
| Czego Mylik nie obsługuje | [docs/NIEOBSLUGIWANE.md](docs/NIEOBSLUGIWANE.md) |
| Pochodzenie ilustracji (modele generatywne, prawa, podmiana) | [docs/POCHODZENIE_ILUSTRACJI.md](docs/POCHODZENIE_ILUSTRACJI.md) |

## Licencja

Kod jest udostępniony na licencji MIT (plik [LICENSE](LICENSE)). Dane źródłowe w `data/raw/` pochodzą od wskazanych wydawców i podlegają ich warunkom (lista i licencje: [docs/ZRODLA.md](docs/ZRODLA.md)). Ilustracje i klipy postaci zostały wygenerowane modelami przez fal.ai, a ich status prawny opisuje [docs/POCHODZENIE_ILUSTRACJI.md](docs/POCHODZENIE_ILUSTRACJI.md). Migawka EUvsDisinfo nie jest częścią repozytorium.
