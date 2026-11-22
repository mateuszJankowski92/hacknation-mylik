# Etykiety werdyktu: definicja "sedno i szczegół"

Decyzja właściciela z 21.11.2026. Obowiązuje w silniku (stanowiska oceny dowodów i bramka wsparcia), w obu zestawach testowych (strojeniowym i kontrolnym) i w objaśnieniach.

## Pięć etykiet

| Etykieta | Kiedy |
|---|---|
| potwierdzone | Źródło stwierdza to samo co twierdzenie: sedno i istotne szczegóły (podmiot, liczba, data, miejsce, warunki). |
| fałszywe | Źródła przeczą **sednu** twierdzenia: zdarzenia nie było, rzecz nie istnieje albo źródło mówi odwrotnie. |
| wprowadzające w błąd | **Sedno** zgadza się ze źródłami, ale twierdzenie zmienia **szczegół**, który zmienia sens: datę, miejsce, liczbę lub skalę, podmiot; podaje plan jako fakt dokonany albo informację nieaktualną jako bieżącą. |
| brak wystarczających dowodów | W źródłach nie ma podstawy do oceny albo wiarygodne źródła są ze sobą sprzeczne (pokazujemy obie strony). Wstrzymanie się jest lepsze niż słaby dowód. |
| nie podlega weryfikacji | Opinia, ocena, prognoza. |

## Czego nie uznajemy za sprzeczność źródeł

- Dwie liczby opisane jako "ponad X" i "ponad Y": "ponad X" zgadza się z każdą większą wartością.
- Zapowiedź i późniejsza relacja z tego samego wydarzenia: nowsza relacja zastępuje zapowiedź.

## Przykłady orientacyjne

Tylko do zrozumienia definicji. Nie wpisujemy ich do promptów, reguł silnika ani zestawów testowych.

- "Granica jest zamknięta" wobec źródła "granica otwarta": fałszywe.
- "Obwodnica już działa" wobec "podpisano umowę na budowę": wprowadzające w błąd (plan jako fakt dokonany).
- "Zginęło 2000 osób" wobec "zginęło 20": wprowadzające w błąd (liczba).
- Alert sprzed dwóch lat podany jako obowiązujący: wprowadzające w błąd (informacja nieaktualna).

## Jak to działa w silniku

- Model ocenia każdy fragment źródła: `potwierdza`, `obala` (źródło przeczy sednu), `rozbieznosc_kontekstu` (sedno się zgadza, zmieniony szczegół; rodzaj: `skala`, `data`, `miejsce`, `warunki`), `kontekst` albo `bez_zwiazku` (src/llm/prompts.ts).
- Bramka wsparcia (src/engine/supportGate.ts) sprawdza osobno każdy cytat rozstrzygający według tych samych pojęć; cytat, który sam nie rozstrzyga, odpada. Bramka ustala, czy cytat przesądza i w którą stronę ("za" albo "przeciw"); gdy kierunek zgadza się z oceną, zostaje stanowisko z oceny, bo granica "obala" / "rozbieżność kontekstu" (sedno czy szczegół) wymaga całego fragmentu, a bramka widzi tylko cytat (zad. 25, diagnoza: bramka zamieniała rozbieżność na "obala").
- Kod (src/engine/rules.ts) zamienia stanowiska na werdykt: `obala` -> fałszywe, `rozbieznosc_kontekstu` -> wprowadzające w błąd, `potwierdza` -> potwierdzone, sprzeczne dowody rozstrzygające -> brak wystarczających dowodów.
- Rodzaj źródła wpływa tylko na siłę podstawy, nigdy na etykietę.
- **Link do strony urzędu (zad. 43):** adres strony z listy `data/official-hosts.json` daje „potwierdzone” tylko wtedy, gdy ze strony da się wskazać dosłowny cytat, który przeszedł bramki; domena sama nie przesądza o etykiecie, a siła podstawy wynosi najwyżej „średnia” (jedno źródło mówiące o sobie). Pełny opis: [ZRODLA.md](ZRODLA.md), „Link do strony urzędu”. Od zad. 44 starsze (albo niedatowane) sprzeczne dokumenty są przy takim zdaniu tylko tłem; nowszy sprzeczny dokument daje uwagę „Nowsze źródło mówi inaczej” i niższą siłę, nie zmianę etykiety.

## Zgłoszenia z kilkoma tezami

Etykietę nadaje się każdej tezie osobno (`expected.claims` w zestawie: opis tezy, słowa kluczowe do jej odnalezienia, etykieta). Zgłoszenie z dwiema tezami nie jest błędem, gdy każda teza dostała trafny wynik.

## Zmiany etykiet w zestawie strojeniowym (21.11.2026)

Po niezależnym przeglądzie zestawu:

| Przypadek | Było | Jest | Powód |
|---|---|---|---|
| A18 | fałszywe | wprowadzające w błąd | sedno prawdziwe, zmienione miejsce (spójnie z B04) |
| B08 | brak dowodów | potwierdzone | "ponad 450 mln" i "ponad 400 mln" nie są sprzecznością |
| C03 | brak dowodów (scenariusz C) | wprowadzające w błąd (scenariusz B) | zapowiedź i relacja to nie sprzeczność; zmieniona liczba |
| I01, I02 | fałszywe (jedna etykieta) | obywatelstwo: fałszywe; sympatie: brak dowodów | ocena per teza |
| B02-B05 | wprowadzające w błąd | bez zmian | zgodne z definicją (plan jako fakt, data, miejsce, liczba); dopisane uzasadnienia |

F01 (obraz) pozostaje oznaczony jako nieobsługiwany. H01 (pętla informacji) zostaje w zestawie pomiarowym silnika jako nieobsługiwany, bo silnik jest zamrożony i nie tworzy spraw; pętlę obsługuje warstwa serwera ([PETLA_INFORMACJI.md](PETLA_INFORMACJI.md)).
