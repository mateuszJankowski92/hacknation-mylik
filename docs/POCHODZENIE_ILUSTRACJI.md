# Pochodzenie ilustracji

Postacie z papieru, obrazy wyniku i krótkie klipy w interfejsie WWW to materiały tymczasowe, wygenerowane modelami generatywnymi. Właściciel ocenia je w galerii i może je zastąpić samymi plikami (patrz niżej). Stan na 21.11.2026.

## Czym wygenerowano

| Rodzaj | Model | Identyfikator | Liczba plików |
|---|---|---|---|
| Obrazy postaci i obrazy wyniku | Seedream 5.5 Edit | `bytedance/seedream/v5.5/edit` | 11 |
| Klipy czekania i wyniku | MiniMax Hailuo H3 Max Turbo | `minimax/h3-max-turbo/image-to-video` | 15 |
| Klip rozkładania się mapy (start) | Seedance 2.5 | `bytedance/seedance-2.5/image-to-video` | 1 |
| Obraz `wynik__slonce` | lustrzane odbicie wariantu 1, zrobione kodem | brak | 1 |

Klipy powstały z klatki startowej (obrazu Seedream), więc postać jest ta sama w obrazie i w klipie. Dla każdego pliku manifest podaje model, identyfikator, nazwę źródłowego wariantu i czas wygenerowania.

Wszystkie pliki mają białe tło (#FFFFFF), bez przezroczystości, a klipy nie mają dźwięku.

## Skąd lista plików

Źródłem jest `web/src/roles/manifest.json` (kopia paczki z katalogu roboczego galerii). Czytają z niego konfiguracja ról (`web/src/roles/manifest.ts`) i sceny (`web/src/scenes/config.ts`): ścieżki, teksty alternatywne, długości scen i rodzaj pliku nie są wpisane w kodzie. Pliki leżą w `web/public/postacie/<katalog>/`. Do repozytorium trafiły tylko lżejsze wersje: obrazy `.webp` (640 px szerokości), klipy `.mp4` i plakaty `.png`. Pełnych obrazów PNG i archiwum prób nie ma.

Katalog `sport_pilkarz` jest w paczce, ale nieużywany. Zamiana roli sportowej z komentatora na piłkarza to zmiana jednej wartości: `ASSET_DIRECTORY.sport` w `web/src/roles/manifest.ts` (z `'sport'` na `'sport_pilkarz'`).

## Jak podmienić ilustracje

1. Wrzuć nowe pliki do `web/public/postacie/<katalog>/` pod tymi samymi nazwami albo dodaj nowe i wpisz je w `web/src/roles/manifest.json`.
2. Zachowaj białe tło i proporcje 4:5 (obraz 640 x 800, klip 576 x 720).
3. Klip: wyciszony, do około 1,5 MB, 4-8 s.
4. `npm run build`. Test `web/src/roles/manifest.test.tsx` sprawdza, że każdy wpis ma plik, białe tło i rozmiar paczki poniżej 25 MB.

## Użycie i prawa

- Dozwolone użycie wynika z warunków każdego modelu i usługi, przez którą go uruchomiono. W tym zadaniu nie sprawdzano ich na stronach modeli, więc przed publikacją poza hackathonem właściciel musi je potwierdzić (zwłaszcza użycie komercyjne i wymóg oznaczenia treści jako wygenerowanych).
- Ochrona prawnoautorska treści generowanych jest niepewna: zależy od kraju i od wkładu człowieka (opis, wybór wariantów, obróbka). Nie zakładamy, że ktokolwiek ma do tych plików wyłączne prawa. Dlatego ilustracje są tymczasowe i łatwe do wymiany.
- Ilustracje nie niosą treści merytorycznej: werdykt, zdanie o źródle i cytat są takie same w każdej roli, a obraz stoi obok nich, nigdy zamiast.
- W czasie działania usługi nie ma żadnych wywołań do generatorów obrazów ani wideo. Pliki są statyczne i serwowane razem z interfejsem.
