# Koszt i zachowanie przy ruchu (T14)

Stan na 22.11.2026. Ceny modelu: `src/llm/pricing.ts` (cennik Anthropic z 03.11.2026; przed budżetowaniem sprawdź aktualny).

## Koszt 1 000 zapytań (model)

Zmierzone (ostatni przebieg v2, przebieg P1 z [WYNIKI.md](WYNIKI.md), tabela „Liczby, na które się powołujemy”: silnik 5fcfd41a31ea, 22.11.2026, `data/eval/results.json`): koszt silnika 0,6089 USD za 176 zgłoszeń, czyli ok. 0,0035 USD na zgłoszenie. Sędzia cytowań (Claude Opus 5.5) dodał 1,176 USD, ale działa tylko w pomiarach.

**1 000 zapytań: 3,46 USD** (0,6089 USD / 176 x 1 000, przebieg P1). Ta sama formuła na wcześniejszych przebiegach v2 daje 3,45 USD (dd6f303f5e02), 3,52 USD (108928016877), 3,50 USD (5ac946ffce1a) i 3,60 USD (5d88b017207b); to wyniki innych przebiegów, a rozrzut 3,45-3,60 USD to zmienność między przebiegami. Wcześniejsze zapisy „ok. 3,6” i „ok. 3,7 USD” pochodziły z licznika kosztu na 100 testów, który dzieli przez 170 przypadków z pomiarem czasu (bez 6 przypadków bez wywołań modelu), więc wychodziły wyżej. Zestawy strojeniowy i v1 wypadły drożej na przypadek (0,204 USD za 71 przypadków, 0,164 USD za 30), więc rozsądny zakres to ok. 2,9-5,5 USD na 1 000, zależnie od długości i liczby twierdzeń.

Założenia (jawne):
- Claude Haiku 5.5, druga warstwa źródeł wyłączona (`LIVE_LAYER=off`), druga kontrola wyłączona (`SECOND_CHECK=off`), indeks redakcji wyłączony w pomiarze (`FACTCHECK_LAYER=off`; przy włączonym dochodzą zapytania do Google Fact Check Tools; dokumentacja metody nie podaje ceny ani dziennego limitu, [ZALEZNOSCI.md](ZALEZNOSCI.md)), Basal wyłączony.
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

Pomiar (zad. 45, v2, sędzia cytowań Claude Opus 5.5 w obu wariantach):

| Miernik | bez drugiej kontroli | druga kontrola Sonnet 5.5 |
|---|---|---|
| Trafność (macro-F1) | 0,706 | 0,641 |
| Poprawność cytowań (sędzia Opus) | 87,0% (180/207) | 96,6% (115/119) |
| Fałszywe wstrzymania | 33/136 | 50/136 |
| Mediana czasu (p90) | 7,8 s (10,2 s) | 8,9 s (12,5 s) |
| Koszt silnika na 1000 zapytań (koszt / 176 x 1 000) | 3,46 USD | 3,47 USD zmierzone + ok. 3-4 USD szacunku drugiej kontroli (licznik eval jej nie obejmuje) |

Decyzja: wyłączona (trafność 0,641 poniżej progu 0,66; [MIERNIKI.md](MIERNIKI.md)).
