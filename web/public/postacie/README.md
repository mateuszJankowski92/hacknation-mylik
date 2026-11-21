# Ilustracje postaci

Runda 4 (21.11.2026): postacie z papieru, wszystkie rodzaju męskiego (pogodynek w niebieskiej koszuli, bibliotekarz w szałwiowym kardiganie, komentator sportowy w słuchawkach). Lista plików, teksty alternatywne i długości scen są w `web/src/roles/manifest.json` (kopia paczki z galerii, tylko role użyte w interfejsie). Pliki leżą w `postacie/<katalog>/`; nazwa to `<rodzaj>__<stan>`. Katalogi ról zachowują nazwy z kodu (`pogodynka` to pogodynek, `bibliotekarka` to bibliotekarz).

- `praca__<stan>.webp`: postać (hero i czekanie), 720 x 900 px; rola `start` ma `spoczynek` i `slucha`, pozostałe role `praca` (obraz wzorcowy, master).
- `wynik__<stan>.webp`: obrazy wyniku (dziś tylko `pogodynka`: słońce, słońce za chmurą, deszcz, mgła, pusta mapa, zakłócenia).
- `scena__<stan>.mp4` i `scena__<stan>__plakat.webp`: sceny czekania (pogodynek 6, bibliotekarz 4, komentator 2, piłkarz 3, start 3).
- `scena_wyniku__<stan>.mp4` i plakat: sceny wyniku (sześć obrazów pogodynka).
- `scena__otwarcie_v5.mp4` i `scena__otwarcie_v5__plakat.webp` w `start/`: scena otwierająca hero.

Tło wszystkich plików jest białe (#FFFFFF), bez przezroczystości. Katalog `sport_pilkarz` jest nieużywany: roli sportowej odpowiada `ASSET_DIRECTORY.sport` w `web/src/roles/manifest.ts`.

Brak pliku nigdy nie blokuje wyniku: widać rysunek z kodu albo nieruchomy obraz. Pochodzenie i prawa: `docs/POCHODZENIE_ILUSTRACJI.md`.

Scena w hero strony głównej: plakat widać od pierwszego ekranu, a wideo dochodzi dopiero po załadowaniu strony (bez blokowania pierwszego wyświetlenia). Domyślna jest scena otwierająca: wpisy `scena_otwierajaca` roli `start` z manifestu (dziś jeden klip, 8,4 s: wiadomość przylatuje do postaci, postać rozkłada mapę i trzyma ją w rękach; klip jest przycięty przed końcem wariantu v5, bo poprzedni klip miał błąd: pinezka była przypinana z zewnątrz mapy). Dopóki ich nie ma, hero odtwarza wpisy `scena_czekania` roli `start`. Kolejno odtwarzane są wszystkie wpisy (najpierw klipy bez pętli, na końcu pierwszy klip z `petla: true`, który zostaje zapętlony; bez wpisu z pętlą ostatni klip zostaje na ostatniej klatce). Nowy klip wystarczy dopisać w `web/src/roles/manifest.json` i wgrać pliki do `postacie/start/`. Scena startuje przy każdym wejściu na stronę główną. "Pomiń animację" zatrzymuje tylko bieżące odtwarzanie (nieruchoma klatka), a w tym samym miejscu pojawia się "Odtwórz animację"; wyboru nie zapisujemy między wizytami ani stronami (stary klucz `mylik.pomin-animacje` jest czyszczony przy starcie). Przy ograniczeniu ruchu i na wolnym łączu widać sam plakat (zapętlonego klipu, a bez niego pierwszego) z widocznym "Odtwórz animację". Po naturalnym końcu zostaje ostatnia klatka i też "Odtwórz animację". To samo dotyczy widoku czekania (dotyczy jednego sprawdzenia) i obrazu wyniku.

Sceny ról (`scena_czekania` i `scena_wyniku` pogodynka, bibliotekarza i sportu) nie grają w hero: pojawiają się dopiero po wpisaniu i wysłaniu wiadomości, w widoku czekania i wyniku.

Format klipów: mp4 H.264 bez dźwięku w zwykłym `<video>` (sterowanie z kodu), 576 x 720 px, 24 kl./s, do 1,5 MB na klip (dziś ok. 0,2-0,9 MB), bez animowanych AVIF. Plakaty to pierwsza klatka klipu w WebP.

Obraz wyniku (strona wyniku): słownik pogody pogodynka (słońce, deszcz, mgła itd.) pojawia się tylko przy temacie neutralnym. Przy temacie poważnym (lista wrażliwych słów z `src/roles/sensitive.ts`, dodatkowe słowa z `src/roles/live-words.ts`, dopasowanie znanej operacji, sygnał prompt injection, próba sterowania wyglądem) oraz w rolach bez własnego słownika wyniku jest jeden gest: postać wskazuje cytat i datę (obraz `praca__wskazuje` komentatora, `praca__wskaznik` pogodynka, w pozostałych rolach obraz `praca`), a cytat ze źródła dostaje akcent. Podpis pod obrazem to zawsze jedno proste zdanie.
