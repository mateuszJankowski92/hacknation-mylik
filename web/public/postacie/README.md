# Ilustracje postaci

Runda 4 (21.11.2026): postacie z papieru, wszystkie rodzaju męskiego (pogodynek w niebieskiej koszuli, bibliotekarz w szałwiowym kardiganie, komentator sportowy w słuchawkach). Lista plików, teksty alternatywne i długości scen są w `web/src/roles/manifest.json` (kopia paczki z galerii, tylko role użyte w interfejsie). Pliki leżą w `postacie/<katalog>/`; nazwa to `<rodzaj>__<stan>`. Katalogi ról zachowują nazwy z kodu (`pogodynka` to pogodynek, `bibliotekarka` to bibliotekarz).

- `praca__<stan>.webp`: postać (hero i czekanie), 720 x 900 px; rola `start` ma `spoczynek` i `slucha`, pozostałe role `praca` (obraz wzorcowy, master).
- `wynik__<stan>.webp`: obrazy wyniku (dziś tylko `pogodynka`: słońce, słońce za chmurą, deszcz, mgła, pusta mapa, zakłócenia).
- `scena__<stan>.mp4` i `scena__<stan>__plakat.webp`: sceny czekania (pogodynek 6, bibliotekarz 4, komentator 2, piłkarz 3, start 3).
- `scena_wyniku__<stan>.mp4` i plakat: sceny wyniku (sześć obrazów pogodynka).
- `scena__otwarcie.mp4` i `scena__otwarcie__plakat.webp` w `start/`: scena otwierająca hero.

Tło wszystkich plików jest białe (#FFFFFF), bez przezroczystości. Katalog `sport_pilkarz` jest nieużywany: roli sportowej odpowiada `ASSET_DIRECTORY.sport` w `web/src/roles/manifest.ts`.

Brak pliku nigdy nie blokuje wyniku: widać rysunek z kodu albo nieruchomy obraz. Pochodzenie i prawa: `docs/POCHODZENIE_ILUSTRACJI.md`.

Scena w hero strony głównej: plakat widać od pierwszego ekranu, a wideo dochodzi dopiero po załadowaniu strony (bez blokowania pierwszego wyświetlenia). Domyślna jest scena otwierająca: wpisy `scena_otwierajaca` roli `start` z manifestu (dziś jeden klip, 10 s: wiadomość przylatuje do postaci, postać rozkłada mapę, przypina znacznik źródła, a obok zostaje czysta biała plama). Dopóki ich nie ma, hero odtwarza wpisy `scena_czekania` roli `start`. Kolejno odtwarzane są wszystkie wpisy (najpierw klipy bez pętli, na końcu pierwszy klip z `petla: true`, który zostaje zapętlony; bez wpisu z pętlą ostatni klip zostaje na ostatniej klatce). Nowy klip wystarczy dopisać w `web/src/roles/manifest.json` i wgrać pliki do `postacie/start/`. Przy ograniczeniu ruchu widać sam plakat (zapętlonego klipu, a bez niego pierwszego), a "Pomiń animację" zostawia nieruchomą postać `praca__spoczynek`.

Sceny ról (`scena_czekania` i `scena_wyniku` pogodynka, bibliotekarza i sportu) nie grają w hero: pojawiają się dopiero po wpisaniu i wysłaniu wiadomości, w widoku czekania i wyniku.

Format klipów: mp4 H.264 bez dźwięku w zwykłym `<video>` (sterowanie z kodu), 576 x 720 px, 24 kl./s, do 1,5 MB na klip (dziś ok. 0,2-0,9 MB), bez animowanych AVIF. Plakaty to pierwsza klatka klipu w WebP.
