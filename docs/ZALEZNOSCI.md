# Zależności zewnętrzne (T10)

Usługi spoza serwera Mylika, co do nich trafia i jak je wymienić. Każda jest wymienna przez interfejs w kodzie; awaria żadnej nie daje obywatelowi pozornego werdyktu.

| Usługa | Do czego | Co trafia | Gdzie w kodzie | Domyślnie |
|---|---|---|---|---|
| Anthropic API (Claude Haiku 5.5) | ekstrakcja twierdzeń, wybór kandydatów, ocena stanowisk, bramka wsparcia | tekst zgłoszenia po maskowaniu danych osobowych, fragmenty źródeł z korpusu | `src/llm/anthropic.ts` (interfejs `LlmProvider`, `SupportGate`) | włączone przy `LLM_PROVIDER=anthropic` |
| Basal na wynajętej maszynie GPU (RunPod) | bramka wsparcia; opcjonalnie ocena stanowisk | twierdzenie po maskowaniu i jeden cytat (przy ocenie: jeden fragment źródła) | `src/llm/basal.ts`, `src/llm/basalAssess.ts` | wyłączone |
| Jev, API TypeSafe AI (`api.typesafe.ai`, USA) | bramka wsparcia | twierdzenie po maskowaniu i jeden dosłowny cytat ze źródła publicznego | `src/llm/jev.ts` | wyłączone |
| Anthropic API, wyszukiwarka `web_search` | druga warstwa źródeł (zad. 29) | zob. dokumentacja zad. 29 | `src/live/` | wyłączone (`LIVE_LAYER`) |
| Google Fact Check Tools API (`claims:search`) | oceny redakcji sprawdzających fakty (warstwa 3, pomocnicza) | wyłącznie krótkie frazy z twierdzenia (nazwy, liczby, słowa kluczowe), po maskowaniu; bez treści zgłoszenia, kanału i IP | `src/factcheck/` (interfejs `FactcheckIndex`) | `FACTCHECK_LAYER=auto`: włączone, gdy `GOOGLE_FACTCHECK_API_KEY` niepusty |
| EUvsDisinfo (MCP) | znane operacje informacyjne, tylko ostrzeżenia | nic ze zgłoszeń; pobieranie migawki skryptem | `scripts/fetch-euvsdisinfo.ts` | brak migawki w repozytorium (licencja niepotwierdzona); bez niej brak ostrzeżeń, bez błędu |

## Basal (zad. 30)

**Czym jest.** Polski model decyzyjny [Basal](https://github.com/rkinas/basal) (licencja Apache-2.0) za serwerem `basal-serve`. Nie pisze tekstu: wybiera jedną odpowiedź z podanej listy i zwraca skalibrowane prawdopodobieństwa. W Myliku zastępuje Claude w bramce wsparcia: "czy ten cytat sam potwierdza, obala, zmienia szczegół twierdzenia albo nic nie rozstrzyga". Wyodrębnianie twierdzeń zostaje przy Claude.

**Gdzie stoi.** Na wynajętej maszynie GPU (RunPod), poza serwerem Mylika. Adres w `BASAL_URL`, klucz w `BASAL_TOKEN` (wysyłany jako `Authorization: Bearer`, zgodnie z `--api-keys` serwera `basal-serve`). Oba tylko w `.env`; token nie trafia do logów, zdarzeń ani komunikatów błędów.

**Kontrakt.** `POST <BASAL_URL>/v1/systemone` (docs/API.md w repozytorium Basala):

```json
{
  "state": "Twierdzenie: <twierdzenie>\nCytat ze źródła: <cytat>",
  "questions": {
    "relacja": {"type": "choice", "instructions": "...", "criteria": {"potwierdza": "...", "obala": "...", "rozbieznosc_kontekstu": "...", "nie_rozstrzyga": "..."}},
    "szczegol": {"type": "choice", "criteria": {"skala": "...", "data": "...", "miejsce": "...", "warunki": "..."}, "ask_if": {"relacja": ["rozbieznosc_kontekstu"]}}
  },
  "lang": "pl"
}
```

Odpowiedź: `answers.relacja.choice`, `probabilities`, `confidence` (prawdopodobieństwo wybranej odpowiedzi). Opisy opcji to te same pojęcia co w bramce Claude (docs/ETYKIETY.md). Przy ocenie stanowisk (`BASAL_ASSESS=on`) stan zawiera fragment źródła, pytania to stanowisko z pięciu i numer zdania fragmentu, które staje się cytatem (zawsze dosłowny wycinek; dalej te same bramki cytatów i wsparcia).

**Co trafia do modelu.** Wyłącznie twierdzenie (już po maskowaniu danych osobowych w `src/input`) i cytat albo fragment źródła z korpusu. Bez identyfikatora zgłoszenia, kanału, adresu IP, numeru telefonu, adresów ani metadanych źródła.

**Włączanie.**

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `SUPPORT_GATE_PROVIDER` | pusty (Haiku) | `basal` włącza Basala w bramce wsparcia. |
| `BASAL_URL` | brak | Adres `basal-serve` (bez `/v1`). Bez niego Basal się nie włącza (ostrzeżenie przy starcie). |
| `BASAL_TOKEN` | brak | Klucz API serwera. |
| `BASAL_TIMEOUT_MS` | `5000` | Limit czasu jednego żądania. |
| `BASAL_MIN_CONFIDENCE` | `0.6` | Próg ostrożności: pewność poniżej = cytat nie rozstrzyga i odpada. |
| `BASAL_COOLDOWN_MS` | `60000` | Po awarii Basal jest pomijany przez ten czas. |
| `BASAL_ASSESS` | pusty | `on`: także ocena stanowisk fragmentów na Basalu. |

**Awaria.** Błąd HTTP, zła odpowiedź, przekroczenie czasu albo niedostępność: to samo żądanie ocenia Haiku (bramka dostawcy), a dziennik dostaje zdarzenie `support_gate_fallback` (`assess_fallback` przy ocenie) z przyczyną. Obywatel nie dostaje z tego powodu stanu technicznego. Każda decyzja Basala daje zdarzenie `support_gate_basal`: wybór, pewność, prawdopodobieństwa, czas, bez treści twierdzenia i cytatu. Zdarzenia idą na razie do dziennika procesu (stderr, jedna linia JSON); zapis do tabeli `events` wymaga przekazania funkcji `onEvent` w `src/server/bootstrap.ts`.

**Prawdopodobieństwo a obywatel.** Prawdopodobieństwo nie jest pokazywane obywatelowi, dopóki kalibracja nie zostanie sprawdzona na zestawie kontrolnym v2 (tabela niżej). Do tego czasu działa tylko jako próg ostrożności.

**Jak wymienić.** Bramka to interfejs `SupportGate` (`src/engine/supportGate.ts`): jedna metoda `checkSupport({claim, quotes})` zwracająca relację na cytat. Inny model decyzyjny wymaga nowej klasy z tą metodą i jednej gałęzi w `applySupportGateConfig` (`src/llm/basal.ts`). Inny serwer zgodny z `/v1/systemone` wymaga tylko zmiany `BASAL_URL`. Wyłączenie: usunąć `SUPPORT_GATE_PROVIDER`.

**Koszt.** Basal nie liczy tokenów do rachunku: płaci się za godzinę maszyny GPU. W pomiarze koszt to czas przebiegu razy cena za godzinę (maszyna wynajęta na cały przebieg) oraz, dla porównania, suma czasu pracy modelu razy ta cena.

**Pomiar.** `npx tsx scripts/eval-basal.ts --health` (stan serwera, bez wypisywania adresu i tokenu), potem `npx tsx scripts/eval-basal.ts --gpu-usd-per-hour <cena>` (bramka) i z `--assess` (bramka i ocena). Wyniki w `data/eval/basal/`.

## Jev (TypeSafe AI)

**Czym jest.** [Jev](https://docs.typesafe.ai) to model decyzyjny TypeSafe AI hostowany jako API: wybiera jedną odpowiedź z listy i zwraca prawdopodobieństwa oraz `confidence`. Nie pisze tekstu. W Myliku może zastąpić Claude w bramce wsparcia (to samo pytanie co przy Basalu), z Haiku jako zapasem.

**Gdzie stoi.** `https://api.typesafe.ai/v1/systemone` (USA, poza EOG; transfery z UE przez SCC według umowy powierzenia TypeSafe). Klucz w `JEV_API_KEY` tylko w `.env`, wysyłany jako `Authorization: Bearer`; nie trafia do logów, zdarzeń ani komunikatów błędów. Retencji treści zapytań dokumentacja nie określa (ZDR tylko dla klientów enterprise), dlatego do Jeva idzie wyłącznie to, co jest publiczne.

**Kontrakt** (docs.typesafe.ai, `/api/system-one`; stan z 21.11.2026):

```json
{
  "model": "jev-1.14.0",
  "state": {"twierdzenie": "<twierdzenie>", "cytat": "<cytat>"},
  "questions": {
    "relacja": {"type": "choice", "instructions": "...", "criteria": {"nie_rozstrzyga": "...", "potwierdza": "...", "obala": "...", "rozbieznosc_kontekstu": "..."}},
    "szczegol": {"type": "choice", "instructions": "...", "criteria": {"skala": "...", "data": "...", "miejsce": "...", "warunki": "..."}}
  }
}
```

Różnice względem Basala (wynikające z dokumentacji Jeva): stan jest obiektem z nazwanymi polami, brak `ask_if` i `lang` (pytanie o szczegół jest zadawane zawsze, w tym samym żądaniu, a kod czyta je tylko przy `rozbieznosc_kontekstu`), model w żądaniu jest przypięty do wersji (`jev-1.14.0`; alias `jev-latest` zmienia się wraz z wydaniami), a opcje relacji zaczynają się od `nie_rozstrzyga`, bo dokumentacja zaznacza, że Jev skłania się ku pierwszej opcji (dla bramki bezpieczniejsze jest wstrzymanie). Kolejność nie była mierzona.

Odpowiedź: `answers.relacja.choice`, `probabilities`, `confidence`. U Jeva `confidence` to znormalizowana miara skupienia rozkładu: dla czterech opcji `(p_max - 1/4) / (3/4)`, więc próg 0,6 odpowiada prawdopodobieństwu wybranej opcji 0,70. Nie jest to szansa poprawności i nie jest pokazywana obywatelowi.

**Co trafia do modelu.** Wyłącznie twierdzenie (po maskowaniu danych osobowych w `src/input`) i jeden dosłowny cytat ze źródła publicznego, każde przycięte do 2000 znaków. Bez identyfikatora zgłoszenia, kanału, adresu IP, numeru telefonu, adresów ani metadanych źródła.

**Włączanie.**

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `SUPPORT_GATE_PROVIDER` | pusty (Haiku) | `jev` włącza Jeva w bramce wsparcia (`basal` włącza Basala; naraz jedna wartość). |
| `JEV_API_KEY` | brak | Klucz z console.typesafe.ai. Bez niego Jev się nie włącza (ostrzeżenie przy starcie). |
| `JEV_MODEL` | `jev-1.14.0` | Model albo alias (`jev-latest`). Niepoprawna nazwa daje wartość domyślną. |
| `JEV_MIN_CONFIDENCE` | `0.6` | Próg `confidence`: poniżej tego cytat ocenia Haiku. |
| `JEV_TIMEOUT_MS` | `5000` | Limit czasu jednego żądania. |

**Zapas Haiku.** Przy błędzie HTTP (także 401, 429, 529), złej odpowiedzi, przekroczeniu czasu, niedostępności oraz przy `confidence` poniżej progu dany cytat ocenia bramka zapasowa (Haiku), a dziennik dostaje zdarzenie `support_gate_jev_fallback` z przyczyną (`low_confidence`, `timeout`, `rate_limited` i inne). To różnica względem Basala, gdzie niska pewność oznacza `nie_rozstrzyga`. Po błędzie (nie po niskiej pewności) Jev jest pomijany przez 30 s (przyczyna `cooldown`), co zastępuje ponawianie z odczekaniem zalecane przy 429 i 529. Bramka liczy cytaty, przyjęte decyzje i przejścia awaryjne wg przyczyn (`JevSupportGate.stats`). Obywatel nie dostaje z tego powodu stanu technicznego. Każda decyzja Jeva daje zdarzenie `support_gate_jev`: wybór, `confidence`, prawdopodobieństwa, czas, bez treści twierdzenia i cytatu; zdarzenia idą do dziennika procesu (stderr, jedna linia JSON).

**Koszt.** 0,042 USD za mln tokenów wejścia, tokeny wyjścia bezpłatne (docs.typesafe.ai/models). Szacunek kosztu w zdarzeniu użycia liczony z tej stawki.

**Stan pomiaru.** Niewykonany: brak klucza w `.env`. Nie podajemy trafności, poprawności cytowań ani opóźnienia Jeva.

**Jak wymienić.** Jak przy Basalu: interfejs `SupportGate`; wyłączenie przez usunięcie `SUPPORT_GATE_PROVIDER`.

## Google Fact Check Tools (zad. 40)

**Klucz.** `GOOGLE_FACTCHECK_API_KEY` (klucz API projektu Google Cloud z włączonym „Fact Check Tools API”), tylko w `.env`; nie trafia do logów, zdarzeń ani kodów błędów (test w `tests/factcheck/unit.test.ts`).

**Limity i koszt.** Dokumentacja metody nie podaje ceny ani dziennego limitu; warunki Google APIs mówią, że limity ustala Google i może je zmienić. W prototypie: najwyżej 3 zapytania na twierdzenie (najwyżej 15 na zgłoszenie), 10 wyników na zapytanie, bez pamięci podręcznej poza rekordem (okno 6 h w kluczu rekordu). Koszt nie jest wliczany do `usage.estimatedCostUsd` (brak cennika).

**Czas.** Własny limit 6 s (`data/factcheck.json`, `index.timeoutMs`), równolegle z wyszukiwaniem w zbiorze; całe zgłoszenie nadal w limicie 22 s.

**Awaria.** Zob. docs/ZRODLA.md, „Awaria indeksu”: stan techniczny tylko wtedy, gdy zbiór nie rozstrzyga; inaczej dopisek o ograniczeniu. Wyłączenie: `FACTCHECK_LAYER=off`.

**Jak wymienić.** Interfejs `FactcheckIndex` (`src/factcheck/client.ts`): jedna metoda `search({query, languageCode, pageSize, signal})` zwracająca pola w formacie `claims[]` albo kod błędu. Inny indeks ClaimReview wymaga nowej klasy z tą metodą.

**Sprawdzenie na żywo.** Nie wykonane w zad. 40: klucza nie było w środowisku (warstwa gotowa, przetestowana na atrapie o strukturze odpowiedzi API).

## Ilustracje

W czasie działania usługi nie ma wywołań do generatorów obrazów ani wideo: ilustracje i klipy w interfejsie to statyczne pliki w `web/public/postacie/`. Skąd pochodzą: `docs/POCHODZENIE_ILUSTRACJI.md`.
