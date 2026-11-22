# Koszt i zachowanie przy ruchu (T14)

Stan na 21.11.2026. Ceny modelu: `src/llm/pricing.ts` (cennik Anthropic z 03.11.2026; przed budżetowaniem sprawdź aktualny).

## Koszt 1 000 zapytań (model)

Zmierzone (końcowy przebieg v2, silnik dd6f303f5e02, 21.11.2026, [MIERNIKI.md](MIERNIKI.md), "Przebieg zadania 35"): koszt silnika 0,607 USD za 176 zgłoszeń, czyli ok. 0,0034 USD na zgłoszenie (0,36 USD na 100 testów). Sędzia cytowań dodał 0,626 USD, ale działa tylko w pomiarach; cały przebieg v2 kosztował 1,23 USD, a wszystkie trzy zestawy ok. 2,00 USD.

**1 000 zapytań: ok. 3,45 USD** (0,607 USD / 176 × 1 000). Zestawy strojeniowy i v1 wypadły drożej na przypadek (0,204 USD za 71 przypadków, 0,164 USD za 30), więc rozsądny zakres to ok. 2,9-5,5 USD na 1 000, zależnie od długości i liczby twierdzeń.

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

## Koszt kanału Discord

0 zł po stronie kanału: aplikacja Discord, komendy i webhook interakcji są bezpłatne, odpowiedzi idą przez darmowe webhooki interakcji (bez bramki, bez opłaty za wiadomość), a serwer to ten sam proces co WWW. Koszt modelu jest jak wyżej, a powtórzone zgłoszenie bierze zapisany rekord bez kosztu modelu. Ograniczenia Discorda, nie cenowe: limity zapytań webhooków (adapter ponawia przy 429 i 5xx), 2000 znaków wiadomości, token interakcji ważny 15 minut.

## Zachowanie przy większym ruchu

| Mechanizm | Wartość | Gdzie |
|---|---|---|
| Limit żądań | 20 zgłoszeń na minutę na klienta, osobno `POST /api/*` i `POST /sms/webhook`; po nim odpowiedź 429 z prostym komunikatem; na Discordzie ten sam limit na użytkownika, odpowiedź w wiadomości | `RATE_LIMIT_PER_MIN`, `src/security/rate-limit.ts` |
| Limit czasu | 22 s na zgłoszenie (24 s z drugą warstwą); po nim stan „awaria techniczna”, nigdy etykieta | `DEFAULT_DEADLINE_MS`, `src/engine/pipeline.ts` |
| Limit API modelu | błąd 429, przekroczony czas lub przeciążenie u dostawcy: stan „awaria techniczna” (bez automatycznych ponowień w SDK) | `src/llm/anthropic.ts` |
| Powtórki | ten sam tekst i ta sama wersja korpusu: zapisany rekord, bez modelu | `computeRecordKey`, `src/engine` |
| Retencja | rekordy i zdarzenia 30 dni, czyszczenie przy starcie i co godzinę | `RETENTION_DAYS`, `src/security/retention.ts` |
| Wielkość wejścia | JSON do 16 KB, tekst do 2000 znaków, SMS do 480, Discord do 2000 | `src/server`, `src/input`, `src/sms`, `src/discord` |

Ograniczenia skali: limit żądań jest w pamięci jednego procesu, a baza to jeden plik SQLite. Więcej mocy to mocniejsza maszyna. Kilka serwerów naraz wymaga wspólnego limitu i wspólnej bazy. Głównym ograniczeniem przepustowości są limity konta u dostawcy modelu.

## Druga kontrola cytatów (zad. 45, opcja)

Przy `SECOND_CHECK=on` każda rozstrzygająca para (średnio ok. 1-2 na zgłoszenie) to jedno wywołanie modelu drugiej kontroli (Sonnet: kilkaset tokenów wejścia, krótka odpowiedź). Zmierzony koszt i czas: [MIERNIKI.md](MIERNIKI.md), „Druga kontrola”. Domyślnie wyłączona, więc koszt podstawowy bez zmian.
