# Modele i dostawcy

Stan na 21.11.2026. Szczegóły zależności (klucze, co trafia, awaria, wymiana): [ZALEZNOSCI.md](ZALEZNOSCI.md).

| Dostawca / model | Rola | Domyślnie | Jak włączyć |
|---|---|---|---|
| Claude Haiku 5.5 (`claude-haiku-5-5`, API Anthropic) | wszystkie kroki modelu: twierdzenia, kandydaci, ocena, bramka wsparcia | **tak** | `LLM_PROVIDER=anthropic`, `ANTHROPIC_MODEL` pusty |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | to samo, dokładniej i drożej; w pomiarach także sędzia cytowań | nie | `ANTHROPIC_MODEL=claude-sonnet-5-5` |
| Atrapa (`mock`) | testy i pokaz bez klucza i sieci; proste reguły, nie prawdziwa ocena | wartość domyślna w `src/config.ts`; `.env.example` też ustawia `mock` | `LLM_PROVIDER=mock` |
| Druga warstwa źródeł (Haiku + narzędzie `web_search`) | szukanie na zamkniętej liście serwisów, gdy korpus nic nie rozstrzyga | nie (**eksperymentalna**) | `LIVE_LAYER=on` (opis: [ZRODLA.md](ZRODLA.md)) |
| Basal (polski model decyzyjny, Apache-2.0, własna maszyna GPU) | bramka wsparcia; opcjonalnie ocena stanowisk | nie | `SUPPORT_GATE_PROVIDER=basal`, `BASAL_URL`, `BASAL_TOKEN` |
| Jev (TypeSafe AI, `jev-1.14.0`, API w USA) | bramka wsparcia | nie | `SUPPORT_GATE_PROVIDER=jev`, `JEV_API_KEY` |

Ceny (USD za 1 mln tokenów wejścia / wyjścia, `src/llm/pricing.ts`, cennik z 03.11.2026): Haiku 5.5 0,10 / 0,50; Sonnet 5.5 2 / 10.

## Dlaczego Haiku

Najtańszy, mieści się w limicie czasu. W pomiarze zad. 25 na zestawie kontrolnym v1 Sonnet miał lepsze cytowania (97,9% wobec 71,6% u Haiku), ale koszt około 20 razy wyższy i dłuższy czas. Po poprawce bramki wsparcia (zad. 35, silnik dd6f303f5e02) Haiku ma na v1 84,8%, a na v2 79,7% poprawności cytowań, macro-F1 0,701 i mediana czasu 7,5 s ([MIERNIKI.md](MIERNIKI.md)); to nadal poniżej celów MVP (0,75 i 85%). Wybór modelu to jedna zmienna, bez zmian w kodzie.

## Basal: stan uczciwie

- Ścieżka wymiany dostawcy jest gotowa: interfejs `SupportGate` (`src/engine/supportGate.ts`), klasa `src/llm/basal.ts`, ocena `src/llm/basalAssess.ts`, pomiar `scripts/eval-basal.ts`.
- Przetestowana tylko na atrapie serwera (testy w `tests/llm`, bez sieci).
- Wyniki na żywym modelu: **pomiar niewykonany: brak uruchomionej maszyny**. Nie podajemy trafności ani kosztu Basala.
- Domyślnie wyłączony. Przy awarii Basala to samo pytanie ocenia Haiku. Obywatel nie dostaje z tego powodu stanu technicznego.

## Jev: stan uczciwie

- Ścieżka gotowa: `src/llm/jev.ts` (ten sam interfejs `SupportGate`). Przetestowana tylko na atrapie `fetch` (`tests/llm/jev.test.ts`, bez sieci).
- Wyniki na żywym modelu: **pomiar niewykonany: brak klucza `JEV_API_KEY`**. Nie podajemy trafności, kosztu ani opóźnienia Jeva.
- Domyślnie wyłączony. Przy błędzie albo niskiej pewności Jeva to samo pytanie ocenia Haiku.

## Wymiana dostawcy

Każdy krok modelu idzie przez interfejsy `LlmProvider` i `SupportGate` (`src/contracts/llm.ts`, `src/engine/supportGate.ts`). Nowy dostawca to nowa klasa i jedna gałąź w konfiguracji. Wartość `mistral` jest zarezerwowana, ale niezaimplementowana.

## Miejsce przetwarzania

API Anthropic to dostawca spoza EOG. Trafia tam tylko tekst po maskowaniu danych osobowych i fragmenty korpusu. Basal działa na maszynie wskazanej przez operatora (`BASAL_URL`), więc może być w EOG albo u siebie. Jev (TypeSafe AI) jest hostowany w USA (poza EOG); do niego trafia tylko twierdzenie po maskowaniu i dosłowny cytat ze źródła publicznego.

## Druga kontrola (zad. 45)

Opcjonalny drugi, niezależny model sprawdza każdą rozstrzygającą parę (twierdzenie, cytat, stanowisko) po zbudowaniu dowodów; poza zgodą dowód staje się tłem. Domyślnie wyłączona (`SECOND_CHECK=off`). Dostawca: `anthropic` (domyślnie `claude-sonnet-5-5`, inny niż Haiku w ocenie) albo `jev` (bez zapasu w Haiku: niepewna lub nieudana odpowiedź = druga kontrola niedostępna, dowody bez zmian). Model musi różnić się od modelu oceny; przy tym samym krok się wyłącza. W pomiarze z drugą kontrolą Sonnet sędzią cytowań jest Opus (sędzia nie może być tym samym modelem co kontrola). Wyniki i decyzja: [MIERNIKI.md](MIERNIKI.md), „Druga kontrola”.
