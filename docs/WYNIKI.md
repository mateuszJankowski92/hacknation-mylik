# Wyniki testów (F7)

Pełne liczby, definicje mierników i ograniczenia pomiaru: [MIERNIKI.md](MIERNIKI.md). Tu tylko skrót i polecenia. **Liczby z tej strony i z README.md mają jedno źródło: tabela poniżej.** Inne dokumenty podają te same wartości albo odsyłają tutaj.

## Przebieg na modelu instancji pokazowej (Claude Opus 5.5, 22.11.2026)

Jeden przebieg zestawu kontrolnego v2 (176 przypadków), 22.11.2026, 09:22-09:31, model `claude-opus-5-5`, sędzia cytowań Claude Sonnet 5.5, korpus cb62b4255ea0, konfiguracja instancji pokazowej: indeks ocen redakcji WŁĄCZONY (przebieg P3 na Haiku był bez indeksu, więc liczby nie są porównywalne jeden do jednego). Zapis: `data/eval/results_opus.json`. Polecenie: `npm run eval -- --model claude-opus-5-5 --part kontrolny_v2 --concurrency 6 --out data/eval/results_opus.json`.

| Miernik | Opus 5.5 (ten przebieg) | Cel z wytycznych | Haiku 5.5 (P3, tabela niżej) |
|---|---|---|---|
| Trafność (macro-F1) | 0,804 (bez 27 wątpliwych 0,840) | 0,75, spełniony | 0,661 |
| Dokładność ogólna | 138/174 | - | 110/174 |
| Pokrycie cytowań | 100% (142/142) | 95%, spełniony | 100% (117/117) |
| Poprawność cytowań (sędzia Sonnet) | 87,2% (198/227) | 85%, spełniony | 76,9% (170/221) |
| Cytat dosłowny | 97,8% (222/227) | 100%, niespełniony | - |
| Wstrzymanie się | 20/21 (95,2%) | 80%, spełniony na 21 przypadkach | 15/21 |
| Fałszywe wstrzymania | 19/136 (14,0%) | - | 39/136 |
| Odporność na prompt injection | 8/8 | 90%, spełniony na 8 atakach | 8/8 |
| Stany techniczne | 4/4, 0 pozornych werdyktów | - | 4/4 |
| Spójność kanałów | 5/5 par | 100% na 5 parach | 5/5 |
| Powtarzalność bez pamięci rekordów | 4/5 | - | 4/5 |
| Mediana czasu | 12,9 s (p90 17,2 s) | 30 s, spełniony | 7,5 s |
| Koszt silnika | 26,87 USD za przebieg, ok. 158 USD na 1000 zapytań | raportowany | 3,53 USD na 1000 |

Uczciwie: to jeden przebieg, a wynik jednego przebiegu ma rozrzut (na Haiku 0,66-0,73 między przebiegami). Zestaw ma 21 przypadków wstrzymania i 8 ataków, więc te dwa mierniki opierają się na małych liczbach. Cele spełnia dziś dopiero droższy model; tańszy (Haiku) zostaje poniżej celów trafności, cytowań i wstrzymania.

## Liczby, na które się powołujemy

Źródło: zapisane wyniki w `data/eval/` (`results.json` = przebieg P3, `results_second_check.json`) i sekcje [MIERNIKI.md](MIERNIKI.md). Zestaw kontrolny v2 (176 przypadków), Claude Haiku 5.5 (model domyślny), korpus cb62b4255ea0 (733 dokumenty), `FACTCHECK_LAYER=off`, `LIVE_LAYER=off`, `SECOND_CHECK=off`. Jeden przebieg, więc liczby mają rozrzut co najmniej 0,06 macro-F1 ([MIERNIKI.md](MIERNIKI.md), „Rozrzut”).

- **Przebieg P3** (źródło większości liczb): silnik **dc66dce5e77d** (silnik wdrażany), 22.11.2026, 03:48-03:57 UTC, sędzia cytowań Claude Sonnet 5.5 (standardowy sędzia dla Haiku), `data/eval/results.json`.
- **Przebieg P1**: silnik 5fcfd41a31ea, 22.11.2026, 02:27-02:36 UTC, sędzia cytowań Claude Opus 5.5 (poprzednio w `data/eval/results.json`; zapis w historii gita). Jedyne źródło poprawności cytowań wg sędziego Opus.
- **Przebieg P2**: silnik 5d88b017207b, 22.11.2026, sędzia cytowań Claude Sonnet 5.5 (commit 4d2670f). Tylko do poprawności cytowań z sędzią Sonnet.
- **Przebieg P0**: silnik dd6f303f5e02, 21.11.2026, sędzia Claude Sonnet 5.5; z niego pochodzi próbka 20 par oceniona ręcznie.

| Miernik | Wartość | Cel z wytycznych | Przebieg |
|---|---|---|---|
| Trafność (macro-F1) | 0,661 (bez 27 wątpliwych 0,688) | 0,75, niespełniony | P3 |
| Dokładność ogólna | 110/174 | - | P3 |
| Pokrycie cytowań | 100% (117/117) | 95%, spełniony (z konstrukcji silnika) | P3 |
| Poprawność cytowań, sędzia Opus | 87,0% (180/207) | 85%, spełniony (wg tego sędziego) | P1 |
| Poprawność cytowań, sędzia Sonnet | 76,9% (170/221) | 85%, niespełniony (wg tego sędziego) | P3 |
| Poprawność cytowań, ręczny przegląd 20 par | 18 w pełni, 1 częściowo, 1 bez rozstrzygnięcia (z 20) | - | P0 |
| Wstrzymanie się | 15/21 (71,4%) | 80%, niespełniony na 21 przypadkach | P3 |
| Fałszywe wstrzymania | 39/136 (28,6%) | - | P3 |
| Odporność na prompt injection | 8/8 | 90%, spełniony na 8 atakach | P3 |
| Stany techniczne | 4/4, 0 pozornych werdyktów | - | P3 |
| Spójność kanałów (WWW i adapter SMS, w prototypie: symulator) | 5/5 par | 100% na 5 parach, spełniony | P3 |
| Powtarzalność bez pamięci rekordów | 4/5 (w P1: 5/5, w P2: 3/5) | - | P3 |
| Mediana czasu | 7,5 s (p90 10,8 s) | 30 s, spełniony | P3 |
| Koszt silnika na 1000 zapytań | **3,53 USD** = 0,6223 USD / 176 przypadków x 1000 | raportowany | P3 |

Koszt przebiegu P3: silnik 0,6223 USD + sędzia Sonnet 0,6388 USD = 1,2611 USD (nie wlicza się ok. 0,04 USD na 7 przypadków przerwanego pierwszego startu). Koszt: inne przebiegi tego samego zestawu liczone tym samym wzorem (koszt silnika / 176 x 1000): 5fcfd41a31ea (P1) 3,46 USD, dd6f303f5e02 3,45 USD, 108928016877 3,52 USD, 5ac946ffce1a 3,50 USD, 5d88b017207b 3,60 USD. To wyniki innych przebiegów, nie inne wartości dla tej samej wersji. Starsze zapisy „ok. 3,6” i „ok. 3,7 USD” pochodziły z licznika `per100TestsUsd` (koszt dzielony przez 170 przypadków z pomiarem czasu, bez 6 przypadków bez wywołań modelu), więc wychodziły wyżej; zapisu „3,40” nie ma w zapisanych wynikach. Bez sędziego cytowań (działa tylko w pomiarach). Założenia i zakres: [KOSZTY.md](KOSZTY.md).

Silnik wdrażany ma skrót **dc66dce5e77d**, i na nim wykonano przebieg P3 (jeden przebieg, `SECOND_CHECK=off`, `FACTCHECK_LAYER=off`, `LIVE_LAYER=off`, korpus cb62b4255ea0 z kopii HEAD, `--corpus-root`). Profil omylności z P3 (silnik dc66dce5e77d, claude-haiku-5-5): średnia 11/52, niska 15/40, brak 34/75 (wysoka 2/7, za mały koszyk); lokalny serwer testowy zwraca go dla bieżącego silnika. Wobec P1 (5fcfd41a31ea; zmieniły się tylko zdarzenia postępu) macro-F1 spadło z 0,706 do 0,661, wstrzymanie się z 17/21 do 15/21 (2 przypadki), fałszywe wstrzymania z 33/136 do 39/136: różnica macro-F1 0,045 mieści się w znanym rozrzucie (co najmniej 0,06), ale 0,661 leży poniżej dotychczasowego zakresu 0,673-0,733, więc to jego dolny koniec, a nie poprawa ani wyraźna regresja. Poprawności cytowań (Sonnet 76,9% wobec Opus 87,0% w P1) nie porównuje się wprost, bo sędzia jest inny; wobec P2 (Sonnet, 79,8%) różnica 2,9 pkt proc. jest w zakresie rozrzutu ok. 2,5 pkt proc. i więcej.

### Poprawność cytowań: trzy oceny obok siebie

| Kto ocenia | Wynik | Przebieg i próba |
|---|---|---|
| Sędzia model: Claude Sonnet 5.5 | 76,9% (170/221) | P3, wszystkie cytaty rozstrzygające v2 (w P2: 79,8%, 174/218) |
| Sędzia model: Claude Opus 5.5 | 87,0% (180/207) | P1, wszystkie cytaty rozstrzygające v2 |
| Człowiek (jedna osoba z zespołu, właściciel) | 18 w pełni uzasadnionych, 1 częściowo (brak daty przy słowie „obecnie”), 1 bez rozstrzygnięcia (z 20 par) | P0, próbka 20 par ([MIERNIKI.md](MIERNIKI.md), „Ręczny przegląd”) |

Co to pokazuje: sędzia-model bywa surowszy od człowieka (na 20 parach sędzia Sonnet odrzucił 5 z 18 par uznanych przez człowieka), a dwaj sędziowie-modele dają różne wartości, więc jedna liczba procentowa zależy od sędziego. Czego nie dowodzi: 20 par i jeden oceniający to za mało na wartość dla całego zestawu, a trzy oceny pochodzą z różnych przebiegów i wersji silnika, więc nie są porównywalne wprost.

### Próby na pytaniach w stylu mentora (indeks redakcji na żywo)

Źródło: [MIERNIKI.md](MIERNIKI.md), „Próba na pytaniach w stylu mentora, indeks na żywo” i dalsze podsekcje. Haiku 5.5, jedno uruchomienie każdej próby, małe próby: sygnał, nie pomiar.

| Próba | Pytania | z tego pułapki | Błędne przypisanie oceny redakcji przed zmianą (df83667635c9) | po zmianie (108928016877) |
|---|---|---|---|---|
| 1 | 18 | brak danych | 0/18 | 0/18 |
| 2 | 16 | 6 | 1/16 (T01) | 0/16 |
| 3 (pytania niewidziane) | 8 | 4 | nie uruchamiana | 0/8 |
| **Razem** | **42** | **10** (6 + 4) | **1/34** (próby 1 i 2) | **0/42** |

„0 błędnych przypisań” znaczy więc 0 z 42 pytań po zmianie, z czego tylko 8 pytań (próba 3) powstało po obejrzeniu błędu i poprawek. Próba cofniętej zmiany reguły nazw dała 1 błędne przypisanie na te same 42 pytania (T04); zmianę cofnięto, obowiązuje reguła sprzed niej. Osobna próba z zad. 40 (14 pytań, indeks wyłączony, tematy Konkret24) miała 0 błędnych „Tak.”/„Nie.” na 14 i nie jest wliczona w 42.

### Próba parowana mocniejszego modelu

Pytanie: ile błędów Haiku naprawi mocniejszy model i ile dobrych odpowiedzi zepsuje. Punkt odniesienia: przebieg Haiku na v2 z chwili próby, P1 (silnik 5fcfd41a31ea, bez drugiej kontroli i bez warstwy żywej): 174 obsłużone przypadki, 120 zgodnych z etykietą, macro-F1 0,706. Pominięto 27 przypadków wątpliwych. Próba losowa z warstw wg etykiety (ziarno 56): 28 przypadków, w których Haiku się pomylił (pula 41), i 12, w których miał rację (pula 101). Bez sędziego cytowań, ustawienia domyślne poza modelem.

| Model | Naprawione błędy Haiku | Zepsute dobre odpowiedzi | Mediana czasu (Haiku na tych samych) | Koszt na przypadek (Haiku) |
|---|---|---|---|---|
| Claude Sonnet 5.5 | 15 z 28 (54%) | 1 z 12 (8%) | 10,3 s (7,9 s) | 0,0726 USD (0,0038 USD) |
| Claude Opus 5.5 | 9 z 11 (82%) | 1 z 5 (20%) | 13,7 s (7,6 s) | 0,1314 USD |

Opus przerwano po 16 przypadkach z tej samej listy (limit kosztu pomiaru), dlatego jego próba to 11 + 5. Koszt całej próby 5,01 USD (Sonnet 2,91 USD, Opus 2,10 USD).

Czego to nie dowodzi: próba jest mała i celowo przeważona błędami Haiku (28 z 41 w puli błędów, 12 ze 101 w puli dobrych odpowiedzi), więc nie daje wyniku na całym zestawie, nie rozstrzyga Sonneta kontra Opusa i nie pozwala oszacować odsetka zepsuć (1 z 12 i 1 z 5 to przedziały od kilku do kilkudziesięciu procent). Na przypadek Sonnet kosztuje ok. 19 razy więcej niż Haiku, a Opus ok. 35 razy (wobec kosztu Haiku na przypadkach Sonneta), a czas jest o 30-80% dłuższy. **Produkcja działa na Haiku.**

## Historia przebiegów (starsze skróty, kolejno od najnowszego)

Poniższe skróty zostają jako zapis historii. Wartości kosztu w nich liczono wzorem z tabeli wyżej; sędzia we wszystkich był Claude Sonnet 5.5.

## Skrót: przebieg v2 po zad. 44 (22.11.2026, silnik 5d88b017207b, indeks weryfikacji wyłączony)

Zad. 44: na ścieżce strony urzędu werdykt zdania ze strony wynika z cytatu z tej strony, a starsze sprzeczne dokumenty są tłem ([ZRODLA.md](ZRODLA.md), „Pierwszeństwo strony”). Zestaw v2 nie zawiera adresów, więc przebieg sprawdza brak pogorszenia. Jeden przebieg, Claude Haiku 5.5, `FACTCHECK_LAYER=off`, korpus cb62b4255ea0, sędzia Claude Sonnet 5.5; bez strojenia.

| Miernik | Wynik | Poprzedni (5ac946ffce1a) | Cel MVP |
|---|---|---|---|
| Trafność (macro-F1) | 0,704 (bez 27 wątpliwych 0,737) | 0,691 | 0,75, niespełniony |
| Poprawność cytowań (sędzia Sonnet) | 79,8% (174/218) | 79,8% | 85%, niespełniony |
| Wstrzymanie się | 16/21 (76,2%) | 18/21 | 80%, niespełniony |
| Odporność na prompt injection | 8/8 | 8/8 | 90%, spełniony |
| Mediana czasu | 7,1 s (p90 10,3 s) | 7,5 s | 30 s, spełniony |
| Koszt silnika na 1000 zapytań | 3,60 USD (0,633 USD / 176; przebieg razem z sędzią 1,26 USD) | 3,50 USD | raportowany |
| Spójność kanałów | 5/5 | 5/5 | 100% na 5 parach |
| Powtarzalność bez pamięci rekordów | 3/5 | 2/5 | - |
| Fałszywe wstrzymania | 38/136 | 36/136 | - |

Profil omylności (silnik 5d88b017207b, claude-haiku-5-5): średnia 11/57, niska 11/39, brak 32/72 (wysoka 1/6, za mały koszyk). Różnice mieszczą się w rozrzucie między przebiegami (co najmniej 0,06 macro-F1); wstrzymanie się 16/21 to 2 przypadki z 21. Warunki zatrzymania (trafność poniżej 0,62, odporność poniżej 8/8) nie zaszły.

## Skrót: przebieg v2 po zad. 43 (22.11.2026, silnik 5ac946ffce1a, indeks weryfikacji wyłączony)

Zad. 43 dodało link do strony urzędu z listy hostów jako tymczasowy dowód (opis: [ZRODLA.md](ZRODLA.md), „Link do strony urzędu”). Zestaw v2 składa się ze zgłoszeń tekstowych, więc zmiana nie dotyka jego przypadków; przebieg sprawdza, że silnik się nie pogorszył. Jeden przebieg, Claude Haiku 5.5, `FACTCHECK_LAYER=off`, korpus cb62b4255ea0, sędzia Claude Sonnet 5.5, 01:07-01:16 UTC; bez strojenia.

| Miernik | Wynik | Poprzedni (108928016877) | Cel MVP |
|---|---|---|---|
| Trafność (macro-F1) | 0,691 (bez 27 wątpliwych 0,711) | 0,673 | 0,75, niespełniony |
| Poprawność cytowań (sędzia) | 79,8% (162/203) | 80,2% | 85%, niespełniony |
| Wstrzymanie się | 18/21 (85,7%) | 16/21 | 80%, spełniony |
| Odporność na prompt injection | 8/8 | 8/8 | 90%, spełniony |
| Mediana czasu | 7,5 s (p90 10,3 s) | 7,4 s | 30 s, spełniony |
| Koszt silnika na 1000 zapytań | 3,50 USD (0,616 USD / 176; przebieg razem z sędzią 1,21 USD) | 3,52 USD | raportowany |
| Spójność kanałów | 5/5 | 5/5 | 100% na 5 parach |
| Powtarzalność bez pamięci rekordów | 2/5 | 4/5 | - |
| Fałszywe wstrzymania | 36/136 | 43/136 | - |

Profil omylności (silnik 5ac946ffce1a, claude-haiku-5-5): średnia 13/57, niska 13/39, brak 30/74 (wysoka 1/4, za mały koszyk). Zmiany wobec poprzedniego przebiegu mieszczą się w rozrzucie między przebiegami (co najmniej 0,06 macro-F1; powtarzalność 2/5 to losowość wyodrębniania twierdzeń, bez pamięci rekordów). Warunki zatrzymania zad. 43 (dokładność poniżej 0,62 albo odporność poniżej 8/8) nie zaszły. Pełne liczby: [MIERNIKI.md](MIERNIKI.md), „Przebieg v2 po zad. 43”.

## Poprzedni skrót: końcowy przebieg v2 (22.11.2026, silnik 108928016877, indeks weryfikacji wyłączony)

| Miernik | Wynik | Poprzedni (dd6f303f5e02) | Cel MVP |
|---|---|---|---|
| Trafność (macro-F1) | 0,673 (bez 27 wątpliwych 0,699) | 0,701 | 0,75, niespełniony |
| Poprawność cytowań (sędzia) | 80,2% (170/212) | 79,7% | 85%, niespełniony |
| Wstrzymanie się | 16/21 (76,2%) | 15/21 | 80%, niespełniony |
| Odporność na prompt injection | 8/8 | 8/8 | 90%, spełniony |
| Mediana czasu | 7,4 s (p90 9,8 s) | 7,5 s | 30 s, spełniony |
| Koszt silnika na 1000 zapytań | 3,52 USD (0,620 USD / 176) | 3,45 USD (dd6f303f5e02) | raportowany |
| Spójność kanałów | 5/5 | 5/5 | 100% na 5 parach |

Rozrzut między przebiegami na v2: co najmniej 0,06 macro-F1. Profil omylności dotyczy silnika bez indeksu Google (dzienny limit API nieznany). Odpowiedzi z oceną redakcji (indeks na żywo): próby w [MIERNIKI.md](MIERNIKI.md): pełnym zdaniem indeks znajduje właściwą weryfikację w 1/14 pytań, naszymi wariantami fraz z rankingiem w 13/14; po regułach z 22.11 0 błędnych przypisań oceny redakcji na 42 pytaniach w trzech próbach (przed zmianą 1 z 34; szczegóły w tabeli „Próby na pytaniach w stylu mentora” wyżej).

## Poprzedni skrót: zestaw kontrolny v2 (176 przypadków), Claude Haiku 5.5

Końcowy przebieg (zad. 35), 21.11.2026: silnik dd6f303f5e02 (wtedy uznany za końcowy; późniejsze zadania zmieniły skrót), korpus cb62b4255ea0, bez drugiej warstwy i bez Basala, sędzia cytowań Claude Sonnet 5.5. Zestaw v2 nie jest już w pełni "czysty": posłużył do jednej decyzji o progu wstrzymania ([MIERNIKI.md](MIERNIKI.md), "Wariant przy niskiej sile brak werdyktu"). To jeden przebieg, więc czytaj go razem z rozrzutem niżej.

| Miernik | Wynik | Cel MVP |
|---|---|---|
| Trafność (macro-F1) | 0,701 (bez 27 wątpliwych: 0,727) | 0,75, niespełniony |
| Pokrycie cytowań | 100% (121/121) | 95%, spełniony |
| Poprawność cytowań (sędzia) | 79,7% (169/212) | 85%, niespełniony |
| Wstrzymanie się | 71,4% (15/21) | 80%, niespełniony |
| Odporność na prompt injection | 100% (8/8, tylko 8 ataków); osobny zestaw na żywym modelu 14/14 ([RYZYKA.md](RYZYKA.md)) | 90%, spełniony |
| Stany techniczne | 4/4, 0 pozornych werdyktów | |
| Mediana czasu | 7,5 s (p90 10,3 s, maks. 13,2 s) | 30 s, spełniony |
| Koszt silnika | 0,36 USD na 100 testów (3,45 USD na 1000 = 0,607 USD / 176 x 1000); przebieg wszystkich zestawów ok. 2,00 USD (silnik + sędzia) | raportowany |
| Spójność kanałów (WWW i adapter SMS, w prototypie: symulator) | 5/5 par (powtarzalność bez pamięci rekordów 3/5) | 100%, spełniony na 5 parach |
| Fałszywe wstrzymania | 35/136 (25,7%) | koszt ostrzejszej bramki wsparcia |

Wobec poprzedniego silnika (2aeccd3da6f9) na v2: macro-F1 0,673 -> 0,701, poprawność cytowań 73,8% -> 79,7%, odporność 6/8 -> 8/8, spójność kanałów 4/5 -> 5/5; fałszywe wstrzymania 24/136 -> 35/136.

Profil omylności (pokazywany obywatelowi, tylko dla silnika dd6f303f5e02 i claude-haiku-5-5): pomyłki na liczbę tez: siła średnia 14/58, niska 12/43, brak 28/70 (koszyk "wysoka", 0/3, jest za mały, żeby go pokazać).

Uczciwie: nadal poniżej celów MVP na v2 są trafność, poprawność cytowań i wstrzymanie się. Rozrzut między przebiegami na v2 to co najmniej 0,06 macro-F1 (poprzednie przebiegi: 0,673-0,733), więc różnic poniżej ok. 0,05 nie należy uznawać za rozstrzygające. Odporność i spójność kanałów liczono na 8 i 5 przypadkach, więc to sygnał, nie dowód. Etykiety v2 pisał jeden autor, a sędzia cytowań to model, nie człowiek.

## Jak odtworzyć

```bash
npm ci && npm run corpus:ingest      # korpus z migawki w repozytorium, version=cb62b4255ea0
npm test                             # testy jednostkowe i e2e, bez sieci i bez klucza
npm run eval -- --mock               # zestawy na atrapie: sprawdza przepływ, nie jakość; nadpisuje data/eval/results.json
git checkout data/eval/results.json  # przywrócenie naszych wyników z żywego modelu
npm run eval -- --part kontrolny_v2  # przebieg na żywym modelu (ANTHROPIC_API_KEY, płatny)
npm run injection:live               # próby prompt injection na żywym modelu (płatny, ok. 0,005 USD)
```

Dane: przypadki w `data/eval/cases.json` (strojeniowy, 71), `data/eval/control/cases.json` (v1, 30), `data/eval/control_v2/cases.json` (v2, 176). Wyniki naszych przebiegów z kosztem: `data/eval/results.json` (ostatni przebieg v2, silnik dc66dce5e77d, przebieg P3 z tabeli „Liczby, na które się powołujemy”), z drugą kontrolą osobno `data/eval/results_second_check.json` (silnik dc66dce5e77d, druga kontrola włączona w tym pomiarze, na produkcji wyłączona), z drugą warstwą źródeł osobno `data/eval/results_live.json` (starszy silnik 9b706cde662a, tylko do porównania; druga warstwa jest wyłączona). Ręczna kontrola cytowań: `data/eval/review_sample.md`.

Uczciwie: jako pomiar kontrolny liczy się zestaw v2, bo zestawy strojeniowy i v1 posłużyły do zmian w silniku (v2 do jednej decyzji o progu). Wynik jednego przebiegu ma rozrzut ([MIERNIKI.md](MIERNIKI.md), "Rozrzut i ograniczenia").
