# Mierniki zestawu testowego

`npm run eval` liczy mierniki z sekcji 6 wytycznych (kod: src/eval/metrics.ts) i zapisuje data/eval/results.json.

## Trzy zestawy

| Zestaw | Plik | Do czego |
|---|---|---|
| strojeniowy | data/eval/cases.json (71 przypadków; 60 pierwotnych + 11 pytań Q01-Q11 z zad. 35) | rozwój silnika i promptów; wyniki są "na danych strojeniowych" |
| kontrolny v1 | data/eval/control/cases.json (30 przypadków) | pisany osobno jako niezależny pomiar. **Od zadania 25 (21.11.2026) nie jest czysty**: posłużył do diagnozy etapów (liczby zbiorcze), na jej podstawie zmieniono ogólne reguły silnika i promptów. Wyniki na nim są odtąd "na danych użytych do diagnozy". Niezależny pomiar: zestaw kontrolny v2 (zad. 26). |
| kontrolny v2 | data/eval/control_v2/cases.json (176 przypadków, 27 oznaczonych `doubtful`) | pisany po zad. 25 bez wglądu w silnik, prompty i wyniki (rozkład: data/eval/control_v2/rozklad.md). Pomiar kontrolny: nie służył do strojenia silnika ani promptów; uruchamiany trzy razy (zad. 26, 29, 35), a w zad. 35 użyty do jednej decyzji o progu wstrzymania (sekcja "Przebieg zadania 35"). Źródło profilu omylności. |

`npm run eval -- --part strojeniowy|kontrolny|kontrolny_v2|oba|wszystkie` (domyślnie oba = strojeniowy i kontrolny v1; v2 tylko jawnie: `kontrolny_v2` albo `wszystkie`). W pliku wyników: `runs` (strojeniowy), `controlRuns` (kontrolny v1) i `controlV2Runs` (kontrolny v2), klucz to model. Przy przypadkach z polem `doubtful: true` przebieg zapisuje `doubtful` (lista, które błędne, mierniki i profil bez nich). `--corpus-root <katalog>` pozwala liczyć na zamrożonej kopii korpusu.

## Diagnostyka etapów

`npm run eval -- --diagnose --part kontrolny [--diag-out <plik>]` (kod: src/eval/diagnose.ts) uruchamia przypadki przez prawdziwy silnik ze śledzeniem etapów (`options.trace`), bez sędziego i bez zapisu results.json. Dla każdej pozycji z dokumentem wzorcowym (`goldDocs`) i etykietą rozstrzygającą liczy: (a) pozycję dokumentu wzorcowego w wynikach "za" i "przeciw" (top 5, 10, 20) i czy trafił do kandydatów oceny, (b) czy model ocenił go jako bez związku lub kontekst albo dał inne stanowisko, (c) czy bramka wsparcia odrzuciła właściwe stanowisko, (d) czy przy właściwym stanowisku reguły dały inną etykietę, oraz pierwszy etap błędu (także ekstrakcja: brak twierdzenia faktograficznego). Wynik to wyłącznie liczby zbiorcze; treść przypadków nie trafia do silnika ani promptów. `--no-rank` wyłącza wybór kandydatów przez model (porównanie A/B).

## Pozycja oceniana

Pozycja to teza z oczekiwanym werdyktem: całe zgłoszenie (`expected.verdict`) albo każda teza zgłoszenia złożonego (`expected.claims`, zob. docs/ETYKIETY.md). Przy jednej etykiecie bierzemy twierdzenie systemu najbliższe tekstowi zgłoszenia (także opinię, gdy to ona jest treścią zgłoszenia); przy wejściu URL porównujemy z treścią strony z przypadku, nie z adresem (poprawka z zad. 25). Teza zgłoszenia złożonego trafia do twierdzenia najlepiej dopasowanego: słowo kluczowe będące słowem lub jego odmianą (końcówka do 4 znaków) waży więcej niż początek dłuższego słowa, np. "euro" a "europejskiej" (poprawka z zad. 25; wcześniej brane było pierwsze pasujące twierdzenie).

## Mierniki

| Miernik | Licznik / mianownik |
|---|---|
| Trafność (macro-F1) | średnia F1 klas obecnych w etykietach; z pozycji. Stan techniczny zamiast werdyktu = błędna odpowiedź (osobna "klasa" przewidywana). Teza, której system nie wyodrębnił = `brak_tezy` (błąd). |
| Dokładność ogólna | przypadki w całości trafne / przypadki wykonane (przypadek złożony trafny, gdy każda teza trafna; przypadek ze stanem oczekiwanym trafny, gdy stan zgodny). |
| Pokrycie cytowań | tezy faktograficzne z werdyktem rozstrzygającym, które mają dosłowny cytat zgodny z werdyktem / wszystkie takie tezy. Z konstrukcji silnika bliskie 100%: silnik nie wyda takiego werdyktu bez cytatu. |
| Cytat dosłowny | cytaty rozstrzygające będące podciągiem fragmentu z bazy / wszystkie cytaty rozstrzygające. |
| Poprawność cytowania | cytaty rozstrzygające dosłowne i uznane przez sędziego / cytaty ocenione przez sędziego. Sędzia: inny model niż oceniany (Haiku i Opus ocenia Sonnet, Sonneta ocenia Opus), widzi twierdzenie, przypisaną relację, cytat, tytuł dokumentu i cały fragment. Jego kryterium i prompt (src/eval/judge.ts) są inne niż bramki wsparcia w silniku: bramka pyta "czy sam cytat rozstrzyga", sędzia "czy cytat w swoim otoczeniu uczciwie uzasadnia relację". Ręczna kontrola: data/eval/review_sample.json i czytelne review_sample.md (20 par z ostatniego przebiegu); oceny człowieka dla próbki z silnika dd6f303f5e02: data/eval/review_sample_human.json (osobny wiersz, nie zmienia miernika). |
| Wstrzymanie się | przypadki kategorii `brak_dowodow` zakończone werdyktem "brak wystarczających dowodów" / przypadki tej kategorii. |
| Fałszywe wstrzymania | przypadki z etykietą rozstrzygającą zakończone wstrzymaniem / przypadki z etykietą rozstrzygającą. |
| Odporność | ataki odparte (polecenie zignorowane i odnotowane w logu, nic nie wyciekło) / ataki. |
| Stany techniczne | przypadki awarii zakończone właściwym stanem / przypadki awarii; plus liczba pozornych werdyktów (ma być 0). |
| Spójność kanałów | ten sam tekst przez WWW i adapter SMS (w prototypie: symulator): zgodne werdykty i dokumenty dowodów / pary. Od zad. 35 liczona jak w produkcji: SMS idzie przez ten sam silnik i tę samą bazę rekordów (wspólna pamięć rekordów), a treść SMS ma inny zapis (bez polskich znaków, inne cudzysłowy i myślniki, powtórzona interpunkcja; `smsVariant` w src/eval/runner.ts). Wariant ścisły (`channelConsistencyStrict`) wymaga dodatkowo zgodnej odpowiedzi SMS (odsyłacz /r/<id>). |
| Powtarzalność bez pamięci rekordów | ten sam tekst liczony drugi raz na osobnej, pustej bazie: zgodne werdykty / pary (`repeatability`). Mierzy niedeterminizm modelu, nie spójność kanałów; dawniej oba efekty były zmieszane w jednym mierniku. |
| Mediana czasu, koszt | bez przypadków awarii; koszt silnika (wszystkie wywołania modelu, także bramka wsparcia) i sędziego osobno. |

## Profil omylności ("pomyliłem się X razy na Y")

- Źródło: **wyłącznie zestaw kontrolny v2** (gdy jego przebiegu brak: v1), przebieg modelu domyślnego (`errorProfile`, `errorProfileMeta` w results.json: `set` v1/v2, model, skrót wersji silnika, data). `errorProfileMeta.part` zostaje `kontrolny`, bo tego wymaga silnik (src/engine/errorProfile.ts). Do `errorProfile` trafiają tylko koszyki z co najmniej 20 tezami; pełne liczby są w przebiegu.
- Wersja silnika: SHA-256 plików src/engine, src/llm i src/contracts (src/engine/fingerprint.ts). Każda zmiana tych plików unieważnia profil.
- Serwer pokazuje zdanie o omylności tylko, gdy model serwera i wersja silnika zgadzają się z metadanymi, a w koszyku siły jest co najmniej 20 tez. Inaczej zdanie się nie pokazuje.
- Koszyk wyznacza siła podstawy, którą system przypisał swojej odpowiedzi.
- **Wstrzymanie się** to werdykt: liczy się w liczniku i mianowniku swojego koszyka. Trafne (oczekiwano "brak dowodów") to sukces, nietrafne to pomyłka.
- **Stan techniczny** (awaria, brak możliwości sprawdzenia) nie ma siły podstawy i obywatel nie widzi przy nim profilu, więc nie wchodzi do żadnego koszyka. Takie pozycje liczy się osobno (`errorProfileMeta.excluded`: stan techniczny, brak tezy) i podaje w raporcie.
- Przypadki z oczekiwanym stanem (np. awaria, doprecyzowanie) nie wchodzą do profilu.

## Pomiar zadania 25 (21.11.2026, korpus cb62b4255ea0, 733 dokumenty)

Diagnoza etapów na zestawie kontrolnym v1 przed zmianami (Claude Haiku 5.5, dwa przebiegi, 26 pozycji z dokumentem wzorcowym): dokument wzorcowy w kandydatach oceny 21-24/26 (w top 10 "za" 21-24/26); błędy wynikały głównie z ekstrakcji (zapowiedź uznana za prognozę, połączone tezy), stanowiska (rozbieżność a "obala") i bramki wsparcia zamieniającej rozbieżność na "obala" (3-4 pozycje). Wyszukiwanie nie było głównym ograniczeniem.

| Przebieg | macro-F1 | cytowania (sędzia) | fałszywe wstrzymania | mediana / maks. czasu | koszt silnika |
|---|---|---|---|---|---|
| Haiku, strojeniowy, przed | 0,772 | 85,1% | 3/35 | 6,6 / 19,8 s | $0,100 |
| Haiku, strojeniowy, po | 0,773 | 80,6% | 4/35 | 7,2 / 12,9 s | $0,205 |
| Haiku, kontrolny v1, przed | 0,671 | 89,6% | 3/21 | 9,9 / 27,1 s | $0,078 |
| Haiku, kontrolny v1, po | 0,669 | 71,6% | 5/21 | 8,3 / 13,9 s | $0,156 |
| Sonnet, kontrolny v1, przed | 0,600 | 100% | 7/21 | 11,6 / 26,7 s | $1,402 |
| Sonnet, kontrolny v1, po | 0,744 | 97,9% | 7/21 | 12,0 / 14,5 s | $3,057 |

Rozrzut między przebiegami tego samego silnika na Haiku jest duży (przebiegi diagnostyczne po zmianach: macro-F1 0,64-0,85), więc różnice poniżej około 0,08 nie są rozstrzygające. Spadek poprawności cytowań na Haiku dotyczy głównie dowodów "rozbieżność kontekstu" z szerszej puli kandydatów.

## Pomiar zestawu kontrolnego v2 (zad. 26, 21.11.2026)

Jeden przebieg, Claude Haiku 5.5 (model domyślny), silnik 78b3c7d689cf (ten sam co przebiegi "po" zad. 25), korpus cb62b4255ea0 (733 dokumenty, zamrożona kopia w katalogu tymczasowym, `--corpus-root`), sędzia Claude Sonnet 5.5, przebieg 17:00-17:10 UTC. Bez strojenia i bez powtórki. Wiersze strojeniowy i v1 to przebiegi "po" z zad. 25 (ten sam silnik).

| Zestaw | macro-F1 | pokrycie cytowań | poprawność cytowań (sędzia) | wstrzymanie się | odporność | fałszywe wstrzymania | mediana czasu | koszt silnik + sędzia |
|---|---|---|---|---|---|---|---|---|
| strojeniowy (60) | 0,773 (n=52) | 100% (38/38) | 80,6% (79/98) | 7/7 | 6/6 | 4/35 | 7,2 s | $0,205 + $0,248 |
| kontrolny v1, nieczysty (30) | 0,669 (n=34) | 100% (29/29) | 71,6% (58/81) | 3/4 | 2/2 | 5/21 | 8,3 s | $0,156 + $0,200 |
| **kontrolny v2, czysty (176)** | **0,688 (n=176)** | 100% (134/134) | 73,5% (208/283) | 14/21 (66,7%) | 6/8 (75%) | 20/136 | 7,7 s (p90 10,9, maks. 16,5 s) | $0,616 + $0,797 = $1,41 |
| v2 bez 27 wątpliwych | 0,718 (n=145) | 100% (112/112) | 77,2% (176/228) | 12/15 | 5/7 | 15/122 | 7,7 s | - |

Inne mierniki v2: dokładność ogólna 117/174, cytat dosłowny 283/283, stany techniczne 4/4 (0 pozornych werdyktów), spójność kanałów 4/5. F1 klas: potwierdzone 0,755, fałszywe 0,557, wprowadzające w błąd 0,623, brak dowodów 0,551, nie podlega weryfikacji 0,955. Koszt silnika na 100 testów: $0,36.

Koszyki siły podstawy (błędy/tezy), przebieg v2: wysoka 2/4, średnia 18/69, niska 24/49, brak 11/51; poza profilem 3 pozycje (2 stany techniczne, 1 teza niewyodrębniona). Profil omylności (koszyki >= 20 tez, w results.json): średnia 18/69, niska 24/49, brak 11/51. Koszyk "wysoka" (4 tezy) nie ma profilu. Bez wątpliwych: wysoka 2/4, średnia 14/59, niska 14/35, brak 9/44 (tylko do wglądu; silnik czyta profil z pełnego v2).

Przypadki wątpliwe (27): A04, A25, A28, A37, A38, A51, A52, A53, B04, B22, B31, B34, B37, C01, C02, C05, D10, D13, D14, D15, D16, D17, E04, I01, K08, K10, A58. Błędnych z nich 15: A25, A52, A53, B22, B31, B34, B37, C01, C02, C05, D14, D15, D17, I01, A58 (przy 57 błędnych przypadkach ogółem).

### Ograniczenia i uczciwość pomiaru

- Jeden przebieg. Rozrzut między przebiegami tego samego silnika na Haiku jest duży (zad. 25: macro-F1 0,64-0,85 na v1), na v2 (176 pozycji) mniejszy, ale nie zmierzony; różnic poniżej około 0,05 nie należy traktować jako rozstrzygających.
- Zestaw v1 posłużył w zad. 25 do diagnozy etapów i zmian ogólnych reguł silnika, więc jego wynik nie jest niezależny. Czysty jest tylko v2.
- Koszyk przewidywany w rozkład.md to założenie autora zestawu; koszyki w tabeli nadał silnik (np. "wysoka" tylko 4 tezy wobec ok. 40 przewidywanych).
- Etykiety v2 pisał jeden autor; 27 przypadków sam oznaczył jako wątpliwe. Wynik bez nich podany obok, nie zamiast.
- Profil z tego pomiaru był ważny tylko dla silnika 78b3c7d689cf; zastąpił go końcowy przebieg niżej.
- Cele MVP niespełnione na v2: macro-F1 (cel 0,75), poprawność cytowań (85%), wstrzymanie się (80%), odporność (90%).

## Końcowy przebieg zestawów (21.11.2026)

**Zastąpiony przebiegiem z zad. 35 (sekcja niżej, silnik dd6f303f5e02).** Ta sekcja zostaje jako punkt odniesienia "przed zad. 35".

Silnik z tego przebiegu: **2aeccd3da6f9** (commit 5953a4e; skrót src/engine, src/llm, src/contracts). Późniejsze commity do 2976b7a tych katalogów nie zmieniają. Claude Haiku 5.5 (model domyślny), bez drugiej warstwy (LIVE_LAYER=off), bez Basala, sędzia cytowań Claude Sonnet 5.5 na wszystkich cytatach (eval nie ma trybu próbki). Silnik uruchomiony z czystej kopii repozytorium w katalogu tymczasowym, korpus cb62b4255ea0 (733 dokumenty, ta sama zamrożona kopia co w zad. 26, `--corpus-root`). Jeden przebieg każdego zestawu, 17:47-18:03 UTC, bez strojenia.

| Zestaw | macro-F1 | pokrycie cytowań | poprawność cytowań (sędzia) | wstrzymanie się | odporność | mediana czasu (p90 / maks.) | koszt silnika na 100 testów | spójność kanałów |
|---|---|---|---|---|---|---|---|---|
| strojeniowy (60) | 0,732 (n=52) | 100% (42/42) | 72,7% (72/99) | 6/7 | 6/6 | 7,1 s (9,8 / 11,0) | $0,40 | 1/3 |
| kontrolny v1, użyty do diagnozy (30) | 0,697 (n=34) | 100% (32/32) | 74,6% (47/63) | 1/4 | 2/2 | 8,6 s (11,3 / 13,2) | $0,51 | 1/2 |
| **kontrolny v2, czysty (176)** | **0,673 (n=176)** | 100% (134/134) | **73,8% (217/294)** | 15/21 (71,4%) | 6/8 (75%) | 7,5 s (9,9 / 12,7) | $0,38 | 4/5 |
| v2 bez 27 wątpliwych | 0,708 (n=145) | 100% (116/116) | 76,9% (190/247) | 12/15 | 5/7 | 7,5 s | - | - |

Koszt przebiegu (silnik + sędzia): strojeniowy $0,211 + $0,252, v1 $0,154 + $0,168, v2 $0,651 + $0,819; razem $2,25 (plus ok. $0,06 na przerwany start na starszym silniku i próbę dwóch przypadków).

Inne mierniki v2: dokładność ogólna 115/174, cytat dosłowny 294/294, stany techniczne 4/4 (0 pozornych werdyktów), fałszywe wstrzymania 24/136. F1 klas: potwierdzone 0,766, fałszywe 0,567, wprowadzające w błąd 0,579, brak dowodów 0,541, nie podlega weryfikacji 0,913. Niespodziewany stan techniczny (prawdopodobnie limit czasu lub błąd wywołania modelu): v1 A05, C02; v2 A27. Spójność kanałów na strojeniowym i v1 liczona na 2-3 parach, więc to tylko sygnał.

**Profil omylności** (results.json, `errorProfileMeta`: set v2, model claude-haiku-5-5, silnik 2aeccd3da6f9, data 2026-11-21T18:02:57Z, koszyki >= 20 tez): średnia 13/64, niska 33/55, brak 11/52. Koszyk "wysoka" (1/3) się nie pokazuje. Poza profilem 2 stany techniczne. Bez wątpliwych (do wglądu): wysoka 0/2, średnia 10/56, niska 24/43, brak 7/42. Sprawdzone: `loadVerifiedErrorProfile` dla claude-haiku-5-5 i silnika 2aeccd3da6f9 zwraca te trzy koszyki, więc serwer pokaże zdanie o omylności.

Wątpliwe błędne (16 z 27, przy 59 błędnych ogółem): A25, A38, A52, A53, B04, B22, B31, B34, C01, C02, C05, D15, D17, I01, K08, A58.

### Rozrzut między przebiegami (v2, Haiku, bez drugiej warstwy)

| Przebieg | silnik | macro-F1 | poprawność cytowań | wstrzymanie się | odporność |
|---|---|---|---|---|---|
| zad. 26 | 78b3c7d689cf | 0,688 | 73,5% | 14/21 | 6/8 |
| zad. 29, warstwa wyłączona | 8fbcebd776c7 | 0,733 | 76,0% | 16/21 | 6/8 |
| końcowy | 2aeccd3da6f9 | 0,673 | 73,8% | 15/21 | 6/8 |

Zmiana 8fbcebd776c7 -> 2aeccd3da6f9 dotyczy tylko punktu doboru dowodów drugiej warstwy, który przy LIVE_LAYER=off nie działa; dwa ostatnie przebiegi to praktycznie ten sam silnik, a różnią się o 0,06 macro-F1. Rozrzut na v2 wynosi więc co najmniej 0,06 macro-F1 i ok. 2,5 pkt proc. poprawności cytowań. Wynik końcowy wypadł na dole tego zakresu.

### Ograniczenia i ocena wobec celów

- **macro-F1: cel 0,75 niespełniony.** Na czystym v2 0,67-0,73 w trzech przebiegach; żaden nie osiągnął 0,75. Najsłabsze klasy: brak dowodów, wprowadzające w błąd i fałszywe (mylone ze sobą: rozbieżność szczegółu a zaprzeczenie sedna).
- **Poprawność cytowań: cel 85% niespełniony.** 73-76% na wszystkich zestawach. Pokrycie cytowań (100%) i cytat dosłowny (100%) spełnione z konstrukcji silnika.
- Wstrzymanie się 71% (cel 80%) i odporność 75% (cel 90%) na v2 też poniżej celu; na mniejszych zestawach liczby są zbyt małe (4-8 przypadków), żeby je oceniać.
- Mediana czasu 7-9 s mieści się w celu 30 s; koszt silnika $0,38-0,51 na 100 testów.
- v2 był uruchamiany trzy razy (zad. 26, 29, 35), ale nie służył do zmian silnika ani promptów; do zad. 35 był pomiarem czystym, a w zad. 35 posłużył do jednej decyzji o progu (sekcja niżej). v1 nie jest czysty (diagnoza w zad. 25).
- Etykiety v2 pisał jeden autor; sędzia cytowań to model (Sonnet), nie człowiek. Ręczna ocena próbki: sekcja „Ręczny przegląd 20 par” niżej (inny silnik).
- Profil jest ważny tylko dla silnika 2aeccd3da6f9 i claude-haiku-5-5; każda zmiana src/engine, src/llm lub src/contracts go unieważni.


## Przebieg zadania 35 (21.11.2026): silnik dd6f303f5e02

Silnik **dd6f303f5e02** (skrót src/engine, src/llm, src/contracts; ostatnia zmiana w commicie fe5ef53) jest silnikiem do zamrożenia. Claude Haiku 5.5 (model domyślny), bez drugiej warstwy (`LIVE_LAYER=off`), sędzia cytowań Claude Sonnet 5.5 na wszystkich cytatach. Uruchomienie z czystego klonu repozytorium w katalogu tymczasowym, korpus cb62b4255ea0 (733 dokumenty, ta sama zamrożona kopia, `--corpus-root`), jeden przebieg każdego zestawu, 18:25-18:41 UTC, bez strojenia po przebiegu. Wyniki: data/eval/results.json, ręczna próbka cytowań: data/eval/review_sample.md.

| Zestaw | macro-F1 | poprawność cytowań (sędzia) | wstrzymanie się | odporność | fałszywe wstrzymania | spójność kanałów | powtarzalność bez pamięci rekordów | mediana czasu (p90 / maks.) | koszt silnik + sędzia |
|---|---|---|---|---|---|---|---|---|---|
| strojeniowy (71) | 0,799 (n=60) | 93,3% (83/89) | 7/7 | 6/6 | 9/43 | 3/3 | 3/3 | 7,2 s (9,5 / 13,5) | $0,204 + $0,240 |
| kontrolny v1, użyty do diagnozy (30) | 0,737 (n=34) | 84,8% (56/66) | 3/4 | 2/2 | 5/21 | 2/2 | 1/2 | 8,8 s (12,2 / 14,5) | $0,164 + $0,163 |
| **kontrolny v2 (176), użyty do jednej decyzji o progu wstrzymania** | **0,701 (n=176)** | **79,7% (169/212)** | 15/21 (71,4%) | 8/8 | 35/136 | 5/5 | 3/5 | 7,5 s (10,3 / 13,2) | $0,607 + $0,626 |
| v2 bez 27 wątpliwych | 0,727 (n=145) | 81,8% (144/176) | 13/15 | 7/7 | 30/122 | - | - | - | - |

Pokrycie cytowań i cytat dosłowny 100% na wszystkich zestawach (v2: 121/121 i 212/212). Inne mierniki v2: dokładność ogólna 118/174, stany techniczne 4/4 (0 pozornych werdyktów), koszt silnika na 100 testów $0,36. F1 klas v2: potwierdzone 0,825, fałszywe 0,690, wprowadzające w błąd 0,529, brak dowodów 0,506, nie podlega weryfikacji 0,955. Koszt końcowego przebiegu $2,00 (silnik + sędzia); razem z przebiegiem rozwojowym na zestawie strojeniowym ($0,43) zad. 35 kosztowało ok. $2,45.

**Wobec silnika 2aeccd3da6f9 (sekcja wyżej)** na v2: macro-F1 0,673 -> 0,701, poprawność cytowań 73,8% -> 79,7%, odporność 6/8 -> 8/8, spójność kanałów 4/5 -> 5/5, wstrzymanie się 15/21 bez zmian. Cena ostrzejszej bramki wsparcia: fałszywe wstrzymania 24/136 -> 35/136. Na zestawie strojeniowym (przebieg rozwojowy przed ostatnią poprawką fe5ef53: macro-F1 0,784, cytowania 89,8%) i v1 (0,697 -> 0,737) wynik także lepszy, ale oba zestawy nie są czyste. Nadal poniżej celów MVP na v2: macro-F1 (cel 0,75), poprawność cytowań (85%), wstrzymanie się (80%); odporność (90%) osiągnięta (8/8, ale tylko 8 ataków).

**Profil omylności** (results.json, `errorProfileMeta`: set v2, model claude-haiku-5-5, silnik dd6f303f5e02, data 2026-11-21T18:41:01Z, koszyki >= 20 tez): średnia 14/58, niska 12/43, brak 28/70. Koszyk "wysoka" (0/3) się nie pokazuje. Poza profilem 2 pozycje (1 stan techniczny, 1 teza niewyodrębniona). Bez wątpliwych (do wglądu): wysoka 0/2, średnia 8/48, niska 9/34, brak 24/60. Sprawdzone: `loadVerifiedErrorProfile` dla claude-haiku-5-5 i dd6f303f5e02 zwraca te trzy koszyki; dla innej wersji silnika zwraca null. Koszyk "niska" spadł z 33/55 do 12/43, więc zdanie o omylności przy niskiej sile podstawy jest teraz dużo bliższe prawdy niż w poprzednim profilu.

### Co zmieniło się w pomiarze

- **Spójność kanałów** jest mierzona jak w produkcji (wspólny silnik i baza rekordów, SMS w innym zapisie), a **powtarzalność bez pamięci rekordów** osobno. Poprzednio SMS liczył się na osobnej bazie, więc miernik porównywał dwa niezależne liczenia niedeterministycznego modelu (diagnoza: pkt 1 zad. 35). Realne luki, które naprawiono: klucz rekordu zależał od polskich znaków, cudzysłowów, myślników i powtórzonej interpunkcji; sam adres w SMS-ie szedł jako tekst; dwa jednoczesne identyczne zgłoszenia liczyły się dwa razy. Powtarzalność 3/5 na v2 i 1/2 na v1 pokazuje, że model bez pamięci rekordów nadal potrafi dać inny werdykt dla tego samego tekstu; dlatego rekord w bazie jest ważny dla spójności.
- **Zestaw strojeniowy ma 71 przypadków** (+11 pytań Q01-Q11): pytanie tak/nie ("Czy ...?", "czy to prawda, że", "podobno") jest traktowane jako twierdzenie do sprawdzenia, pytanie otwarte daje prośbę o doprecyzowanie z przykładem (docs/NIEOBSLUGIWANE.md).
- **v2 przestał być w pełni "czysty"**: użyty do jednej decyzji (wariant "przy niskiej sile brak werdyktu", niżej). Silnika ani promptów nie dostrajano na jego przypadkach; poprawki zad. 35 wynikały z diagnozy kanałów, przeglądu cytowań i błędów strojeniowego. Mimo to wynik v2 należy czytać jako "kontrolny, po jednej decyzji o progu", a nie jako dziewiczy pomiar.

### Spadek poprawności cytowań (pkt 3) i poprawka

Poprawność cytowań spadła w zad. 25 (strojeniowy 85,1% -> 80,6%, v1 89,6% -> 71,6%). Sędzia nie zmienił się od zad. 20 (judge.ts i przekazywany tytuł oraz fragment bez zmian), więc przyczyną był silnik z zad. 25: szersza pula i wybór kandydatów dały więcej cytatów "rozbieżność", a bramka wsparcia przepuszczała dowód przy samym zgodnym kierunku (za/przeciw). Na tym samym sędzi poprawność cytatów "rozbieżność" wynosiła 13/18 (zad. 20), 18/29 (po zad. 25), 13/36 (b4951b5); cytaty "obala" i "potwierdza" były stabilne (88-100%). Poprawka: bramka wymaga dokładnie tej samej relacji co ocena, a każda niezgoda oznacza, że słaby dowód odpada (wstrzymanie). Efekt: v2 73,8% -> 79,7%, strojeniowy 72,7% -> 93,3%, v1 74,6% -> 84,8%. Kosztem rośnie liczba fałszywych wstrzymań.

### Wariant "przy niskiej sile brak werdyktu" (pkt 4): nie wdrożony

Policzono bez nowych wywołań modelu, na wynikach b4951b5 (v2). Warunek wdrożenia: błędne werdykty rozstrzygające spadają o połowę, a macro-F1 nie spada o więcej niż 0,03. Wynik: błędne werdykty rozstrzygające 28 -> 14 (warunek spełniony), ale macro-F1 0,673 -> 0,585 (-0,088, warunek niespełniony). Wstrzymanie się 15/21 -> 17/21, fałszywe wstrzymania 24/136 -> 57/136, profil "niska" 33/55 -> 52/55; strojeniowy 0,732 -> 0,725, v1 0,697 -> 0,674. Decyzja wg reguły: zostawić bez zmian. Z 33 błędów koszyka "niska" 19 to wstrzymania "sprzeczne źródła" (potwierdza + rozbieżność), wszystkie błędne; ostrzejsza bramka z pkt 3 zmniejszyła ich liczbę (koszyk "niska" 12/43).

### Rozrzut i ograniczenia

- **Rozrzut między przebiegami** na v2 (ten sam silnik bez drugiej warstwy) wynosił co najmniej 0,06 macro-F1 (0,673-0,733). Pkt 6 zad. 35 usunął źródło zależne od kolejności (porcje oceny w stałej kolejności wyszukiwania), ale temperatura nie jest dostępna dla Haiku ani Sonneta 5.5 (odpowiedź 400), więc reszta to próbkowanie modelu. Różnic poniżej ok. 0,05 macro-F1 nie należy traktować jako rozstrzygających; wynik 0,701 to jeden przebieg.
- **Fałszywe wstrzymania 35/136 (25,7%)** to realny koszt: system częściej odmawia werdyktu, gdy dowód jest słaby. Najczęstszy błąd v2 to nadal wstrzymanie zamiast oczekiwanej etykiety (głównie "wprowadzające w błąd": recall 0,39).
- Spójność kanałów i odporność liczone na kilku parach (v1: 2, strojeniowy: 3, v2: 5; ataki: 2, 6, 8), więc to sygnał, nie dowód. Powtarzalność 3/5 na v2.
- Trzy stany techniczne z poprzedniego przebiegu (limit zapytań, niezgodna odpowiedź modelu) zniknęły dzięki ponowieniu i podziałowi porcji; w tym przebiegu nie było niespodziewanych stanów technicznych (v2 4/4, strojeniowy 5/5).
- Etykiety v2 pisał jeden autor; sędzia cytowań to model (Sonnet), nie człowiek. Ręczna ocena 20 par z tego przebiegu: sekcja „Ręczny przegląd 20 par” niżej.
- Klucz rekordu zawiera treść i wersję korpusu, ale nie wersję silnika. Przed wdrożeniem trzeba wyczyścić bazę produkcyjną (`scripts/deploy.sh --replace-db` lub src/security/purge-cli.ts), inaczej stare rekordy dla wejść bez polskich znaków dalej będą trafiane.
- Profil jest ważny tylko dla silnika dd6f303f5e02 i claude-haiku-5-5; każda zmiana src/engine, src/llm lub src/contracts go unieważni.


## Przebieg zadania 40 (21.11.2026): silnik 903c9bfb4b11

Silnik **903c9bfb4b11** (commity 7b71e5c, 4db5104, d5e9aee). Claude Haiku 5.5, sędzia cytowań Claude Sonnet 5.5 na wszystkich cytatach, bez drugiej warstwy (`LIVE_LAYER=off`), **indeks Google Fact Check Tools wyłączony** (brak klucza; eval wypisał „Indeks weryfikacji redakcji: wyłączony”), korpus cb62b4255ea0 (733 dokumenty, ten sam co w zad. 35; weryfikacji Demagoga w zbiorze brak). Uruchomienie z katalogu roboczego (nie z czystego klonu), jeden przebieg każdego zestawu, ok. 22:05-22:19 UTC, bez strojenia po przebiegu. Koszt: $0,44 + $0,29 + $1,19 = $1,93 (plus ok. $0,05 na przerwany start przed zmianą decyzji o źródłach i $0,05 na próby ręczne).

| Zestaw | silnik | macro-F1 | poprawność cytowań (sędzia) | wstrzymanie się | odporność | fałszywe wstrzymania | spójność kanałów | powtarzalność bez pamięci | mediana czasu (p90) |
|---|---|---|---|---|---|---|---|---|---|
| strojeniowy (71) | dd6f303f5e02 | 0,799 | 93,3% (83/89) | 7/7 | 6/6 | 9/43 | 3/3 | 3/3 | 7,2 s (9,5) |
| strojeniowy (71) | **903c9bfb4b11** | 0,796 | 92,1% (82/89) | 7/7 | 6/6 | 9/43 | 3/3 | 3/3 | 7,2 s (10,5) |
| kontrolny v1 (30) | dd6f303f5e02 | 0,737 | 84,8% (56/66) | 3/4 | 2/2 | 5/21 | 2/2 | 1/2 | 8,8 s (12,2) |
| kontrolny v1 (30) | **903c9bfb4b11** | 0,616 | 75,5% (40/53) | 2/4 | 2/2 | 8/21 | 2/2 | 1/2 | 8,3 s (11,5) |
| kontrolny v2 (176) | dd6f303f5e02 | 0,701 | 79,7% (169/212) | 15/21 | 8/8 | 35/136 | 5/5 | 3/5 | 7,5 s (10,3) |
| **kontrolny v2 (176)** | **903c9bfb4b11** | **0,691** | **81,7% (165/202)** | 16/21 | 8/8 | 38/136 | 5/5 | 4/5 | 7,5 s (10,9) |

Inne mierniki v2: pokrycie cytowań 106/106, cytat dosłowny 202/202, stany techniczne 4/4 (0 pozornych werdyktów), dokładność ogólna 116/174, koszt silnika na 100 testów $0,36; bez 27 wątpliwych macro-F1 0,704 (n=145).

**Profil omylności** (results.json, `errorProfileMeta`: set v2, claude-haiku-5-5, silnik 903c9bfb4b11, 2026-11-21T22:19:15Z): średnia 10/56, niska 15/38, brak 31/76; „wysoka” 0/4 bez profilu; poza profilem 1 stan techniczny i 1 teza niewyodrębniona.

### Co się zmieniło względem dd6f303f5e02 i dlaczego

- **Maskowanie:** imiona i nazwiska oraz kwoty z jednostką nie są już maskowane (wskazanie mentora: bez nich zmienia się sens pytania i nie da się znaleźć dowodu). Model widzi teraz nazwiska osób publicznych.
- **Siła podstawy:** ocena redakcji (warstwa `weryfikacja_redakcji`) liczy się jak jedno źródło urzędowe dla poziomu „średnia”, z limitem „średnia” przy podstawie wyłącznie z ocen redakcji. W tym przebiegu żadna ocena redakcji nie weszła do dowodów (brak klucza i brak danych Demagoga), więc zmiana nie działała.
- **Indeks weryfikacji, weryfikacje w zbiorze, forma odpowiedzi** (bezpośrednia odpowiedź, brakujący dokument): bez wpływu na etykiety w tym przebiegu; forma odpowiedzi zmienia tylko tekst.
- **Wynik:** na v2 macro-F1 0,701 -> 0,691 i poprawność cytowań 79,7% -> 81,7% mieszczą się w zmierzonym rozrzucie między przebiegami (co najmniej 0,06 macro-F1), więc nie świadczą ani o poprawie, ani o pogorszeniu. Spadek na v1 (0,737 -> 0,616) dotyczy 30 przypadków, w tym 3 przypadków więcej zakończonych wstrzymaniem (8/21 fałszywych wstrzymań); przy tej wielkości zestawu jeden przypadek to ok. 0,03-0,05 macro-F1, a v1 nie jest czysty. Nie badaliśmy, czy przyczyną jest brak maskowania nazwisk, czy losowość modelu.
- **Powtarzalność bez pamięci rekordów:** 2 z 10 par (v1 G02, v2 G05) różnią się, i w obu różnica to **liczba wyodrębnionych twierdzeń** (1 a 2), nie werdykt tego samego twierdzenia. To ten sam efekt co obserwacja z wdrożenia (raz 1, raz 2 twierdzenia). Haiku 5.5 nie przyjmuje parametru temperatury, więc wyodrębnianie jest losowe. Ustabilizować to bez strojenia pod przypadki można ogólnie: zapamiętywać wynik wyodrębniania po kluczu treści niezależnie od rekordu (spójność między czyszczeniami bazy, ale nie między instancjami) albo wyodrębniać dwa razy i brać tylko twierdzenia obecne w obu (podwójny koszt tego kroku, +1-2 s). Żadnego z wariantów nie wdrożono.

### Spadek na v1 (0,737 -> 0,616): diagnoza i powtórka (zad. 41)

- Na v1 zmienił wynik 6 przypadków z 30: A07, B04, C02, D01, D03, G01. Przyczyny: inny podział zgłoszenia na twierdzenia (C02, D01, G01), inne stanowisko oceny dla tego samego fragmentu (B04: „rozbieżność” -> „kontekst”; D01: nowy „rozbieżność”), inne wyszukiwanie po innym brzmieniu twierdzenia (A07: dokument FakeNews.pl nie trafił do kandydatów). Żadna zmiana zad. 40 nie zadziałała w tych przypadkach: w wynikach nie ma żadnego dowodu z warstwy ocen redakcji, w danych v1 nie było zamaskowanych nazwisk (0 wystąpień `[OSOBA]` w przebiegu dd6f303f5e02), indeks Google był wyłączony. To losowość modelu (Haiku 5.5 nie przyjmuje temperatury), więc nie ma poprawki specyficznej dla przypadków.
- Jedyna tania, ogólna zmiana: stały porządek wyników wyszukiwania przy równym `rank` (`ORDER BY rank, p.id`, commit 841cd48; silnik 30eb316e12e3). Powtórka v1 na tym silniku: **macro-F1 0,688**, poprawność cytowań 83,9% (52/62), wstrzymanie się 3/4, fałszywe wstrzymania 6/21, mediana 9,7 s, koszt $0,32. Trzy przebiegi v1 w jeden wieczór (0,737; 0,616; 0,688) dają rozrzut ok. 0,12 macro-F1 na 30 przypadkach, więc v1 nie pozwala ocenić zmian rzędu kilku punktów.
- W jednej instancji ten sam tekst dostaje zawsze ten sam zapisany wynik (rekord w bazie, wspólny dla WWW i SMS); rozrzut dotyczy tylko nowego liczenia bez pamięci rekordów (powtarzalność v1 w powtórce 0/2: obie pary różnią się liczbą lub brzmieniem twierdzeń).
- Profil omylności na serwerze nadal pochodzi z v2 dla silnika 903c9bfb4b11; po zmianie na 30eb316e12e3 serwer go nie pokaże do nowego przebiegu v2 (na samym końcu, raz).

### Próba na pytaniach w stylu scenariuszy mentora (14 pytań, data/eval/mentor_style_probe.json)

Pytania ułożone w zad. 40 na tematach weryfikacji **innej redakcji (Konkret24) z naszego zbioru**, nie na weryfikacjach Demagoga z dokumentu mentora (weryfikacji Demagoga nie mamy: brak danych w zbiorze i brak klucza do indeksu). Oczekiwana odpowiedź ustalona przez autora z tytułów artykułów, bez wglądu w wyniki; to próba zachowania, nie zestaw do strojenia. Rodzaje: fakt prosty (4), kontekst (4), rozbieżność liczb (3), brak dowodów (3). Żywy serwer z kopią bazy, 22:2x UTC, $0,04, mediana 6,5 s.

| Wynik | Liczba |
|---|---|
| bezpośrednia odpowiedź zgodna z oczekiwaną | 5/14 (2 „Nie.” z dowodem Konkret24, 3 trafne „Nie udało mi się tego potwierdzić.”) |
| wstrzymanie zamiast oczekiwanego „Nie.” lub „Częściowo.” | 9/14 |
| błędne „Tak.” albo „Nie.” | 0/14 |

Wniosek: przy braku weryfikacji z oceną w zbiorze system się wstrzymuje (z opisem potrzebnego dokumentu), zamiast zgadywać. Strony Konkret24 w zbiorze to głównie krótkie początki tekstu (licencja), bez metadanej oceny, więc rzadko dają rozstrzygający cytat. Zmierzyć zachowanie na weryfikacjach Demagoga będzie można dopiero z kluczem do indeksu Google albo z plikiem weryfikacji w zbiorze.

## Ręczny przegląd 20 par „twierdzenie i cytat” (silnik dd6f303f5e02)

Próbka: 20 par z przebiegu v2 zad. 35 (silnik **dd6f303f5e02**, plik data/eval/review_sample.json w commicie 0f32dbd; po zad. 40 eval losuje nowe pary z nowego silnika, więc ocena ręczna dotyczy tamtej wersji). Oceny: data/eval/review_sample_human.json (bez zmian treści). Oceniała jedna osoba z zespołu (właściciel), nie niezależny recenzent; próba mała.

| Ocena człowieka | Pary | z tego sędzia-model uznał |
|---|---|---|
| tak (w pełni uzasadnione) | 18 | 13 |
| częściowo (B15: brak daty przy słowie „obecnie”) | 1 | 1 |
| nie wiem (B17) | 1 | 0 |
| nie | 0 | - |

Zgodność z sędzią-modelem na tych samych parach: przy 18 parach uznanych przez człowieka sędzia odrzucił 5, czyli na tej próbce sędzia jest surowszy od człowieka. To osobny wiersz: główny miernik poprawności cytowań nadal liczy sędzia-model na całym zestawie.


## Próba na pytaniach w stylu mentora, indeks na żywo (22.11.2026, silnik df83667635c9)

18 pytań ułożonych w zad. 42 na weryfikacjach Demagoga z listopada 2026 **innych niż w dokumencie mentora** (fakt prosty 4, kontekst 4, parafraza 3, rozbieżność liczb 3, pytanie odwrotne do tezy 2) oraz 4 pytania bez pokrycia. Oczekiwana odpowiedź ustalona z oceny redakcji, zanim uruchomiono silnik. Indeks Google Fact Check Tools na żywo (klucz właściciela), Claude Haiku 5.5, kopia bazy, korpus cb62b4255ea0. **Mała próba (18 pytań), jeden przebieg; to sygnał, nie pomiar.** Dane: wyniki tylko w katalogu roboczym (wpisy indeksu nie trafiają do repozytorium).

| Miernik | Wynik |
|---|---|
| właściwa weryfikacja znaleziona: zapytanie pełnym zdaniem | 1/14 |
| właściwa weryfikacja znaleziona: krótkie warianty fraz + filtr wydawcy, nasz ranking (po poprawce wariantów) | 13/14 (we wszystkich na 1. miejscu naszego rankingu) |
| odpowiedź końcowa zgodna z oczekiwaną (pierwsza próba, przed poprawkami: uczciwa liczba tej próby) | **16/18** |
| odpowiedź końcowa zgodna z oczekiwaną (po poprawkach ogólnych; poprawki powstały po obejrzeniu tej próby) | 18/18 |
| błędne „Tak.” albo „Nie.” | 0/18 |
| mediana czasu zgłoszenia | 5,8 s |
| zapytania do indeksu na zgłoszenie | 8 (limit) |
| koszt modelu za całą próbę | ok. /bin/zsh,06 |

Wcześniejsza próba (zad. 40, 14 pytań na tematach Konkret24, indeks wyłączony): 5/14.

Poprawki ogólne po pierwszej próbie (bez reguł pod przypadki): (1) warianty fraz zachowują oznaczenia z cyfrą („F-16”, „CO2”) także bez nazw własnych i dodają początek zdania (podmiot z orzeczeniem); (2) teza z oceny redakcji nie przechodzi przez bramkę wsparcia („czy cytat sam rozstrzyga”), bo nie jest dowodem, tylko kandydatem na tę samą tezę; tożsamość tezy ustala ocena relacji i reguły w kodzie (nazwy, data, tabela ocen); bramka odrzucała poprawną parafrazę; (3) pytanie rozstrzygające rozpoznawane w dowolnym zdaniu zgłoszenia („Słyszałem, że X. Czy to prawda?”); (4) tabela ocen: „przerobione zdjęcie/wideo” -> fałszywe, „brakujący kontekst” -> wprowadzające w błąd; (5) pytanie „czy redakcja to sprawdzała” przy awarii indeksu mówi o błędzie dostępu.

Scenariusz J na żywo: proces z celowo złym kluczem (zmienna środowiskowa procesu, nie .env) dostaje od indeksu HTTP 400 (`odmowa_dostepu`); gdy zbiór nie rozstrzyga, wynik to stan `awaria_techniczna` z komunikatem o niedostępnym indeksie Google; gdy zbiór rozstrzyga, odpowiedź zostaje z dopiskiem o błędzie dostępu. Nigdy „nie znaleziono”.

### Świeża próba potwierdzająca (22.11.2026, silnik df83667635c9, bez zmian w kodzie)

16 nowych pytań na innych weryfikacjach (inne tematy; Demagog oraz jedna weryfikacja wyłącznie AFP Sprawdzam, wydawcy wyłączonego na liście), w tym 6 pułapek na błędne dopasowanie tezy (scenariusz I: ten sam temat i inna teza, ta sama osoba i inna wypowiedź, ta sama teza z inną liczbą, inna data, pytanie, którego weryfikacja nie rozstrzyga). Oczekiwanie przy pułapkach: wstrzymanie, nigdy „Tak/Nie” z przypisaniem redakcji. Mała próba, jeden przebieg, mediana 5,6 s, koszt ok. $0,05.

| Grupa | Zgodne | Błędne „Tak/Nie” | Wstrzymania zamiast odpowiedzi | Inne |
|---|---|---|---|---|
| pytania zwykłe (10) | 8 | 0 | 1 (F01: ocena znaleziona, model uznał ją za tło) | 1 (F08: pytanie uznane za opinię, „Nie da się tego sprawdzić”) |
| pułapki (6) | 5 (wstrzymania) | **1** (T01) | - | - |

**T01 (błędne przypisanie):** „Czy Ukraina płaci Orlenowi za paliwo z opóźnieniem ponad 90 dni?” dało „Tak.” z oceną Demagoga „Fałsz” dla tezy „Ukraina nie płaci Orlenowi za paliwo” (uznanej przez model za tezę odwrotną). Szczegół („opóźnienie ponad 90 dni”) zmienia tezę, a nazwy i data się zgadzały, więc reguły kodu jej nie odrzuciły. Pierwszy podejrzany: pominięcie bramki wsparcia dla tez z oceną redakcji (poprawka 2 po pierwszej próbie). Decyzja o zmianie należy do prowadzącego; do czasu decyzji kod bez zmian.

### Zmiana po T01 i próba 3 (22.11.2026, silnik 108928016877, commit 1f09998)

Decyzja prowadzącego (wariant a, wzmocniony): (1) teza odwrotna („obala”) wraca przez bramkę wsparcia, ta sama teza („potwierdza”) bez bramki; (2) reguła szczegółu w kodzie dla obu relacji: konkret ilościowy lub czasowy z pytania (liczba, data, okres, próg „ponad/powyżej/poniżej”, zakres „jedyny/pierwszy/wszyscy/każdy/nikt/żaden/najwięcej”), którego nie ma w tezie ani tytule wpisu redakcji, albo niezgodna data: ocena redakcji nie daje „Tak/Nie”, tylko wstrzymanie z blokiem „podobna sprawa” („Redakcja X sprawdziła podobne twierdzenie: „…” i oceniła je jako „…”, data, link. To nie rozstrzyga Twojego pytania wprost.”); (3) sprawdzana teza zawsze widoczna dosłownie, przy tezie odwrotnej „sprawdziła twierdzenie odwrotne do Twojego: „…””. Testy bez sieci na neutralnych danych.

| Próba (indeks na żywo, Haiku) | Pytania | Zgodne | Błędne „Tak/Nie” | Wstrzymania zamiast odpowiedzi |
|---|---|---|---|---|
| 1, pierwszy przebieg (przed poprawkami) | 18 | 16 | 0 | 1 |
| 1, po poprawkach ogólnych (silnik df83667635c9) | 18 | 18 | 0 | 0 |
| 2, świeża (df83667635c9), zwykłe | 10 | 8 | 0 | 1 |
| 2, świeża (df83667635c9), pułapki | 6 | 5 | **1 (T01)** | - |
| 1, po zmianie (108928016877) | 18 | 18 | 0 | 0 |
| 2, po zmianie, zwykłe | 10 | 7 | 0 | 2 (F01, F05) |
| 2, po zmianie, pułapki | 6 | 6 | 0 | - |
| **3, nowa (niewidziana), zwykłe** | 4 | 1 | 0 | 3 |
| **3, nowa (niewidziana), pułapki innego rodzaju niż T01** | 4 | 4 | 0 | - |

Po zmianie: 0 błędnych przypisań oceny redakcji w żadnej próbie; koszt to więcej wstrzymań. Przyczyny wstrzymań w próbie 3 (bez poprawek): G01 indeks nic nie zwrócił dla krótkich fraz; G02 właściwy wpis nie został uznany za tę samą tezę; G03 imię „Billa” w pytaniu, a w tezie tylko „Gatesa” (reguła nazw własnych). F05 w próbie 2 dostał dwie sprzeczne oceny relacji tej samej tezy (wstrzymanie „sprzeczne źródła”). F01 i F08 bez zmian (decyzja prowadzącego). Mediana czasu 5,8-6,7 s; koszt modelu trzech prób ok. $0,14. Małe próby, jeden przebieg każda: to sygnał, nie pomiar.

### Próba zmiany reguły nazw (22.11.2026, cofnięta)

Zmiana: zgodność nazw osób samym nazwiskiem (z odmianą), odrzucenie przy innym imieniu (commit 9edf4c8). Powtórka trzech prób: próba 1 17/18 zgodnych, 0 błędnych; próba 2 zwykłe 7/10, pułapki 5/6 z **1 błędnym „Tak.” z przypisaniem redakcji** (T04, inna data: dopasowany wpis o innej sprawie z 2024 r.); próba 3 zwykłe 2/4 (G03 naprawiony), pułapki 4/4. Zgodnie z decyzją prowadzącego zmiana cofnięta bez dalszych prób; nie ustalono, czy błąd T04 wynikał z tej zmiany, czy z losowości modelu (w poprzedniej powtórce T04 dał wstrzymanie). Obowiązuje reguła sprzed zmiany (wszystkie nazwy własne pytania we wpisie).

## Końcowy przebieg v2 (22.11.2026, silnik 108928016877, indeks wyłączony)

Claude Haiku 5.5, sędzia Claude Sonnet 5.5, korpus cb62b4255ea0, `FACTCHECK_LAYER=off`: dzienny limit zapytań Fact Check Tools API nie jest podany w oficjalnej dokumentacji, więc przebieg z indeksem (176 x ok. 8 zapytań) mógłby zjeść limit potrzebny jury. **Profil omylności dotyczy więc silnika bez indeksu**; z włączonym indeksem odpowiedzi z oceną redakcji mają osobny opis (próby wyżej). Jeden przebieg, ok. 23:25-23:38 UTC 21.11.

| Miernik | 108928016877 (ten przebieg) | dd6f303f5e02 (zad. 35) | 903c9bfb4b11 (zad. 40) |
|---|---|---|---|
| macro-F1 | 0,673 (bez wątpliwych 0,699) | 0,701 | 0,691 |
| poprawność cytowań (sędzia) | 80,2% (170/212) | 79,7% | 81,7% |
| pokrycie cytowań | 100% | 100% | 100% |
| wstrzymanie się | 16/21 | 15/21 | 16/21 |
| odporność | 8/8 | 8/8 | 8/8 |
| fałszywe wstrzymania | 43/136 | 35/136 | 38/136 |
| spójność kanałów | 5/5 | 5/5 | 5/5 |
| powtarzalność bez pamięci | 4/5 | 3/5 | 4/5 |
| mediana czasu (p90) | 7,4 s (9,8) | 7,5 s (10,3) | 7,5 s (10,9) |
| koszt silnika na 1000 zapytań | ok. $3,6 | ok. $3,6 | ok. $3,6 |

Profil omylności (results.json): średnia 7/48, niska 18/45, brak 35/75 (wysoka 1/6, za mały koszyk). Rozrzut między przebiegami na v2: co najmniej 0,06 macro-F1 (0,673-0,733 w pięciu przebiegach), więc różnice w tabeli nie są rozstrzygające; fałszywe wstrzymania rosną od zad. 35 (ostrzejsze reguły dla ocen redakcji nie działają przy wyłączonym indeksie, więc wzrost to głównie rozrzut).

### Blok „podobna sprawa” tylko przy zgodnych nazwach własnych (wiz_46)

Reguła w `src/factcheck/layer.ts` (`sharesProperNames`): tło z oceną redakcji, pokazywane bez „Tak/Nie”, zostaje tylko wtedy, gdy każda nazwa własna z twierdzenia (rdzeń jak w regułach nazw, z pominięciem różnic w znakach diakrytycznych) występuje w tezie lub tytule wpisu; inne miasto, instytucja lub osoba kończy się odrzuceniem wpisu (powód `podobna_inne_nazwy`). Bez nazw własnych w twierdzeniu zachowanie bez zmian. Reguły bezpośrednich odpowiedzi nie zostały poluzowane; zmiana może tylko ukryć tło. Testy bez sieci: `tests/factcheck/similar-names.test.ts`. Próba na żywo (6 zapytań, jeden przebieg, sygnał, nie pomiar): 2 odpowiedzi wprost bez zmian („Nie.” dla Warszawy i dla Orlenu), 2 pułapki z innym miastem (Kraków, Poznań; wpis o Wrocławiu lub Warszawie już się nie pokazuje), 2 bez pokrycia (wstrzymanie bez bloku). Znane ograniczenie: różne końcówki rdzenia (np. „w Polsce” i „Polska”) ukrywają blok, czyli błąd w stronę ostrożności.

## Przebieg v2 po zad. 44 (22.11.2026, silnik 5d88b017207b, indeks wyłączony)

Zmiana silnika: pierwszeństwo strony urzędu nad starszymi sprzecznymi dokumentami (tło), uwaga i niższa siła przy nowszym sprzecznym dokumencie, treść główna i data strony po tytule, wydawca z tytułu w strefie gov.pl, etykieta zbiorcza w krótkiej odpowiedzi ([ZRODLA.md](ZRODLA.md)). Zestaw v2 nie ma adresów; funkcję sprawdzają testy bez sieci (`tests/engine/officialPagePrecedence.test.ts`). Claude Haiku 5.5, sędzia Claude Sonnet 5.5, `FACTCHECK_LAYER=off`, korpus cb62b4255ea0 (733 dokumenty, kopia z HEAD 515bf18, `--corpus-root`), jeden przebieg. Koszt $0,633 + $0,631 = $1,26.

| Miernik | 5d88b017207b (ten przebieg) | 5ac946ffce1a |
|---|---|---|
| macro-F1 | 0,704 (bez wątpliwych 0,737, n=145) | 0,691 (0,711) |
| dokładność ogólna | 117/174 | 115/174 |
| poprawność cytowań (sędzia) | 79,8% (174/218) | 79,8% (162/203) |
| pokrycie cytowań, cytat dosłowny | 100% (119/119), 100% (218/218) | 100% |
| wstrzymanie się | 16/21 | 18/21 |
| odporność | 8/8 | 8/8 |
| fałszywe wstrzymania | 38/136 | 36/136 |
| spójność kanałów | 5/5 | 5/5 |
| powtarzalność bez pamięci | 3/5 | 2/5 |
| stany techniczne | 4/4, 0 pozornych | 4/4 |
| mediana czasu (p90) | 7,1 s (10,3) | 7,5 s (10,3) |

Profil omylności (results.json, `errorProfileMeta`: set v2, silnik 5d88b017207b): średnia 11/57, niska 11/39, brak 32/72; „wysoka” 1/6 bez profilu. Bez wątpliwych (do wglądu): wysoka 1/5, średnia 7/47, niska 6/30, brak 27/62. Różnice wobec 5ac946ffce1a mieszczą się w rozrzucie; zestaw v2 nie dotyka zmienionej ścieżki (adresy stron).

## Przebieg v2 po zad. 43 (22.11.2026, silnik 5ac946ffce1a, indeks wyłączony)

Zmiana silnika: link do strony urzędu z listy `data/official-hosts.json` jest tymczasowym dowodem (warstwa `strona_urzedu`, siła najwyżej „średnia”), z uwagą o wieku strony i ochroną przed poleceniami w treści; adresy spoza listy dostają pole `page` w rekordzie i zdanie otwierające w SMS-ie i Discordzie (opis: [ZRODLA.md](ZRODLA.md)). Zestaw v2 zawiera zgłoszenia tekstowe bez adresów, więc ten przebieg nie mierzy nowej funkcji, tylko to, że silnik nie stracił jakości. Funkcję sprawdzają testy bez sieci (`tests/engine/officialHosts.test.ts`, `officialPage.test.ts`, `pageDate.test.ts`, `tests/render/page.test.ts`) i jedna próba na żywo (niżej). Zestawu v2 nie użyto do strojenia.

Claude Haiku 5.5, sędzia Claude Sonnet 5.5, `FACTCHECK_LAYER=off`, korpus cb62b4255ea0 (733 dokumenty; kopia migawki z HEAD w katalogu tymczasowym, `--corpus-root`), uruchomienie z katalogu roboczego, jeden przebieg, 01:07-01:16 UTC. Koszt $0,616 + $0,597 = $1,21.

| Miernik | 5ac946ffce1a (ten przebieg) | 108928016877 |
|---|---|---|
| macro-F1 | 0,691 (bez wątpliwych 0,711, n=145) | 0,673 (0,699) |
| dokładność ogólna | 115/174 | - |
| poprawność cytowań (sędzia) | 79,8% (162/203) | 80,2% (170/212) |
| pokrycie cytowań, cytat dosłowny | 100% (116/116), 100% (203/203) | 100% |
| wstrzymanie się | 18/21 | 16/21 |
| odporność | 8/8 | 8/8 |
| fałszywe wstrzymania | 36/136 | 43/136 |
| spójność kanałów | 5/5 | 5/5 |
| powtarzalność bez pamięci | 2/5 | 4/5 |
| stany techniczne | 4/4, 0 pozornych | 4/4 |
| mediana czasu (p90) | 7,5 s (10,3) | 7,4 s (9,8) |

F1 klas: potwierdzone 0,774, fałszywe 0,702, wprowadzające w błąd 0,500, brak dowodów 0,523, nie podlega weryfikacji 0,955. Profil omylności (results.json, `errorProfileMeta`: set v2, silnik 5ac946ffce1a, 2026-11-22T01:16:32Z): średnia 13/57, niska 13/39, brak 30/74; „wysoka” 1/4 bez profilu; poza profilem 2 pozycje (1 stan techniczny, 1 teza niewyodrębniona). Bez wątpliwych (do wglądu): wysoka 1/3, średnia 7/47, niska 10/32, brak 26/62. `loadVerifiedErrorProfile` dla claude-haiku-5-5 i 5ac946ffce1a zwraca trzy koszyki.

Uczciwie: różnice wobec poprzedniego przebiegu mieszczą się w zmierzonym rozrzucie (co najmniej 0,06 macro-F1), więc nie świadczą o poprawie ani pogorszeniu. Cele MVP na v2 nadal niespełnione: macro-F1 (0,75) i poprawność cytowań (85%); wstrzymanie się (85,7%) i odporność (8/8) osiągnięte, ale na 21 i 8 przypadkach. Dwa przypadki techniczne (F01, H01) to przypadki, których system nie obsługuje (obraz, pętla moderatora).

### Próba na żywo: strona urzędu (zad. 43, jedna, sygnał, nie pomiar)

Lokalny serwer testowy na porcie 8797 (osobna kopia bazy), Haiku 5.5, indeks wyłączony, trzy adresy.

| Adres | Wynik |
|---|---|
| strona gov.pl (ustawa antymobbingowa, Ministerstwo Rodziny) | rozpoznana jako urzędowa (wydawca „Serwis gov.pl (organy administracji publicznej)”), data 05.11.2026 z klasy `event-date`; 4 twierdzenia, 3 „potwierdzone” z dosłownymi cytatami, siła „średnia”; 1 twierdzenie bez rozstrzygającego cytatu: wstrzymanie (tylko tło). Pierwsze zdanie: „To oficjalny komunikat: ...”. |
| strona zus.pl (ulga na start, objaśnienie z 1 stycznia 2022) | rozpoznana jako urzędowa (wydawca „Zakład Ubezpieczeń Społecznych”), 5 twierdzeń „potwierdzone” z cytatami; uwaga „Ta strona pochodzi z 01.01.2022; sprawdź, czy informacja jest nadal aktualna.”, siła „niska” (materiał starszy niż 24 miesiące); SMS mieści uwagę o wieku i zdanie „Sprawdziłem 5 twierdzeń. Tu pierwsze.”. |
| artykuł tvn24.pl (atak na rosyjski statek) | strona nieurzędowa (`official: false`), zero dowodów ze strony, wszystkie twierdzenia „brak wystarczających dowodów”; SMS zaczyna się od „Przeczytałem: «Pożar na rosyjskim statku po…» (tvn24.pl, 21.11.2026). To relacja, nie dokument źródłowy.” |

Wnioski z próby: (1) data strony z gov.pl wymagała reguły dla klasy `event-date` (tam to data publikacji; wyjątek dopisany w `src/engine/fetch/meta.ts`, inne klasy wydarzeń nadal są pomijane); (2) przy materiałach starszych niż 24 miesiące uwaga o materiale archiwalnym powtarza się przy każdym fragmencie (zachowanie istniejące, nie zmieniane); (3) przy sufiksie `gov.pl` wydawcą w odpowiedzi jest nazwa serwisu, nie urzędu.
