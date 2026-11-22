# Źródła Mylika: trzy warstwy

Mylik (zespół Iteracja7) opiera odpowiedź na źródłach z jawnych list. Są trzy warstwy (trzecia: oceny redakcji sprawdzających fakty, niżej). Werdykt zależy wyłącznie od tego, co źródło mówi o twierdzeniu (stanowiska dowodów po bramkach), nigdy od domeny, wydawcy ani warstwy. Warstwa wpływa tylko na siłę podstawy („Na ile to pewne”).

## Warstwa 1: zamknięty zbiór urzędowy (korpus)

- Lista: `data/sources.json` (serwisy organów władzy publicznej, akty prawne, wybrane organizacje), teksty w `data/raw/`, indeks FTS5 w bazie.
- Zasady kwalifikowania, aktualizowania i wykluczania są zapisane przy każdym źródle w polu `policy` (`qualification`, `update`, `exclusion`). Aktualizacja: `npm run corpus:fetch`, potem `npm run corpus:ingest`; zmiana treści zmienia wersję korpusu, „stan na” to najnowsza data pobrania.
- Ta warstwa jest zawsze pytana pierwsza.
- Odtwarzalność: migawka tekstów (`data/raw/`, 733 dokumenty) jest w repozytorium, razem z sumami kontrolnymi `data/raw/SHA256SUMS`. Czysty klon buduje bez sieci ten sam korpus (`npm run corpus:ingest` wypisuje `version=cb62b4255ea0`). W repozytorium są tylko treści, które wolno przechowywać: informacja publiczna organów władzy, akty prawne, licencje otwarte (CC BY 4.0, EEAS); źródła bez licencji otwartej mają tylko krótki początek tekstu (`discovery.excerptChars`). Alternatywa (odtwarzanie z sieci) odrzucona jako metoda główna, bo strony się zmieniają, a wynik dla jury ma być powtarzalny. Odświeżenie z sieci (`npm run corpus:fetch`) jest opcjonalne, szanuje `robots.txt` i odstęp co najmniej 1,1 s na serwis; po nim sumy i wersja korpusu się zmieniają, a treści mogły się zmienić od migawki.
- Zbiór EUvsDisinfo (znane operacje informacyjne) nie jest w repozytorium (licencja niepotwierdzona, `data/known-ops/_terms.json`); bez niego system działa bez ostrzeżeń o znanych operacjach i bez błędu.

## Warstwa 2: media i instytucje (szukanie na żywo, zad. 29): EKSPERYMENTALNA

Włączana zmienną `LIVE_LAYER=on`. Domyślnie `off` w publicznej instancji i w pomiarach podstawowych; wtedy system działa jak dotąd. Wymaga dostawcy `anthropic`. Warstwę wolno włączyć tylko, gdy pomiar na zestawie kontrolnym v2 z nią ma trafność nie niższą niż bez niej, nie dodaje żadnego błędnego „fałszywe”, a mediana czasu jest poniżej 15 s (wyniki pomiarów: sekcja „Pomiary” niżej).

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

### Reguły doboru dowodów (zad. 29b, `src/live/select.ts`)

Ogólne reguły, bez strojenia pod przypadki testowe. Działają po ocenie i bramkach, tylko na dowodach z warstwy 2:

1. **Tylko potwierdza albo milczy.** Dowód z warstwy 2 może dać wyłącznie „potwierdzone” (siła najwyżej średnia) albo nic. Stanowiska „obala” i „opisuje to samo w innym kontekście” z tej warstwy odpadają, więc warstwa 2 nigdy nie daje „fałszywe” ani „wprowadzające w błąd”. Gdy w tej warstwie są naraz „potwierdza” i stanowisko przeciwne, warstwa milczy.
2. **Zgodność zdarzenia.** „Potwierdza” liczy się tylko, gdy strona dotyczy tego samego zdarzenia: każda nazwa własna z twierdzenia (wyraz z wielkiej litery poza początkiem zdania, porównanie rdzeniem mimo odmiany) występuje we fragmencie albo w tytule strony, a data lub okres z twierdzenia zgadza się z treścią albo z datą publikacji (dzień: ta sama data w tekście albo publikacja do 3 dni po niej; miesiąc: publikacja w tym miesiącu; rok: ten rok).
3. **Bez daty w twierdzeniu: najnowsza strona.** Zostają tylko dowody z najnowszej strony z datą publikacji, a odpowiedź pokazuje jej datę („Ta strona jest z …”).

Odrzucone dowody są liczone w logu (`live_search`, `status: odrzucone_regulami`, kody powodów: `nie_potwierdza`, `sprzeczne_w_warstwie`, `inne_nazwy`, `inna_data`, `starsza_strona`, `brak_daty_strony`).

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

### Pomiary (zestaw kontrolny v2, 176 przypadków, Claude Haiku 5.5)

| Przebieg | Silnik | Wariant | macro-F1 | Dokładność | Mediana czasu | Uwagi |
|---|---|---|---|---|---|---|
| zad. 29 | 8fbcebd776c7 | bez warstwy 2 | 0,733 | 72,4% | 7,8 s | |
| zad. 29 | 8fbcebd776c7 | z warstwą 2 (bez reguł doboru) | 0,706 | 68,4% | 8,1 s | 2 błędne werdykty z warstwy 2 (rozbieżność kontekstu → „wprowadzające w błąd”, „fałszywe”); 3 przekroczenia 24 s |
| zad. 29b | 2aeccd3da6f9 | bez warstwy 2 | 0,691 | 67,2% | 7,4 s | pomiar pośredni, nie końcowy |
| zad. 29b | 9b706cde662a | z warstwą 2 i regułami doboru | 0,716 | 71,3% | 8,0 s | 0 błędnych „fałszywe” z warstwy 2; warstwa 2 dała tylko dowody tła; sędzia cytowań: atrapa (oszczędność budżetu) |

Te przebiegi są historyczne (silniki sprzed zamrożenia). Końcowy silnik dd6f303f5e02 (zad. 35) mierzono tylko z wyłączoną warstwą 2 (v2: macro-F1 0,701, poprawność cytowań 79,7%, [MIERNIKI.md](MIERNIKI.md)); z warstwą 2 nie liczono go ponownie, a warstwa pozostaje wyłączona.

Ręczny test (mecz reprezentacji, 21.11.2026): przed regułami „fałszywe” na podstawie wcześniejszego, wrześniowego meczu (błąd); po regułach dowód przeciwny z warstwy 2 odpada i wynik to wstrzymanie się (11,7 s, 0,015 USD).

Wnioski: różnice F1 między przebiegami (0,69-0,73) mieszczą się w zmienności modelu między przebiegami; zestaw v2 dotyczy dokumentów korpusu, więc prawie nie sprawdza warstwy 2. Przekroczenia 24 s w pierwszym przebiegu (C03-C05) wynikały z zawieszonych wywołań modelu w kroku wyodrębniania twierdzeń (0-2 zakończone wywołania w 24 s; ten sam przypadek bez obciążenia: 8-17 s), nie z warstwy 2, która w nich nie wystartowała. Warstwa 2 zostaje domyślnie wyłączona do decyzji prowadzącego.

### Zestawy testowe

Przebiegi zestawu strojeniowego i kontrolnego v1 idą bez warstwy 2 (porównywalność; `npm run eval` domyślnie jej nie włącza). Dla kontrolnego v2 jest jeden przebieg z warstwą 2 na Claude Haiku 5.5 (`npm run eval -- --part kontrolny_v2 --live`, wyniki w `data/eval/results_live.json`, osobno od profilu omylności).


## Warstwa 3: oceny redakcji sprawdzających fakty (zad. 40, 21.11.2026)

Typ źródła `factcheck`, warstwa `weryfikacja_redakcji`. Dwa wejścia, ta sama tabela ocen i te same reguły doboru (`src/factcheck/layer.ts`, `selectReviewEvidence`).

### Wejście A: weryfikacje redakcji w zbiorze (nasze wyszukiwanie)

- Źródło w `data/sources.json` z polem `reviews.file` (plik JSONL, jedna weryfikacja w linii: `url`, `publisher`, `kind`, `title`, `claim`, `claimant`, `claimDate`, `rating`, `reviewDate`, `body`, `fetchedAt`). Wczytuje je `npm run corpus:ingest` (`src/corpus/reviews.ts`): teza (`claim`, dosłownie) to osobny fragment 0, uzasadnienie (`body`) dzielone jak reszta korpusu, ocena w tabeli `document_reviews`. Szukamy ich naszym wyszukiwaniem (podobieństwo słów), a nie dosłowną frazą jak indeks Google.
- **Stan:** pliku Demagoga nie ma. Serwis demagog.org.pl zwraca naszemu klientowi 403 (Cloudflare) na wszystkie ścieżki poza robots.txt, a nie obchodzimy zabezpieczeń; licencja Demagoga dopuszcza użycie niekomercyjne bez zmian z podaniem źródła, ale nagłówek `Content-Signal: ai-train=no, use=reference` i licencja niekomercyjna wymagają zgody na pełny korpus (ustalenia: `data/raw/demagog/LICENCJA.md`). Wpis źródła dodamy, gdy będzie plik i zgoda; mechanizm jest gotowy i przetestowany (`tests/corpus/reviews.test.ts`).
- W zbiorze są też wcześniej pobrane strony dwóch redakcji (Konkret24: 31 dokumentów, FakeNews.pl: 10) jako zwykłe dokumenty, bez metadanej oceny. Wyłącznik `corpusDirectFactcheck` w `data/factcheck.json` pozwala usunąć je ze ścieżki dowodowej (`use: false`: wyszukiwanie je pomija; wtedy 692 dokumenty, 15 domen, 3 typy źródeł). Domyślnie `use: true` (decyzja PM po odpowiedzi mentora z 21.11, 23:15).

### Wejście B: indeks Google Fact Check Tools (pomocnicze)

- Metoda `claims:search` (GET `https://factchecktools.googleapis.com/v1alpha1/claims:search`, parametry `query`, `languageCode=pl`, `pageSize`, klucz API). Odpowiedź: `claims[]` z polami `text` (sprawdzana teza), `claimant`, `claimDate`, `claimReview[]` (`publisher.name`, `publisher.site`, `url`, `title`, `reviewDate`, `textualRating`, `languageCode`). Dokumentacja: developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims/search (odczyt 21.11.2026).
- Indeks dopasowuje frazy dosłownie (bez podobieństwa; wskazanie mentora), więc pytamy go na żywo 3-5 krótkimi wariantami frazy z twierdzenia (po 1-3 słowa: nazwy własne, nazwa z liczbą, najdłuższe słowa treści, słowa kluczowe od modelu), najpierw bez filtra wydawcy, potem z `reviewPublisherSiteFilter` dla każdego włączonego wydawcy z listy. Łącznie najwyżej 8 zapytań na zgłoszenie (dzielone między twierdzenia), równolegle, ze wspólnym limitem czasu. Zebranych kandydatów szeregujemy naszym dopasowaniem (słowa i liczby twierdzenia w tezie i tytule), a o tym, czy to ta sama teza, rozstrzyga ocena modelu i wymóg zgodności zdarzenia, nie kolejność Google.
- Pamięć odpowiedzi API: tylko w pamięci procesu i tylko tak długo, jak pozwala nagłówek `Cache-Control` odpowiedzi (`max-age`; brak nagłówka, `no-store` albo `no-cache` = bez pamięci); najwyżej 500 odpowiedzi; nic na dysk (`src/factcheck/client.ts`).
- W rekordzie wyniku zostaje tylko minimum potrzebne do pokazania dowodu: wydawca, ocena redakcji, tytuł, adres publikacji, data weryfikacji, cytowana teza (i autor tezy, gdy indeks go podaje). **Rekord, którego dowody zawierają wpis z indeksu Google, żyje krótko: 24 godziny** (`FACTCHECK_RECORD_TTL_HOURS`, domyślnie 24; 0 = taki rekord nie jest zapisywany poza czasem odpowiedzi). Wygasanie leniwe: przy odczycie starszy rekord jest usuwany i traktowany jak nieistniejący (zdarzenie `record_expired`, przyczyna `wygasl`); ten sam tekst wysłany ponownie jest sprawdzany od nowa świeżym zapytaniem do indeksu. Polecenie czyszczenia (`npx tsx src/security/purge-cli.ts`) i godzinne czyszczenie serwera też je usuwają. W czasie życia WWW, SMS i inne kanały dostają ten sam zapisany rekord. Rekordy bez wpisów z indeksu: bez zmian (`RETENTION_DAYS`, domyślnie 30 dni).
- Warstwa działa równolegle z wyszukiwaniem w zbiorze, z własnym limitem czasu (6 s), dla każdego twierdzenia faktograficznego. Stron redakcji nie pobieramy: odpowiedź odsyła adresem z indeksu.
- Lista wydawców do audytu: `data/factcheck.json` (`publishers`, każdy z zasadą kwalifikacji, źródłem statusu i datą). Zasada: sygnatariusz Kodeksu Zasad IFCN albo zweryfikowany członek EFCSN, weryfikacje po polsku, domena adresu publikacji zgodna z listą (sprawdzana w kodzie, nie z pola nazwy). Włączony: Demagog (EFCSN od 25.05.2023). Wyłączone do potwierdzenia: Pravda (EFCSN od 23.02.2024, domena niepotwierdzona), AFP Sprawdzam (na liście EFCSN tylko AFP). Lista IFCN renderuje się skryptem i nie została odczytana.
- Warunki użycia: Google APIs Terms of Service (developers.google.com/terms): bez budowania własnej bazy z wyników i bez kopii dłuższej, niż pozwala nagłówek pamięci podręcznej; klucz nie trafia do kodu otwartego (tylko `.env`); wymagane oznaczenia autorstwa: podajemy wydawcę, ocenę i adres publikacji. W rekordzie zostaje tylko teza, ocena i adres (jak cytat), z retencją `RETENTION_DAYS`.

### Jak ocena redakcji staje się odpowiedzią

1. Model (istniejący krok oceny i bramka wsparcia) ocenia relację sprawdzanej tezy do twierdzenia użytkownika: ta sama teza = `potwierdza`, teza odwrotna = `obala`, inna okoliczność lub podobny temat = tło. Model nie widzi oceny redakcji, tytułu ani adresu.
2. Kod wymaga zgodności zdarzenia (nazwy własne z twierdzenia w tezie lub tytule, zgodna data lub okres; te same funkcje co w warstwie 2). Podobny temat ani sama domena nie wystarczą.
3. Ocena redakcji przechodzi przez jawną tabelę (`src/factcheck/ratings.ts`):

| Ocena redakcji (po normalizacji) | Etykieta tezy |
|---|---|
| prawda | potwierdzone |
| fałsz, nieprawda | fałszywe |
| manipulacja, częściowa prawda, częściowy fałsz, częściowo fałsz/prawda, brak kontekstu, zmanipulowane, wprowadza w błąd | wprowadzające w błąd |
| nieweryfikowalne, nie da się zweryfikować | brak wystarczających dowodów (tylko tło) |
| inna (nieznana) | tylko tło, bez rozstrzygnięcia |

   Teza odwrotna: prawda i fałsz zamieniają się miejscami; ocen pośrednich nie odwracamy (tło).
4. Uzasadnienie weryfikacji ze zbioru jest tylko tłem: rozstrzyga wyłącznie teza z oceną.
5. Odpowiedź zawsze przypisuje ocenę redakcji („Redakcja Demagog sprawdziła twierdzenie „…” i oceniła je jako „Fałsz”. Publikacja z DD.MM.RRRR.”) z adresem publikacji. Siła podstawy z samej oceny redakcji: najwyżej średnia (przesłanka „źródło spoza urzędów”); ze źródłem urzędowym może być wysoka.

### Awaria indeksu

Brak klucza (przy `FACTCHECK_LAYER=on`), błąd dostępu (400/401/403), limit (429), inny błąd HTTP, błąd sieci, przekroczenie czasu: nigdy werdykt ani „nie znaleziono”. Gdy zbiór rozstrzyga choć jedno twierdzenie, odpowiedź zostaje z dopiskiem „Nie udało mi się teraz sprawdzić indeksu Google…”. Gdy nie rozstrzyga, wynik to stan techniczny `awaria_techniczna` z komunikatem „Nie mogę teraz sprawdzić indeksu Google, w którym redakcje sprawdzające fakty publikują swoje oceny, z powodu błędu dostępu. … Spróbuj ponownie za kilka minut.” (bez rekordu). Zdarzenia w logu: `factcheck_search` (status, liczby, kod HTTP), `factcheck_unavailable`. Przełącznik: `FACTCHECK_LAYER=auto|on|off` (auto: włączony, gdy `GOOGLE_FACTCHECK_API_KEY` niepusty).


### Czego świadomie nie robimy

- **Nie pobieramy stron Demagoga.** Serwis blokuje automaty (Cloudflare, 403), w nagłówkach zastrzega TDM (`ai-train=no, use=reference`), a licencja treści jest niekomercyjna i bez przeróbek; pełny korpus wymaga zgody redakcji. Blokady nie obchodzimy (żadnych innych nagłówków, pośredników ani przeglądarek).
- **Nie budujemy bazy z treści indeksu Google.** Warunki Google APIs (pkt 5(e)) zabraniają budowania baz danych z treści API i trzymania kopii dłużej, niż pozwala nagłówek pamięci podręcznej. Skrypt masowego pobrania (`scripts/factcheck-index-pobierz.ts`) **wymaga pisemnej zgody wydawcy lub Google; nieużywany** (odmawia działania bez `--zgoda <sygnatura>`).
- **Zbiorczy plik ClaimReview Google** (storage.googleapis.com/datacommons-feeds/claimreview/latest/data.json, aktualizowany codziennie, 21.11.2026: 211 wpisów Pravdy z lat 2020-2024, Demagoga brak) zostaje poza zbiorem i poza wdrożeniem. Licencja CC BY 4.0 kompilacji jest podana tylko na archiwalnej kopii dawnej strony Data Commons (web.archive.org, migawka 10.11.2025); obecna strona (przekierowanie na toolbox.google.com/factcheck) jej nie podaje, a licencję każdego wpisu ma określać pole `sdLicense`, którego wpisy Pravdy nie mają. Bez jawnej licencji na żywej stronie i w rekordach nie włączamy.
- Droga docelowa: zgoda lub eksport od redakcji (Demagog: kontakt@demagog.org.pl) albo potwierdzenie licencji pliku zbiorczego (factcheck-support@google.com). To świadoma decyzja odpowiedzialności za źródła, a nie brak w funkcjach.

## Link do strony urzędu (zad. 43, 22.11.2026)

**Reguła:** odnośnik do strony z jawnej listy hostów urzędowych (`data/official-hosts.json`) może dostać etykietę „potwierdzone” z dosłownym cytatem z tej strony. To nie jest werdykt z domeny. Lista ustala tylko, że wydawca jest organem władzy publicznej albo instytucją publiczną (ta sama kwalifikacja co typ `urzedowe` w `data/sources.json`); o werdykcie decyduje dosłowna treść strony, przez te same bramki i tę samą tabelę reguł co każdy inny dowód (cytat dosłowny, bramka wsparcia, stanowiska `potwierdza` i `obala`).

### Co dokładnie jest potwierdzone

- Potwierdzone jest to, że **ta instytucja na tej stronie tak napisała** (cytat jest dosłownym podciągiem strony, przypisanym wydawcy z listy). Nie jest potwierdzone, że strona jest aktualna ani że wszystko, co na niej stoi, jest prawdą.
- To w praktyce **jedno źródło, które mówi o samym sobie**. Dlatego siła podstawy (`Na ile to pewne`) wynosi najwyżej „średnia”, także gdy strona jest świeża; brak daty publikacji i data starsza niż 24 miesiące obniżają ją jak przy każdym źródle.
- Gdy strona nie zawiera dosłownego cytatu rozstrzygającego (model nie znalazł zdania albo zdanie nie przeszło bramki), wynik jest taki jak bez strony: wstrzymanie się, nie „potwierdzone”.
- Strona jest tymczasowym dokumentem tego jednego sprawdzenia: nie trafia do zbioru źródeł ani do bazy dokumentów; w rekordzie zostaje tylko dowód (cytat, adres, wydawca, data pobrania) i pole `page`.

### Pierwszeństwo strony nad starszymi dokumentami (zad. 44)

Gdy twierdzenie pochodzi z wklejonej strony urzędu, werdykt wynika z dowodu z **tej** strony (`applyPagePrecedence`, `src/engine/officialPage.ts`):

- dosłowny cytat ze stanowiskiem „potwierdza” (po zwykłych bramkach) daje „potwierdzone”, siła według reguł dla pojedynczego źródła urzędowego (najwyżej „średnia”);
- dokumenty ze zbioru i oceny redakcji, które przeczą stronie, a są **starsze niż strona albo bez daty** (albo strona nie ma daty), stają się tłem (stanowisko `kontekst`, ograniczenie „Wcześniejsze komunikaty ... pokazuję jako tło”); nowszy komunikat urzędu zastępuje starszy;
- dokument **nowszy niż strona** i z nią sprzeczny nie zmienia etykiety po cichu: rekord dostaje uwagę „Nowsze źródło mówi inaczej: <wydawca>, <data>.”, siła spada o poziom, przesłanka `sprzeczne_zrodla`;
- fragmenty tej samej strony (także jej kopia pod tym samym adresem w zbiorze) nie przeczą zdaniu, które z nich pochodzi; twierdzenie bez dosłownego cytatu zostaje „brak wystarczających dowodów”, bez pokazywania sprzeczności. Zdanie urzędu nigdy nie dostaje „fałszywe” ani „wprowadzające w błąd” wyłącznie na podstawie starszych dokumentów.
- Dotyczy tylko samego adresu strony; pytanie z adresem w tekście zachowuje zwykłe reguły sprzeczności.

Treść strony urzędu to treść główna (`src/engine/fetch/content.ts`): jedyny `<article>`, element `id="main-content"`/`role="main"` albo `<main>`, bez okruszków, „Powrót”, „Udostępnij”, powiązanych artykułów i stopki; zwykłe strony (prasa) bez zmian. Data jako osobny akapit i krótkie akapity nagłówka nie wchodzą do fragmentów, więc cytat nie zaczyna się od daty (nadal jest dosłownym podciągiem). Data publikacji ma zapas dla układu „nagłówek artykułu, zaraz po nim element z samą datą DD.MM.RRRR”; inne daty w treści nie są brane. We wspólnej strefie urzędów (wpis `sufiks`, np. gov.pl) wydawcą jest organ z tytułu „<tytuł> - <organ> - <portal>”, gdy człon wygląda jak nazwa organu (Ministerstwo, Urząd, Kancelaria...); inaczej nazwa ogólna z listy. Krótka odpowiedź prowadzi pierwszym zdaniem potwierdzonym cytatem i przy kilku zdaniach pokazuje etykietę zbiorczą „[potwierdzone: N z M zdań z cytatem]”.

### Lista hostów (`data/official-hosts.json`)

Wpis to `{host, publisher, rule, basis}`; wersja 1 ma 19 wpisów (w tym `zus.pl`, `imgw.pl`, `policja.gov.pl`, sufiksy `gov.pl` i `europa.eu`) oraz listę `excluded` (redakcje i weryfikatorzy: `konkret24.tvn24.pl`, `tvn24.pl`, `fakenews.pl`, `demagog.org.pl`; agencja `pap.pl`; `eeas.europa.eu`; `portalpasazera.pl`, `kgsok.pl` do decyzji). Reguła wpisu (`rule`): `katalog` (domena wydawcy `urzedowe` albo `prawo` z `data/sources.json`), `sufiks` (cała strefa zarezerwowana dla organów: host równy wpisowi albo jego subdomena) i `instytucja` (instytucja spoza katalogu dodana ręcznie, z podstawą w `basis`). Przy sufiksie wydawca podawany w odpowiedzi to nazwa serwisu („Serwis gov.pl (organy administracji publicznej)”), bo z samego adresu nie wiadomo, który urząd pisał; nazwy urzędu nie bierzemy z treści strony, bo ta jest niezaufana. Wpis `excluded` wygrywa tylko jako bardziej szczegółowy. Redakcje i serwisy prasowe nigdy nie trafiają na listę (są w warstwie 2 i 3 albo poza zbiorem). Dodanie wpisu wymaga uzasadnienia kwalifikacji, jak przy każdym źródle.

### Ścisłe rozpoznanie adresu (`src/engine/officialHosts.ts`)

Adres jest czytany parserem WHATWG URL i musi mieć: schemat `https`, brak danych logowania (`user:haslo@`), port pusty albo 443, nazwę hosta (nie adres IP), tylko litery, cyfry i myślniki w etykietach oraz nienumeryczną końcówkę. Host musi być równy wpisowi albo być jego subdomeną (po kropce), więc `zus.pl.inny.host`, `zus.pl@inny.host`, `nie-zus.pl` i `zus.pl:8443` nie przechodzą. Host punycode (`xn--...`) jest porównywany w postaci znormalizowanej. Sprawdzany jest **host początkowy i końcowy po przekierowaniach**: strona, która po drodze wyszła poza listę (albo na nią weszła z obcego adresu), jest zwykłą stroną, nie urzędową. Treść musi być HTML (PDF, obraz i zwykły tekst z hosta urzędu nie dają dowodu; PDF dostaje osobny komunikat). Testy: `tests/engine/officialHosts.test.ts` (33), `tests/engine/officialPage.test.ts`.

### Wiek strony i treść niezaufana

- Data publikacji pochodzi z metadanych (`article:published_time`, `datePublished` w JSON-LD, `<time datetime>`) albo z elementu o klasie zawierającej „date” (bez dat modyfikacji, ważności i wydarzeń). Brak daty: uwaga „Nie znalazłem daty publikacji tej strony.” i niższa siła. Data starsza niż 180 dni od pobrania: uwaga „Ta strona pochodzi z DD.MM.RRRR; sprawdź, czy informacja jest nadal aktualna.” (w rekordzie jako `material_archiwalny`, w odpowiedzi i w SMS-ie).
- Treść strony to dane, nie polecenia. Akapit z poleceniem dla modelu odpada z dowodów (sygnał `strona:<kod>` w rekordzie i komunikat „Na tej stronie są polecenia dla mnie. Pominąłem je. Nie zmieniają wyniku.”), ukryty tekst HTML jest usuwany przed analizą, a cytat musi być dosłownym podciągiem pozostałej treści.

### Odpowiedź

Sam adres strony urzędu (bez pytania): pierwsze zdanie to „To oficjalny komunikat: <wydawca>.” (nie „Tak.”), potem „<Wydawca> podaje: «cytat»”, data publikacji, odnośnik do strony i etykieta „potwierdzone”. Adres razem z pytaniem: zwykła odpowiedź na pytanie („Tak.” albo „Nie.”), a strona jest jednym z dowodów. Każdy adres (także spoza listy) zapisuje w rekordzie opcjonalne pole `page` (`url`, `title`, `domain`, `publishedAt`, `fetchedAt`, `official`, `publisher`); dla adresu spoza listy SMS i Discord zaczynają się od zdania „Przeczytałem: «tytuł» (domena, data). To relacja, nie dokument źródłowy.”; werdykt jest wtedy liczony jak dotąd, strona nie jest dowodem. Rekordy sprzed zad. 43 (bez `page`) wczytują się bez zmian.

### Wdrożenie

`data/official-hosts.json` musi trafić na serwer razem z kodem (`scripts/deploy.sh` kopiuje dziś z plików konfiguracyjnych tylko `data/factcheck.json` i `data/live-sources.json`; do pętli `for f in ...` trzeba dopisać `data/official-hosts.json`). Bez pliku silnik wypisuje ostrzeżenie i działa bez tej funkcji (adres strony urzędu jest traktowany jak każdy inny adres).
