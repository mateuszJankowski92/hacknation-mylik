# Czego Mylik nie obsługuje

Stan na 21.11.2026 (aktualizacja zad. 40). Ujawniamy to jury i obywatelom wprost. W każdym z tych przypadków system nie zgaduje etykiety.

| Przypadek | Co się dzieje | Gdzie w kodzie |
|---|---|---|
| **F. Obraz, zdjęcie, zrzut ekranu** | Brak. Interfejs i API przyjmują tylko tekst albo adres URL. Nie ma odczytu tekstu z obrazu ani wyszukiwania odwrotnego obrazu. Tekst ze zrzutu trzeba przepisać. | `src/contracts/api.ts` (`text` albo `url`) |
| Dźwięk, wideo | Brak. | jw. |
| Weryfikacje Demagoga w naszym zbiorze | Mechanizm gotowy (plik JSONL jako źródło), ale danych brak: serwis blokuje nasz klient (403, Cloudflare), a nie obchodzimy zabezpieczeń; pełny korpus wymaga zgody redakcji. Do weryfikacji Demagoga docieramy tylko przez indeks Google, który dopasowuje frazy dosłownie, więc często ich nie zwraca. | `src/corpus/reviews.ts`, `data/raw/demagog/LICENCJA.md` |
| Indeks Google Fact Check Tools bez klucza | Przy `FACTCHECK_LAYER=auto` warstwa wyłączona (system działa jak przed zad. 40). Przy `on`: stan techniczny, gdy zbiór nie rozstrzyga. Warstwa niesprawdzona na żywo (brak klucza w zad. 40). | `src/factcheck` |
| Pytanie o rozbieżność liczb („dlaczego … 650, a nie 700?”) | Przypisujemy ocenę redakcji i odsyłamy do publikacji; nie streszczamy artykułu redakcji ani nie wyjaśniamy różnicy własnymi słowami. | `src/render/answer.ts` |
| Portal Odyseusz (odyseusz.msz.gov.pl) w zbiorze | Brak: ochrona przed botami (Incapsula) i treść renderowana skryptem; zgodnie z zasadami katalogu nie obchodzimy zabezpieczeń. Komunikaty MSZ (gov.pl/web/dyplomacja) są w zbiorze. | `data/sources.json` |
| **H. Pętla informacji** | Obsługiwana w warstwie serwera (nie jest już „nieobsługiwana”). Twierdzenie bez wystarczających dowodów tworzy lub aktualizuje sprawę (deduplikacja, licznik powtórzeń), którą widzi urzędnik pod `/urzednik` (token). Obywatel widzi „zapisano” albo, dopiero po oznaczeniu przez urzędnika, „przekazano”. **Ograniczenia:** nie wysyłamy e-maili ani powiadomień (jest licznik i miejsce na adres), deduplikacja jest prosta, zdanie o zapisaniu nie trafia do odpowiedzi SMS. | [PETLA_INFORMACJI.md](PETLA_INFORMACJI.md), `src/cases` |
| URL za paywallem lub logowaniem | Nie obchodzimy zabezpieczeń. Odpowiedź 401/403 lub inna niż 2xx daje stan „brak możliwości wykonania sprawdzenia”. | `src/engine/fetch` (`status_http`) |
| Strona wymagająca JavaScriptu, PDF, plik | Pobieramy tylko HTML i zwykły tekst. Inaczej ten sam stan (`zly_typ_tresci`, `pusta_tresc`). | `src/engine/fetch/index.ts` |
| Adres lokalny, prywatny, nietypowy port | Odrzucany (ochrona SSRF). | `src/engine/fetch` |
| Posty z serwisów społecznościowych | Zwykle wymagają logowania albo JavaScriptu, więc kończą się jak wyżej. Tekst posta trzeba wkleić. | jw. |
| Język inny niż polski | Nie wspieramy i nie mierzyliśmy. Korpus i odpowiedzi są po polsku. Tekst w innym języku może zostać przetworzony, ale bez gwarancji jakości. | `src/llm/prompts.ts` |
| Tekst dłuższy niż 2000 znaków (SMS: 480) | Prośba o skrócenie (`potrzeba_doprecyzowania`). | `src/input/index.ts`, `src/sms/webhook.ts` |
| Pytanie otwarte bez tezy („kto…?”, „ile…?”, „gdzie…?”) | Nie jest sprawdzeniem: prośba o zdanie do sprawdzenia z przykładem (`potrzeba_doprecyzowania`). Pytanie tak/nie („Czy…?”, „Czy to prawda, że…?”) i wstęp „podobno”, „słyszałem, że” są obsługiwane: sprawdzamy tezę z pytania. | `src/input/question.ts` |
| Więcej niż 5 twierdzeń w jednym tekście | Sprawdzamy najwyżej 5 najważniejszych. | `MAX_CLAIMS` w `src/engine/pipeline.ts` |
| Same polecenia dla systemu, bez informacji | Prośba o opisanie zdarzenia; bez rekordu (znana luka, [RYZYKA.md](RYZYKA.md)). | `src/engine/injection.ts` |
| Zdarzenia nowsze niż migawka źródeł | Zwykle „brak wystarczających dowodów”. Druga warstwa źródeł mogłaby pomóc, ale jest domyślnie wyłączona. | [ZRODLA.md](ZRODLA.md) |
| Załączniki, obrazki i osadzenia na Discordzie | Nic: czytamy wyłącznie tekst komendy lub treść wskazanej wiadomości. Wiadomość bez tekstu (same załączniki) dostaje prosty komunikat, bez sprawdzania. Wynik z polecenia z menu wiadomości jest zawsze widoczny tylko dla pytającego (to polecenie nie ma opcji). | `src/discord/handler.ts` |
| Tekst na Discordzie dłuższy niż 2000 znaków | Natychmiastowa prośba o skrócenie, bez wołania silnika. | `src/discord/handler.ts` |
| Prawdziwy SMS pod numerem | Adapter SMS (w prototypie: symulator). Bez bramki operatora. | `src/sms`, [KOSZTY.md](KOSZTY.md) |
| Ostrzeżenia o znanych operacjach (EUvsDisinfo) w czystym klonie | Migawka nie jest w repozytorium (licencja niepotwierdzona). Bez niej brak tych ostrzeżeń, bez błędu. | `data/known-ops` |
| Basal na żywym modelu | Pomiar niewykonany: brak uruchomionej maszyny. | [MODELE.md](MODELE.md) |
