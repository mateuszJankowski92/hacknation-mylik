# Pochodzenie ilustracji

Postacie z papieru, obrazy wyniku i krótkie klipy w interfejsie WWW to materiały tymczasowe, wygenerowane modelami generatywnymi. Właściciel ocenia je w galerii i może je zastąpić samymi plikami (patrz niżej). Stan na 21.11.2026 (runda 4).

## Czym wygenerowano

| Rodzaj | Model | Identyfikator | Liczba plików w repozytorium |
|---|---|---|---|
| Obrazy postaci i obrazy wyniku | Seedream 5.5 Edit | `bytedance/seedream/v5.5/edit` | 12 |
| Sceny: otwierająca, czekania i wyniku | Seedance 2.5, obraz do wideo, 720p, bez dźwięku | `bytedance/seedance-2.5/image-to-video` | 25 |
| Wersje lekkie (WebP, H.264) | ffmpeg 6.0 z pakietu `ffmpeg-static`, bez modeli | brak | wszystkie |

Wszystkie postacie są rodzaju męskiego: pogodynek w niebieskiej koszuli, bibliotekarz w szałwiowym kardiganie, komentator sportowy w słuchawkach, piłkarz i postać startowa w bursztynowym szaliku. Dla każdej roli powstał jeden obraz wzorcowy (master), a pozostałe obrazy i pierwsze klatki klipów są jego edycją, więc strój i kolory są te same. Klipy powstały z klatki startowej (obrazu Seedream), więc postać jest ta sama w obrazie i w klipie. Dla każdego pliku manifest podaje model, identyfikator, nazwę źródłowego wariantu i czas wygenerowania.

Cała runda 4 (poza repozytorium, w paczce roboczej): 120 obrazów (124 wywołania, 0,042 USD za obraz) i 43 klipy, 391 s (0,473 USD za sekundę w 720p; stawka 480p to 0,2205 USD za sekundę, nieużyta), razem ok. 190 USD wg cennika fal.ai. Pełny opis wejścia, liczb i kosztów jest w `POCHODZENIE.md` paczki roboczej.

Wszystkie pliki mają białe tło (#FFFFFF), bez przezroczystości, a klipy nie mają dźwięku.

## Skąd lista plików

Źródłem jest `web/src/roles/manifest.json` (kopia paczki z katalogu roboczego galerii, tylko role użyte w interfejsie). Czytają z niego konfiguracja ról (`web/src/roles/manifest.ts`) i sceny (`web/src/scenes/config.ts`): ścieżki, teksty alternatywne, długości scen i rodzaj pliku nie są wpisane w kodzie. Pliki leżą w `web/public/postacie/<katalog>/`. Do repozytorium trafiły tylko lekkie wersje: obrazy `.webp` (720 x 900 px), klipy `.mp4` (576 x 720 px) i plakaty `.webp`. Pełnych obrazów PNG i archiwum prób nie ma.

Scena otwierająca (`start/scena__otwarcie.mp4`, 10 s) jest domyślną sceną hero strony głównej: wiadomość przylatuje do postaci, postać rozkłada mapę, przypina znacznik źródła, a obok zostaje czysta biała plama. Sceny ról grają dopiero po wpisaniu wiadomości (czekanie i wynik).

Katalog `sport_pilkarz` jest w paczce, ale nieużywany. Zamiana roli sportowej z komentatora na piłkarza to zmiana jednej wartości: `ASSET_DIRECTORY.sport` w `web/src/roles/manifest.ts` (z `'sport'` na `'sport_pilkarz'`).

## Jak podmienić ilustracje

1. Wrzuć nowe pliki do `web/public/postacie/<katalog>/` pod tymi samymi nazwami albo dodaj nowe i wpisz je w `web/src/roles/manifest.json`.
2. Zachowaj białe tło i proporcje 4:5 (obraz 720 x 900, klip 576 x 720).
3. Klip: wyciszony, do około 1,5 MB, 6-16 s.
4. `npm run build`. Test `web/src/roles/manifest.test.tsx` sprawdza, że każdy wpis ma plik, białe tło i rozmiar paczki poniżej 25 MB.

## Użycie i prawa

- Dozwolone użycie wynika z warunków każdego modelu i usługi, przez którą go uruchomiono. Strony modeli na fal.ai (21.11.2026) mają oznaczenie „Commercial use”, ale nie zawierają tekstu licencji, a regulaminu fal.ai nie analizowano, więc przed publikacją poza hackathonem właściciel musi potwierdzić warunki (zwłaszcza użycie komercyjne i wymóg oznaczenia treści jako wygenerowanych).
- Ochrona prawnoautorska treści generowanych jest niepewna: zależy od kraju i od wkładu człowieka (opis, wybór wariantów, obróbka). Nie zakładamy, że ktokolwiek ma do tych plików wyłączne prawa. Dlatego ilustracje są tymczasowe i łatwe do wymiany.
- Ilustracje nie niosą treści merytorycznej: werdykt, zdanie o źródle i cytat są takie same w każdej roli, a obraz stoi obok nich, nigdy zamiast.
- W czasie działania usługi nie ma żadnych wywołań do generatorów obrazów ani wideo. Pliki są statyczne i serwowane razem z interfejsem.
