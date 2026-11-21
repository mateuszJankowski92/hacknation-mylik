# Prywatność - inwentarz i decyzje

Stan na 22.11.2026. Dotyczy interfejsu w `web/src`. Strona dla użytkownika: `/prywatnosc`.

## Inwentarz

### Ciasteczka po stronie serwera

- Jedyne ciasteczko: `urzednik` (8 godzin), ustawiane po zalogowaniu urzędnika na `/urzednik`. Zwykły użytkownik go nie dostaje.
- Brak ciasteczek reklamowych, statystycznych i śledzących.
- Interfejs nie używa `document.cookie` ani `sessionStorage`.

### Co interfejs zapisuje w przeglądarce (localStorage)

| Klucz | Zawartość | Kategoria | Uwagi |
| --- | --- | --- | --- |
| `mylik:prywatnosc:v1` | decyzja `{"history":"granted"\|"denied"}` | niezbędne | pamięta wybór z banera |
| `mylik:dostepnosc:v1` | ustawienia dostępności (kontrast, rozmiar tekstu, odstępy, animacje) | niezbędne (funkcjonalne) | brak wpisu = ustawienia domyślne |
| `mylik:ostatnie-sprawdzenia:v1` | lista ostatnich sprawdzeń | tylko za zgodą | zapis dopiero po "Zapamiętuj"; "Nie zapamiętuj" usuwa wpis |
| `mylik.pomin-animacje` | stary klucz | - | nie jest już zapisywany, tylko usuwany |

### Zapytania do stron trzecich

Zero. Interfejs nie ładuje zewnętrznych skryptów, czcionek, obrazów ani statystyk. Sprawdzone na ruchu sieciowym przeglądarki (Chrome DevTools Protocol): wszystkie żądania szły wyłącznie do serwera Myliku.

## Zachowanie banera

- Pojawia się przy pierwszej wizycie (brak decyzji) i nie blokuje strony.
- Do czasu wyboru historia nie jest zapisywana ani odczytywana.
- "Zapamiętuj" włącza zapis, "Nie zapamiętuj" usuwa istniejącą historię i wyłącza zapis.
- Decyzję można zmienić na `/prywatnosc#ustawienia` oraz przez link "Ustawienia prywatności" w stopce.
- Na niskich ekranach (wysokość poniżej 830 px), przy większym tekście i większych odstępach baner jest w przepływie strony, żeby nie zasłaniał pola ani przycisku "Sprawdź".

## Po stronie serwera (z kodu i docs/RYZYKA.md, docs/ZRODLA.md)

- Treść zgłoszenia z zamaskowanymi danymi osobowymi: 30 dni (`RETENTION_DAYS`).
- Wyniki oparte na indeksie Google: 24 godziny (`FACTCHECK_RECORD_TTL_HOURS`).
- Sprawy bez wystarczających dowodów: do 365 dni (`CASE_RETENTION_DAYS`), skrócone i ponownie zamaskowane, widoczne w `/urzednik`.
- Adres IP tylko w pamięci ogranicznika zapytań, tabela zdarzeń nie ma kolumny IP.
- Numer nadawcy SMS nie jest zapisywany. Brak profilowania.
- Dostawcy modeli: domyślnie Anthropic (USA, poza EOG), opcjonalnie Jev (TypeSafe AI, USA) lub Basal, opcjonalnie Google Fact Check Tools (krótkie frazy). Do dostawców trafia treść po zamaskowaniu.

## Czego nie potwierdzono

- Logi hostingu i reverse proxy (poza kodem aplikacji).
- Faktycznie używany dostawca modelu w środowisku produkcyjnym.
- Czy `/urzednik` jest włączony w produkcji.
- Strony renderowane po stronie serwera (`/urzednik`, `/sms`) nie były objęte tym przeglądem.
