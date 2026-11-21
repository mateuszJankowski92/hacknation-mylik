# Ilustracje postaci

Pliki tego katalogu zastępują rysunki z kodu. Podmiana nie wymaga zmian w kodzie.

Ścieżka: `postacie/<rola>/<stan>.<rozszerzenie>`, rozszerzenia sprawdzane po kolei: `webp`, `png`, `svg`.

Role: `pogodynka`, `bibliotekarka`, `sport`, a także `start` (postać przed wpisaniem wiadomości).

Stany postaci: `postac` (hero), `praca` (widok czekania).

Obrazy wyniku (tylko role, które je mają, dziś `pogodynka`): `potwierdzone`, `falszywe`, `wprowadzajace_w_blad`, `brak_wystarczajacych_dowodow`, `nie_podlega_weryfikacji`, `awaria_techniczna`, `brak_mozliwosci_sprawdzenia`.

Teksty alternatywne i podpisy są w `web/src/roles/config.ts`. Bez pliku widać rysunek z kodu.

## Sceny czekania

Krótkie klipy z postacią przy pracy: `postacie/<rola>/sceny/<nazwa>.mp4` (plakat obok: `<nazwa>.webp`). Klip: wyciszony, bez ścieżki dźwiękowej, do około 1,5 MB, 6-8 s, kwadrat.

Lista wariantów każdej roli (plik, plakat, długość, tekst alternatywny) jest w `web/src/scenes/config.ts`. Dziś wpisy mają `file: null`, więc widać zastępczy klip rysowany kodem. Żeby podmienić, wpisz ścieżkę w `file` i `poster`. Brak pliku nigdy nie blokuje wyniku: widać plakat i wynik pojawia się od razu.
