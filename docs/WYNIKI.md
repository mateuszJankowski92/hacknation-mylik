# Wyniki testów (F7)

Pełne liczby, definicje mierników i ograniczenia pomiaru: [MIERNIKI.md](MIERNIKI.md). Tu tylko skrót i polecenia.

## Skrót: przebieg v2 po zad. 43 (22.11.2026, silnik 5ac946ffce1a, indeks weryfikacji wyłączony)

Zad. 43 dodało link do strony urzędu z listy hostów jako tymczasowy dowód (opis: [ZRODLA.md](ZRODLA.md), „Link do strony urzędu”). Zestaw v2 składa się ze zgłoszeń tekstowych, więc zmiana nie dotyka jego przypadków; przebieg sprawdza, że silnik się nie pogorszył. Jeden przebieg, Claude Haiku 5.5, `FACTCHECK_LAYER=off`, korpus cb62b4255ea0, sędzia Claude Sonnet 5.5, 01:07-01:16 UTC; bez strojenia.

| Miernik | Wynik | Poprzedni (108928016877) | Cel MVP |
|---|---|---|---|
| Trafność (macro-F1) | 0,691 (bez 27 wątpliwych 0,711) | 0,673 | 0,75, niespełniony |
| Poprawność cytowań (sędzia) | 79,8% (162/203) | 80,2% | 85%, niespełniony |
| Wstrzymanie się | 18/21 (85,7%) | 16/21 | 80%, spełniony |
| Odporność na prompt injection | 8/8 | 8/8 | 90%, spełniony |
| Mediana czasu | 7,5 s (p90 10,3 s) | 7,4 s | 30 s, spełniony |
| Koszt silnika | ok. 3,6 USD na 1000 zapytań (przebieg razem z sędzią 1,21 USD) | ok. 3,6 USD | raportowany |
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
| Koszt silnika | ok. 3,6 USD na 1000 zapytań | ok. 3,6 USD | raportowany |
| Spójność kanałów | 5/5 | 5/5 | 100% na 5 parach |

Rozrzut między przebiegami na v2: co najmniej 0,06 macro-F1. Profil omylności dotyczy silnika bez indeksu Google (dzienny limit API nieznany). Odpowiedzi z oceną redakcji (indeks na żywo): próby w [MIERNIKI.md](MIERNIKI.md): pełnym zdaniem indeks znajduje właściwą weryfikację w 1/14 pytań, naszymi wariantami fraz z rankingiem w 13/14; po regułach z 22.11 0 błędnych przypisań oceny redakcji w trzech próbach (34 pytania).

## Poprzedni skrót: zestaw kontrolny v2 (176 przypadków), Claude Haiku 5.5

Końcowy przebieg (zad. 35), 21.11.2026: silnik dd6f303f5e02 (zamrożony), korpus cb62b4255ea0, bez drugiej warstwy i bez Basala, sędzia cytowań Claude Sonnet 5.5. Zestaw v2 nie jest już w pełni "czysty": posłużył do jednej decyzji o progu wstrzymania ([MIERNIKI.md](MIERNIKI.md), "Wariant przy niskiej sile brak werdyktu"). To jeden przebieg, więc czytaj go razem z rozrzutem niżej.

| Miernik | Wynik | Cel MVP |
|---|---|---|
| Trafność (macro-F1) | 0,701 (bez 27 wątpliwych: 0,727) | 0,75, niespełniony |
| Pokrycie cytowań | 100% (121/121) | 95%, spełniony |
| Poprawność cytowań (sędzia) | 79,7% (169/212) | 85%, niespełniony |
| Wstrzymanie się | 71,4% (15/21) | 80%, niespełniony |
| Odporność na prompt injection | 100% (8/8, tylko 8 ataków); osobny zestaw na żywym modelu 14/14 ([RYZYKA.md](RYZYKA.md)) | 90%, spełniony |
| Stany techniczne | 4/4, 0 pozornych werdyktów | |
| Mediana czasu | 7,5 s (p90 10,3 s, maks. 13,2 s) | 30 s, spełniony |
| Koszt silnika | 0,36 USD na 100 testów; przebieg wszystkich zestawów ok. 2,00 USD (silnik + sędzia) | raportowany |
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

Dane: przypadki w `data/eval/cases.json` (strojeniowy, 71), `data/eval/control/cases.json` (v1, 30), `data/eval/control_v2/cases.json` (v2, 176). Wyniki naszych przebiegów z kosztem: `data/eval/results.json` (silnik dd6f303f5e02), z drugą warstwą osobno `data/eval/results_live.json` (starszy silnik 9b706cde662a, tylko do porównania; druga warstwa jest wyłączona). Ręczna kontrola cytowań: `data/eval/review_sample.md`.

Uczciwie: jako pomiar kontrolny liczy się zestaw v2, bo zestawy strojeniowy i v1 posłużyły do zmian w silniku (v2 do jednej decyzji o progu). Wynik jednego przebiegu ma rozrzut ([MIERNIKI.md](MIERNIKI.md), "Rozrzut i ograniczenia").
