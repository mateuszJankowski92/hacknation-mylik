# Ilustracje postaci

Lista plików, teksty alternatywne i długości scen są w `web/src/roles/manifest.json` (kopia paczki z galerii). Pliki leżą w `postacie/<katalog>/`; nazwa to `<rodzaj>__<stan>`:

- `praca__<stan>.webp`: postać (hero i czekanie); rola `start` ma `spoczynek` i `slucha`.
- `wynik__<stan>.webp`: obrazy wyniku (dziś tylko `pogodynka`: słońce, słońce za chmurą, deszcz, mgła, pusta mapa, zakłócenia).
- `scena__<stan>.mp4` i `scena__<stan>__plakat.png`: sceny czekania.
- `scena_wyniku__<stan>.mp4` i plakat: sceny wyniku (cztery obrazy pogodynki).

Tło wszystkich plików jest białe (#FFFFFF), bez przezroczystości. Katalog `sport_pilkarz` jest nieużywany: roli sportowej odpowiada `ASSET_DIRECTORY.sport` w `web/src/roles/manifest.ts`.

Brak pliku nigdy nie blokuje wyniku: widać rysunek z kodu albo nieruchomy obraz. Pochodzenie i prawa: `docs/POCHODZENIE_ILUSTRACJI.md`.

Scena w hero strony głównej: kolejno odtwarzane są wszystkie wpisy `scena_czekania` roli `start` z manifestu (najpierw klipy bez pętli, na końcu pierwszy klip z `petla: true`, który zostaje zapętlony). Nowy klip wystarczy dopisać w `web/src/roles/manifest.json` i wgrać pliki do `postacie/start/`. Przy ograniczeniu ruchu widać sam plakat zapętlonego klipu, a "Pomiń animację" zostawia nieruchomą postać `praca__spoczynek`.
