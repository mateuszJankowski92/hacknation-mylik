# Źródła Mylika: dwie warstwy

Mylik (zespół Iteracja7) opiera odpowiedź na źródłach z jawnych list. Są dwie warstwy. Werdykt zależy wyłącznie od tego, co źródło mówi o twierdzeniu (stanowiska dowodów po bramkach), nigdy od domeny, wydawcy ani warstwy. Warstwa wpływa tylko na siłę podstawy („Na ile to pewne”).

## Warstwa 1: zamknięty zbiór urzędowy (korpus)

- Lista: `data/sources.json` (serwisy organów władzy publicznej, akty prawne, wybrane organizacje), teksty w `data/raw/`, indeks FTS5 w bazie.
- Zasady kwalifikowania, aktualizowania i wykluczania są zapisane przy każdym źródle w polu `policy` (`qualification`, `update`, `exclusion`). Aktualizacja: `npm run corpus:fetch`, potem `npm run corpus:ingest`; zmiana treści zmienia wersję korpusu, „stan na” to najnowsza data pobrania.
- Ta warstwa jest zawsze pytana pierwsza.
- Odtwarzalność: migawka tekstów (`data/raw/`, 733 dokumenty) jest w repozytorium, razem z sumami kontrolnymi `data/raw/SHA256SUMS`. Czysty klon buduje bez sieci ten sam korpus (`npm run corpus:ingest` wypisuje `version=cb62b4255ea0`). W repozytorium są tylko treści, które wolno przechowywać: informacja publiczna organów władzy, akty prawne, licencje otwarte (CC BY 4.0, EEAS); źródła bez licencji otwartej mają tylko krótki początek tekstu (`discovery.excerptChars`). Alternatywa (odtwarzanie z sieci) odrzucona jako metoda główna, bo strony się zmieniają, a wynik dla jury ma być powtarzalny. Odświeżenie z sieci (`npm run corpus:fetch`) jest opcjonalne, szanuje `robots.txt` i odstęp co najmniej 1,1 s na serwis; po nim sumy i wersja korpusu się zmieniają, a treści mogły się zmienić od migawki.
- Zbiór EUvsDisinfo (znane operacje informacyjne) nie jest w repozytorium (licencja niepotwierdzona, `data/known-ops/_terms.json`); bez niego system działa bez ostrzeżeń o znanych operacjach i bez błędu.

## Warstwa 2: media i instytucje (szukanie na żywo, zad. 29)

Włączana zmienną `LIVE_LAYER=on` (domyślnie `off`; wtedy system działa jak dotąd). Wymaga dostawcy `anthropic`.

### Kiedy działa

- Tylko dla twierdzenia faktograficznego, dla którego warstwa 1 nie dała żadnego rozstrzygającego dowodu (potwierdza, obala, opisuje to samo w innym kontekście) po bramce cytatów i bramce wsparcia.
- Nigdy zamiast warstwy 1, nigdy dla opinii i prognoz, nigdy przy stanach technicznych (awaria, brak możliwości sprawdzenia, potrzeba doprecyzowania).

### Gdzie szuka: zamknięta lista

Plik `data/live-sources.json` (do audytu). Żadnych innych domen, żadnego otwartego internetu, żadnych portali społecznościowych. Dozwolona jest wpisana domena i jej subdomeny (np. `www.pap.pl` dla `pap.pl`); podróbki (`evilpap.pl`, `pap.pl.example.com`), inne porty, protokoły i adresy z loginem odpadają.

| Rodzaj | Zasada kwalifikacji |
|---|---|
| agencje prasowe i media publiczne (`agencja_i_media_publiczne`) | Krajowa agencja prasowa albo nadawca publiczny działający na podstawie ustawy, z redakcją odpowiadającą prawnie za treść (prawo prasowe), jawnym wydawcą i stałym adresem. Tylko teksty redakcyjne. Nie: blogi, fora, komentarze, treści sponsorowane, serwisy społecznościowe. |
| oficjalne związki i instytucje (`zwiazek_lub_instytucja`) | Oficjalna strona związku sportowego, organizacji międzynarodowej, instytucji publicznej lub uczelni publicznej, wskazana przez tę instytucję jako jej własna. Tylko komunikaty i wyniki publikowane przez samą instytucję. |

Lista startowa (dodane 2026-11-21): Polska Agencja Prasowa (pap.pl), Polskie Radio (polskieradio.pl, polskieradio24.pl), TVP Info (tvp.info), TVP Sport (sport.tvp.pl), PZPN (pzpn.pl, laczynaspilka.pl), UEFA (uefa.com), FIFA (fifa.com), Polski Komitet Olimpijski (olimpijski.pl), GUS (stat.gov.pl), NBP (nbp.pl), Polska Akademia Nauk (pan.pl), Uniwersytet Warszawski (uw.edu.pl), Uniwersytet Jagielloński (uj.edu.pl). Każdy wpis ma wydawcę, rodzaj, zasadę kwalifikacji (z rodzaju) i datę dodania.

### Aktualizowanie i wykluczanie

- Dodanie serwisu: nowy wpis w `data/live-sources.json` (id, domena, wydawca, rodzaj, data dodania) przez zmianę w repozytorium z opisem, który warunek kwalifikacji spełnia. Plik jest sprawdzany schematem przy starcie (nieznany rodzaj, powtórzona domena albo adres zamiast domeny = warstwa 2 się nie włącza).
- Usunięcie serwisu: usunięcie wpisu. Powody wykluczenia: utrata cech z zasady kwalifikacji (np. zmiana wydawcy, treści sponsorowane bez oznaczenia), powtarzające się błędy merytoryczne bez sprostowań, wymóg logowania lub paywall dla treści, zakaz w robots.txt.
- Strony wykluczane w działaniu (automatycznie): zakazane w robots.txt (błąd serwera przy robots.txt = nie pobieramy), przekierowanie poza listę, treść inna niż HTML/tekst, strona bez tekstu (np. wymagająca JavaScriptu), ponad 1 MB, fragmenty z sygnałem prompt injection (odnotowane w rekordzie i w logu). Nie zakładamy kont, nie podajemy danych, nie obchodzimy zabezpieczeń ani paywalli.

### Jak szuka

1. Wyszukanie adresów: narzędzie serwerowe `web_search` API Anthropic (`web_search_20250305`, najwyżej 2 wyszukiwania na twierdzenie) z filtrem `allowed_domains` równym liście. Bez nowych kluczy i kont (ten sam klucz co model). Adresy bierzemy WYŁĄCZNIE ze strukturalnych bloków wyników wyszukiwania, nigdy z tekstu wygenerowanego przez model, i każdy przechodzi kontrolę domeny w kodzie (`src/live/sources.ts`).
2. Pobranie: istniejący bezpieczny pobieracz (`src/engine/fetch`: ochrona SSRF, przypięty adres IP, limity rozmiaru i czasu, bez treści ukrytej), robots.txt sprawdzany przed pobraniem strony, najwyżej 4 strony na rundę i 2 strony jednego serwisu (druga runda tylko, gdy w pierwszej żadna strona nie miała tekstu).
3. Fragmenty: podział tekstu jak w korpusie, najwyżej 2 fragmenty ze strony i 6 łącznie, z metadanymi (wydawca, tytuł, data publikacji, data pobrania, adres, warstwa `media_i_instytucje`).
4. Dalej ten sam potok co dla korpusu: ocena stanowiska, cytat jako dosłowny podciąg pobranej treści, bramka wsparcia, reguły werdyktu. Treść strony to dane, nie polecenia.

### Jak to widać

- Każdy dowód w rekordzie ma pole `source.layer` (`media_i_instytucje`; brak pola = warstwa urzędowa).
- Odpowiedź dopisuje proste zdanie: „To źródło spoza urzędów: media albo instytucja z naszej stałej listy.” oraz ostrzeżenie przy źródle („To nie jest źródło urzędowe…”).
- Siła podstawy z samej warstwy 2 najwyżej średnia, z jawną przesłanką `zrodlo_wtorne` („źródło spoza urzędów”).
- „Stan na” pokazuje czas pobrania strony.

### Przechowywanie, odtwarzalność, czas i koszt

- W rekordzie zostaje tylko cytat i metadane (jak dla korpusu), z tą samą retencją (`RETENTION_DAYS`). Pełny tekst strony nie jest zapisywany.
- Rekord jest trwały: ten sam adres `/r/<id>` pokazuje zawsze to samo. Przy `LIVE_LAYER=on` numer 6-godzinnego okna wchodzi do klucza rekordu: powtórne zgłoszenie tej samej treści w tym oknie korzysta z zapisanego rekordu, po oknie powstaje nowe sprawdzenie pod nowym adresem.
- Czas: limit zgłoszenia przy warstwie 2 to 24 s (`LIVE_DEADLINE_MS`), warstwa 2 ma własny limit (12 s na twierdzenie, mniej, gdy zostało mniej czasu). Po nim uczciwe „przerwałem i nic nie dodałem”, nigdy werdykt z domysłu. Błąd wyszukiwania lub sieci: ostrzeżenie i wynik tylko z warstwy 1.
- Koszt (zależność zewnętrzna: API Anthropic, narzędzie `web_search`): 10 USD za 1000 wyszukiwań (0,01 USD za wyszukiwanie, wg skilla claude-api, stan 2026-11-03) plus tokeny modelu wyszukującego (Claude Haiku 5.5: ok. 0,002 USD na wyszukiwanie) plus zwykła ocena fragmentów. Razem ok. 0,013 USD na twierdzenie bez odpowiedzi w korpusie. Koszt jest raportowany osobno w logu zdarzeń (`live_search`: `searches`, `searchFeeUsd`, `tokenCostUsd`) i wliczany do `usage.estimatedCostUsd` rekordu.

### Zestawy testowe

Przebiegi zestawu strojeniowego i kontrolnego v1 idą bez warstwy 2 (porównywalność; `npm run eval` domyślnie jej nie włącza). Dla kontrolnego v2 jest jeden przebieg z warstwą 2 na Claude Haiku 5.5 (`npm run eval -- --part kontrolny_v2 --live`, wyniki w `data/eval/results_live.json`, osobno od profilu omylności).
