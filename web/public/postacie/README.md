# Ilustracje postaci

Lista plików, teksty alternatywne i długości scen są w `web/src/roles/manifest.json` (kopia paczki z galerii). Pliki leżą w `postacie/<katalog>/`; nazwa to `<rodzaj>__<stan>`:

- `praca__<stan>.webp`: postać (hero i czekanie); rola `start` ma `spoczynek` i `slucha`.
- `wynik__<stan>.webp`: obrazy wyniku (dziś tylko `pogodynka`: słońce, słońce za chmurą, deszcz, mgła, pusta mapa, zakłócenia).
- `scena__<stan>.mp4` i `scena__<stan>__plakat.png`: sceny czekania.
- `scena_wyniku__<stan>.mp4` i plakat: sceny wyniku (cztery obrazy pogodynki).

Tło wszystkich plików jest białe (#FFFFFF), bez przezroczystości. Katalog `sport_pilkarz` jest nieużywany: roli sportowej odpowiada `ASSET_DIRECTORY.sport` w `web/src/roles/manifest.ts`.

Brak pliku nigdy nie blokuje wyniku: widać rysunek z kodu albo nieruchomy obraz. Pochodzenie i prawa: `docs/POCHODZENIE_ILUSTRACJI.md`.

Scena w hero strony głównej: plakat widać od pierwszego ekranu, a wideo dochodzi dopiero po załadowaniu strony (bez blokowania pierwszego wyświetlenia). Domyślna jest scena otwierająca: wpisy `scena_otwierajaca` roli `start` z manifestu (plik `scena__<stan>.mp4`, plakat `scena__<stan>__plakat.png`). Dopóki ich nie ma, hero odtwarza dotychczasowe wpisy `scena_czekania` roli `start`. Kolejno odtwarzane są wszystkie wpisy (najpierw klipy bez pętli, na końcu pierwszy klip z `petla: true`, który zostaje zapętlony; bez wpisu z pętlą ostatni klip zostaje na ostatniej klatce). Nowy klip wystarczy dopisać w `web/src/roles/manifest.json` i wgrać pliki do `postacie/start/`. Przy ograniczeniu ruchu widać sam plakat (zapętlonego klipu, a bez niego pierwszego), a "Pomiń animację" zostawia nieruchomą postać `praca__spoczynek`.

Sceny ról (`scena_czekania` i `scena_wyniku` pogodynki, bibliotekarki i sportu) nie grają w hero: pojawiają się dopiero po wpisaniu i wysłaniu wiadomości, w widoku czekania i wyniku.

Format klipów: mp4 H.264 bez dźwięku w zwykłym `<video>` (sterowanie z kodu), bez animowanych AVIF; wersje lekkie do 720 px, cel ok. 1,5 MB na 10 s.
