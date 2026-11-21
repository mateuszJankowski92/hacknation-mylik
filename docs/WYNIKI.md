# Wyniki testów (F7)

Pełne liczby, definicje mierników i ograniczenia pomiaru: [MIERNIKI.md](MIERNIKI.md). Tu tylko skrót i polecenia.

## Skrót: zestaw kontrolny v2 (czysty, 176 przypadków), Claude Haiku 5.5

Końcowy przebieg, 21.11.2026: silnik 2aeccd3da6f9, korpus cb62b4255ea0, bez drugiej warstwy i bez Basala, sędzia cytowań Claude Sonnet 5.5.

| Miernik | Wynik | Cel MVP |
|---|---|---|
| Trafność (macro-F1) | 0,673 (bez 27 wątpliwych: 0,708) | 0,75, niespełniony |
| Pokrycie cytowań | 100% (134/134) | 95%, spełniony |
| Poprawność cytowań (sędzia) | 73,8% (217/294) | 85%, niespełniony |
| Wstrzymanie się | 71,4% (15/21) | 80%, niespełniony |
| Odporność na prompt injection | 75% (6/8); osobny zestaw na żywym modelu 14/14 ([RYZYKA.md](RYZYKA.md)) | 90% |
| Stany techniczne | 4/4, 0 pozornych werdyktów | |
| Mediana czasu | 7,5 s (p90 9,9 s, maks. 12,7 s) | 30 s, spełniony |
| Koszt silnika | 0,38 USD na 100 testów | raportowany |
| Spójność kanałów (WWW i adapter SMS, w prototypie: symulator) | 4/5 par | 100%, niespełniony |

Rozrzut między przebiegami na v2 to co najmniej 0,06 macro-F1 (trzy przebiegi: 0,673-0,733).

## Jak odtworzyć

```bash
npm ci && npm run corpus:ingest      # korpus z migawki w repozytorium, version=cb62b4255ea0
npm test                             # testy jednostkowe i e2e, bez sieci i bez klucza
npm run eval -- --mock               # zestawy na atrapie: sprawdza przepływ, nie jakość; nadpisuje data/eval/results.json
git checkout data/eval/results.json  # przywrócenie naszych wyników z żywego modelu
npm run eval -- --part kontrolny_v2  # przebieg na żywym modelu (ANTHROPIC_API_KEY, płatny)
npm run injection:live               # próby prompt injection na żywym modelu (płatny, ok. 0,005 USD)
```

Dane: przypadki w `data/eval/cases.json` (strojeniowy, 60), `data/eval/control/cases.json` (v1, 30), `data/eval/control_v2/cases.json` (v2, 176). Wyniki naszych przebiegów z kosztem: `data/eval/results.json`, z drugą warstwą osobno `data/eval/results_live.json`. Ręczna kontrola cytowań: `data/eval/review_sample.md`.

Uczciwie: liczy się tylko zestaw v2, bo zestawy strojeniowy i v1 posłużyły do zmian w silniku. Wynik jednego przebiegu ma rozrzut ([MIERNIKI.md](MIERNIKI.md), „Ograniczenia”).
