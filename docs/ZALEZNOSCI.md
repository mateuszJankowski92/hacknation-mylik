# Zależności zewnętrzne (T10)

Usługi spoza serwera Mylika, co do nich trafia i jak je wymienić. Każda jest wymienna przez interfejs w kodzie; awaria żadnej nie daje obywatelowi pozornego werdyktu.

| Usługa | Do czego | Co trafia | Gdzie w kodzie | Domyślnie |
|---|---|---|---|---|
| Anthropic API (Claude Haiku 5.5) | ekstrakcja twierdzeń, wybór kandydatów, ocena stanowisk, bramka wsparcia | tekst zgłoszenia po maskowaniu danych osobowych, fragmenty źródeł z korpusu | `src/llm/anthropic.ts` (interfejs `LlmProvider`, `SupportGate`) | włączone przy `LLM_PROVIDER=anthropic` |
| Basal na wynajętej maszynie GPU (RunPod) | bramka wsparcia; opcjonalnie ocena stanowisk | twierdzenie po maskowaniu i jeden cytat (przy ocenie: jeden fragment źródła) | `src/llm/basal.ts`, `src/llm/basalAssess.ts` | wyłączone |
| Anthropic API, wyszukiwarka `web_search` | druga warstwa źródeł (zad. 29) | zob. dokumentacja zad. 29 | `src/live/` | wyłączone (`LIVE_LAYER`) |
| EUvsDisinfo (MCP) | znane operacje informacyjne, tylko ostrzeżenia | nic ze zgłoszeń; pobieranie migawki skryptem | `scripts/fetch-euvsdisinfo.ts` | migawka w `data/known-ops` |

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
