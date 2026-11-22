# Pętla informacji: sprawy i widok urzędnika (scenariusz H)

Stan na 22.11.2026. Pętla działa w warstwie serwera i interfejsu. Silnik (`src/engine`, `src/llm`, `src/contracts`) nie wie o sprawach.

## Co się dzieje

1. Serwer opakowuje silnik (`withCaseTracking`, `src/cases/track.ts`). Gdy silnik zwróci rekord, w którym co najmniej jedno twierdzenie ma werdykt „brak wystarczających dowodów”, serwer zapisuje to twierdzenie jako **sprawę**. Dotyczy to wszystkich kanałów (WWW, SMS). Stany techniczne i werdykty merytoryczne nie tworzą spraw. Błąd zapisu sprawy nigdy nie psuje odpowiedzi dla obywatela (trafia do logu zdarzeń jako `case_error`).
2. Sprawy leżą w osobnych tabelach `cases` i `case_records` (bez zmian w rekordach silnika). Sprawa ma: skrócone twierdzenie po ponownym maskowaniu danych osobowych (do 300 znaków), pierwsze i ostatnie zgłoszenie, licznik powtórzeń, kanały (liczba zgłoszeń na kanał), odsyłacze do rekordów, stan (`nowa`, `w_toku`, `zamknieta`), notatkę urzędnika oraz to, czego szukał system (słowa szukane i przeciwne, zapytania próby obalenia, powód braku dowodów).
3. **Deduplikacja** (`src/cases/similarity.ts`): ten sam znormalizowany tekst (małe litery, bez polskich znaków i interpunkcji) albo podobieństwo rdzeni słów kluczowych. Próg jest ostrożny, wszystkie warunki naraz: współczynnik Jaccarda rdzeni (pierwsze 5 liter słów dłuższych niż 3 litery, bez słów pomocniczych typu „podobno”) co najmniej 0,7, co najmniej 3 wspólne rdzenie, różnica najwyżej 2 rdzenie, te same liczby, ta sama polaryzacja (przeczenie „nie/bez/brak” nie może się różnić), te same nazwy własne (wyrazy z wielkiej litery poza pierwszym). Przy wątpliwości powstaje osobna sprawa. Przykłady są w `tests/cases/similarity.test.ts` (m.in. „300 zł” i „500 zł”, „w Krakowie” i „w Gdańsku”, „jest bezpieczna” i „nie jest bezpieczna” nie są sklejane).
4. Każde zgłoszenie dolicza powtórzenie, także identyczne (odpowiedź z pamięci podręcznej): licznik to liczba zgłoszeń, nie liczba różnych osób. Zamknięta sprawa wraca do stanu `nowa`, gdy przyjdzie nowe zgłoszenie.

## Co widzi obywatel

Przy rekordzie z brakiem dowodów interfejs pyta `GET /api/records/:id/obieg` i pokazuje jedno zdanie (`src/cases/texts.ts`, komponent `web/src/components/CaseNotice.tsx`):

| Stan | Zdanie |
|---|---|
| `zapisano` | „Zapisałem to pytanie, żeby człowiek mógł je sprawdzić. Jeszcze nikomu go nie przekazałem.” |
| `przekazano` | „Przekazano do sprawdzenia DD.MM.RRRR.” |
| `brak` albo błąd | nic (żadnych domysłów) |

„Zapisano” to nie „przekazano”: przekazanie ustawia wyłącznie urzędnik jednym przyciskiem. Zdanie nie obiecuje odpowiedzi. Odpowiedź API nie zawiera licznika, osoby ani treści sprawy.

## Widok urzędnika „Białe plamy”

Adres `/urzednik`, bez linku z interfejsu obywatela (test to sprawdza). Strona bez JavaScriptu (formularze), z własnym, ścisłym CSP (`default-src 'none'`), `noindex`, bez cache.

**Dostęp:** zmienna `URZEDNIK_TOKEN` (min. 16 znaków). Bez tokenu w konfiguracji, ze zbyt krótkim tokenem albo bez poprawnego tokenu w żądaniu każdy adres pod `/urzednik` zwraca **401**. Token podaje się w nagłówku `Authorization: Bearer <token>` albo `X-Urzednik-Token`, a w przeglądarce formularzem logowania (ciasteczko `HttpOnly`, `SameSite=Strict`, `Secure` przy HTTPS, 8 godzin; w ciasteczku jest skrót, nie token). Token w adresie (`?token=`) nie działa. Zmiany z ciasteczka są odrzucane przy obcym `Origin` (403). Nieudane próby są limitowane (10 na minutę na klienta, potem 429); poprawny token nie jest liczony.

| Adres | Co |
|---|---|
| `GET /urzednik` (`?stan=nowa\|w_toku\|zamknieta`) | lista spraw wg liczby powtórzeń, filtr stanu, licznik oczekujących |
| `GET /urzednik/sprawa/:id` | podgląd: odsyłacze do rekordów, czego szukał system, zmiana stanu, przycisk „Oznacz jako przekazane do: <osoba>”, notatka |
| `POST /urzednik/sprawa/:id/stan`, `/notatka`, `/przekaz` | zmiany z formularzy |
| `GET /urzednik/eksport.csv`, `/urzednik/eksport.json` (`?stan=`) | eksport listy spraw (CSV: UTF-8 z BOM, przecinki, CRLF, komórki zaczynające się od `=`, `+`, `-`, `@` poprzedzone apostrofem) |
| `GET /urzednik/api/sprawy`, `/urzednik/api/sprawy/:id` | JSON |
| `POST /urzednik/api/sprawy/:id` (`{"stan":...,"notatka":...}`), `POST /urzednik/api/sprawy/:id/przekaz` | zmiany przez API |
| `GET /urzednik/api/licznik` | `{"oczekujace": N, "powiadomienia": {"adresUstawiony": bool, "wysylka": false}}` |

Słowo „przekazane” występuje tylko tutaj. Przycisk zapisuje osobę z konfiguracji i datę; sprawa w stanie `nowa` przechodzi do `w_toku`. Od tej chwili obywatel wracający na stronę rekordu widzi „Przekazano do sprawdzenia <data>”. Widok pokazuje też, ile nowych zgłoszeń przyszło od przekazania.

## Powiadomienia: uczciwie

**Niczego nie wysyłamy.** Nie ma e-maila, SMS-a ani webhooka. Przygotowane jest tylko miejsce:

- `URZEDNIK_ADRES_POWIADOMIEN`: adres osoby wskazanej przez administratora (dziś tylko wyświetlany urzędnikowi),
- `GET /urzednik/api/licznik` i licznik „Czekają na człowieka” na stronie: do odpytywania z zewnątrz (np. zadanie cron administratora),
- zdarzenia `case_saved` w tabeli `events` (bez treści zgłoszeń).

Wysyłka wymaga osobnej decyzji (dostawca poczty, koszty, RODO) i nie jest częścią prototypu.

## Konfiguracja

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `URZEDNIK_TOKEN` | brak (widok zamknięty, zawsze 401) | token dostępu, min. 16 znaków |
| `URZEDNIK_OSOBA` | brak | osoba z etykiety przycisku przekazania; bez niej (i bez adresu) przekazanie jest niemożliwe |
| `URZEDNIK_ADRES_POWIADOMIEN` | brak | adres do powiadomień (miejsce przygotowane, bez wysyłki); gdy nie ma osoby, służy jako jej etykieta |
| `CASE_RETENTION_DAYS` | `365` | po ilu dniach bez nowego zgłoszenia sprawa jest usuwana (przy starcie i co godzinę); `npx tsx src/security/purge-cli.ts --all` usuwa też wszystkie sprawy |

Token generuje administrator (np. `openssl rand -hex 24`) i ustawia w `.env` na hostingu; nie trafia do repozytorium ani do logu (`redactedConfig` pokazuje tylko `[ustawiony]`).

## Prywatność i ograniczenia

- Twierdzenie w sprawie pochodzi z zamaskowanego wejścia i jest maskowane jeszcze raz. Maskowanie to wzorce (ograniczenia: [RYZYKA.md](RYZYKA.md)), więc urzędnik może zobaczyć dane, których wzorce nie wyłapały.
- Sprawy żyją dłużej niż rekordy (rekordy: `RETENTION_DAYS`, 30 dni). Odsyłacz do rekordu może po tym czasie prowadzić do „Tego sprawdzenia już nie ma”; twierdzenie w sprawie zostaje.
- Liczba powtórzeń nie odróżnia osób: jedna osoba może zgłosić to samo wielokrotnie (ogranicza to tylko limit żądań).
- Odpowiedź SMS nie zawiera zdania o zapisaniu pytania (tekst SMS składa silnik); sprawa powstaje także z SMS-a i widać ją w kanałach.
- Deduplikacja jest prosta i ostrożna: bywa, że to samo twierdzenie opisane innymi słowami trafia do dwóch spraw. Urzędnik widzi je obok siebie na liście.
- Stan `zamknieta` nie jest „rozstrzygnięciem”: system nie zmienia przez to wyniku sprawdzenia (to robi dopiero nowy korpus).

## Testy

`tests/cases/similarity.test.ts` (deduplikacja), `tests/cases/store.test.ts` (sprawy, opakowanie silnika, eksport), `tests/e2e/clerk.test.ts` (scenariusz H na prawdziwym silniku z atrapą modelu: brak dowodów plus powtórne podobne zgłoszenie z innego kanału to jedna sprawa z licznikiem 2 i brak komunikatu o przekazaniu; uprawnienia widoku; skrót silnika `dd6f303f5e02` bez zmian), `web/src/components/CaseNotice.test.tsx` (zdania dla obywatela).
