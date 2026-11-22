# Mylik: dostępność (przegląd WCAG 2.1 AA)

Stan na 22.11.2026. Cel: WCAG 2.1 poziom AA. To cel, nie potwierdzony stan: nie było audytu zewnętrznego ani testów z czytnikami ekranu. Publiczna wersja tego tekstu to strona `/dostepnosc` (`web/src/components/AccessibilityPage.tsx`).

## Ustawienia dostępności (przycisk „Dostępność” w nagłówku)

| Ustawienie | Wartości | Jak działa |
|---|---|---|
| Kontrast | zwykły, wysoki | `data-contrast="high"` na `<html>`; czarne tło, żółty i biały tekst, żółte kontury, bez faktur i cieni; ilustracje i klipy w białej ramce; każda para kolorów ma co najmniej 7:1 (test `web/src/a11y/a11y.test.tsx`) |
| Wielkość tekstu | A, A+, A++ (100, 125, 150%) | `data-text-size`, zmienna `--ts` mnoży rozmiary czcionek; hasło na stronie głównej zostaje bez zmian (jest już duże) |
| Odstępy w tekście | zwykłe, większe | `data-spacing="wide"`: wysokość wiersza 1,6, litery 0,12 em, słowa 0,16 em, akapity 2 em (WCAG 1.4.12) |
| Animacje | wg systemu, włączone, wyłączone | `data-motion`; „wyłączone” zatrzymuje klipy i przejścia, „włączone” przesłania systemowe ograniczenie ruchu |

Zapis: `localStorage`, klucz `mylik:dostepnosc:v1` (ustawienia niezbędne, patrz `/prywatnosc`). Panel nie jest modalny: `aria-expanded`, `aria-controls`, Esc i kliknięcie poza panelem go zamykają. Kod: `web/src/a11y/`.

## Lista kontrolna

- [x] `lang="pl"` w `web/index.html`.
- [x] Jeden `h1` na stronie, poziomy nagłówków po kolei (strona główna, wynik, źródła, dostępność, prywatność; test przechodzi po wszystkich). Nazwa „Mylik” w nagłówku to zwykły akapit, nie nagłówek.
- [x] Pole formularza ma `label`; przyciski i odnośniki mają nazwę (ikona „Dostępność” ma widoczny napis, na telefonie napis jest tylko dla czytnika).
- [x] Postać ozdobna: pusty `alt` i `aria-hidden`; obraz wyniku ma opis słowny (`alt` albo `figcaption`); klipy mają `aria-hidden`, a scena jest opisana w tekście.
- [x] „Przejdź do treści” jest pierwszym elementem Tab i przenosi fokus na `main`.
- [x] Kolejność Tab zgodna z kolejnością na ekranie, bez dodatniego `tabindex`, bez pułapek fokusu (test dla strony głównej i wyniku).
- [x] Wskaźnik fokusu: podwójny kontur w stylu papieru; w wysokim kontraście żółty (czarny wewnątrz białych ramek ilustracji).
- [x] Esc zamyka panel dostępności, szczegóły wyniku i rozwinięte pytanie.
- [x] Ctrl lub ⌘ + Enter w polu wysyła sprawdzenie (bez zmian).
- [x] Czekanie na wynik i sam wynik: `role="status"` z `aria-live="polite"`, błędy `role="alert"`.
- [x] Cele dotyku co najmniej 48 px (test `scale.test.tsx`; panel dostępności i stopka tak samo).
- [x] Brak informacji przekazywanej samym kolorem: werdykt, stan i ostrzeżenia mają zawsze słowo; wybrana opcja w panelu ma znacznik ✓ i grubszą ramkę.
- [x] Brak poziomego przewijania przy 393 px, także przy A++ i wysokim kontraście (sprawdzone w Chrome na wszystkich stronach).
- [x] Kontrast zwykłego trybu: pary kolorów z `contrast.test.tsx` (AA).

## Znane braki

- Brak audytu zewnętrznego i testów z NVDA, JAWS, VoiceOver, TalkBack.
- Karta do udostępnienia to obraz SVG z krótkim opisem; tryb wysokiego kontrastu jej nie zmienia.
- Widok urzędnika (`/urzednik`) i symulator SMS (`/sms`) to strony renderowane przez serwer; nie były objęte tym przeglądem (stopka, panel dostępności i test klawiatury dotyczą aplikacji `web/`).
- Przy A++ hasło na stronie głównej nie rośnie (zostaje 56 px), a miernik pewności ma stały rozmiar rysunku.
- Do działania wymagany jest JavaScript. Tylko język polski.

## Układ stron informacyjnych (22.11.2026)

Źródła, Dostępność i Prywatność mają szeroki kontener (jak strona główna) i tekst o szerokości do 70 znaków. Źródła są pogrupowane według wydawcy (rozwijane przyciski z `aria-expanded`, wiersze renderowane po rozwinięciu), z polem wyszukiwania, przełącznikami rodzaju (`aria-pressed`) i licznikiem wyników ogłaszanym czytnikowi (`aria-live`). Na telefonie 393 px nie ma przewijania w poziomie. Logo w nagłówku ma nazwę dostępną „Mylik, strona główna”, a znak jest ozdobny (`aria-hidden`).
