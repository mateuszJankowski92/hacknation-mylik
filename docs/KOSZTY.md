# Koszt i zachowanie przy ruchu (T14)

Stan na 21.11.2026. Ceny modelu: `src/llm/pricing.ts` (cennik Anthropic z 03.11.2026; przed budżetowaniem sprawdź aktualny).

## Koszt 1 000 zapytań (model)

<!-- DO UZUPEŁNIENIA: liczby z końcowego przebiegu v2 w docs/MIERNIKI.md -->
**[DO UZUPEŁNIENIA po końcowym przebiegu v2]**

Założenia (jawne):
- Claude Haiku 5.5, druga warstwa wyłączona (`LIVE_LAYER=off`), Basal wyłączony.
- Zapytania podobne do zestawu kontrolnego v2 (176 przypadków: krótkie teksty i adresy URL, 1 do 5 twierdzeń).
- Każde zapytanie jest nowe. Powtórzone zgłoszenie tej samej treści przy tej samej wersji korpusu bierze zapisany rekord i nie kosztuje nic po stronie modelu, więc w praktyce koszt jest niższy.
- Bez kosztu sędziego cytowań (działa tylko w pomiarach).

Z drugą warstwą (`LIVE_LAYER=on`) dochodzi ok. 0,013 USD na każde twierdzenie bez odpowiedzi w korpusie (0,01 USD opłaty za wyszukiwanie plus tokeny; [ZRODLA.md](ZRODLA.md)).

Hosting: jeden proces Node i plik SQLite, wystarcza zwykły hosting współdzielony. Bez GPU, bez bazy zewnętrznej. Basal (opcja) to osobna maszyna GPU płatna za godzinę, nie za zapytanie.

## Koszt kanału SMS

Adapter SMS (w prototypie: symulator). Pokaz działa w przeglądarce pod `/sms` i nic nie kosztuje. Prawdziwy SMS wymaga bramki operatora (rząd wielkości, nie oferta; `src/sms/KOSZT.md`):

- numer lub krótki kod: od kilkudziesięciu do kilkuset złotych miesięcznie, plus opłata za każdy odebrany SMS;
- odpowiedź: do 320 znaków, z polskimi znakami to do 5 części SMS; przy cenie 5 do 15 groszy za część to do 0,25-0,75 zł za odpowiedź, czyli **do 250-750 zł za 1 000 odpowiedzi**;
- model: ten sam rekord co w WWW, więc koszt modelu jak wyżej.

## Zachowanie przy większym ruchu

| Mechanizm | Wartość | Gdzie |
|---|---|---|
| Limit żądań | 20 zgłoszeń na minutę na klienta, osobno `POST /api/*` i `POST /sms/webhook`; po nim odpowiedź 429 z prostym komunikatem | `RATE_LIMIT_PER_MIN`, `src/security/rate-limit.ts` |
| Limit czasu | 22 s na zgłoszenie (24 s z drugą warstwą); po nim stan „awaria techniczna”, nigdy etykieta | `DEFAULT_DEADLINE_MS`, `src/engine/pipeline.ts` |
| Limit API modelu | błąd 429, przekroczony czas lub przeciążenie u dostawcy: stan „awaria techniczna” (bez automatycznych ponowień w SDK) | `src/llm/anthropic.ts` |
| Powtórki | ten sam tekst i ta sama wersja korpusu: zapisany rekord, bez modelu | `computeRecordKey`, `src/engine` |
| Retencja | rekordy i zdarzenia 30 dni, czyszczenie przy starcie i co godzinę | `RETENTION_DAYS`, `src/security/retention.ts` |
| Wielkość wejścia | JSON do 16 KB, tekst do 2000 znaków, SMS do 480 | `src/server`, `src/input`, `src/sms` |

Ograniczenia skali: limit żądań jest w pamięci jednego procesu, a baza to jeden plik SQLite. Więcej mocy to mocniejsza maszyna. Kilka serwerów naraz wymaga wspólnego limitu i wspólnej bazy. Głównym ograniczeniem przepustowości są limity konta u dostawcy modelu.
