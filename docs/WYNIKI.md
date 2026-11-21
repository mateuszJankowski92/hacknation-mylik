# Wyniki testów (F7)

Pełne liczby, definicje mierników i ograniczenia pomiaru: [MIERNIKI.md](MIERNIKI.md). Tu tylko skrót i polecenia.

## Skrót: zestaw kontrolny v2 (czysty, 176 przypadków), Claude Haiku 5.5

<!-- DO UZUPEŁNIENIA: tabela z końcowego przebiegu v2 w docs/MIERNIKI.md -->
**[DO UZUPEŁNIENIA po końcowym przebiegu v2]**

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
