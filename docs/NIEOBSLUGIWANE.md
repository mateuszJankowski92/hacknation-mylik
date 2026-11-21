# Czego Mylik nie obsługuje

Stan na 21.11.2026. Ujawniamy to jury i obywatelom wprost. W każdym z tych przypadków system nie zgaduje etykiety.

| Przypadek | Co się dzieje | Gdzie w kodzie |
|---|---|---|
| **F. Obraz, zdjęcie, zrzut ekranu** | Brak. Interfejs i API przyjmują tylko tekst albo adres URL. Nie ma odczytu tekstu z obrazu ani wyszukiwania odwrotnego obrazu. Tekst ze zrzutu trzeba przepisać. | `src/contracts/api.ts` (`text` albo `url`) |
| Dźwięk, wideo | Brak. | jw. |
| **H. Pętla informacji** | Brak. Nierozstrzygnięte zgłoszenie nie tworzy sprawy moderatora i nic nie jest nikomu przekazywane. System też nie twierdzi, że przekazał. Liczby wstrzymań są w `GET /api/stats` i w logu zdarzeń. | `src/obs` |
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
| Prawdziwy SMS pod numerem | Adapter SMS (w prototypie: symulator). Bez bramki operatora. | `src/sms`, [KOSZTY.md](KOSZTY.md) |
| Ostrzeżenia o znanych operacjach (EUvsDisinfo) w czystym klonie | Migawka nie jest w repozytorium (licencja niepotwierdzona). Bez niej brak tych ostrzeżeń, bez błędu. | `data/known-ops` |
| Basal na żywym modelu | Pomiar niewykonany: brak uruchomionej maszyny. | [MODELE.md](MODELE.md) |
