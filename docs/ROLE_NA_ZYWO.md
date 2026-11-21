# Role postaci na żywo

Wygląd wyniku (postać, scena czekania, obraz wyniku) zależy od roli. Rola jest tylko oprawą: nie zmienia werdyktu, siły podstawy, cytatu ani treści odpowiedzi, a jej wybór nie kosztuje wywołania modelu.

## Role

| Kod | Postać | Słowa (plik `src/roles/live-words.ts`) |
|---|---|---|
| `pogodynka` | Pogodynek (domyślna i poważna) | brak, rola awaryjna |
| `bibliotekarka` | Bibliotekarz | przepisy i prawa obywatela (lista tematu z `src/roles/topics.ts`) |
| `sport` | Komentator sportowy | przepisy gry, transfery, organizacja, wydarzenia okołosportowe, rozrywka |
| `pilkarz` | Piłkarz (grafitowy strój, bez numerów i barw, bez strzału i wyniku w scenach) | gra, mecze, wyniki, strzelcy |
| `konduktor` | Konduktor | kolej, transport, bilety |
| `listonosz` | Listonosz | poczta, przesyłki |
| `slusarz` | Strażnik zamków | hasła, zamki, bezpieczeństwo cyfrowe |
| `naukowiec` | Naukowiec | nauka, badania, kosmos, klimat |
| `lesnik` | Leśnik | las, przyroda, zwierzęta |
| `nauczyciel` | Nauczyciel | szkoła, egzaminy, edukacja |
| `kucharz` | Kucharz | jedzenie, gotowanie |
| `kasjer` | Kasjer | ceny, pieniądze, zakupy |

Zmiana słów to dopisanie rdzenia (bez polskich znaków, pasuje do początku słowa) albo `exact` dla całego słowa w `LIVE_ROLE_WORDS`. Zmiana postaci roli to wpis w `ASSET_DIRECTORY` (`web/src/roles/manifest.ts`) i w manifeście ilustracji.

## Zasady wyboru (`chooseLiveRole`)

Rola lekka tylko, gdy wszystkie warunki są spełnione:

1. temat jest neutralny: brak słów z listy tematów wrażliwych (`src/roles/sensitive.ts`), brak dodatkowych słów poważnych, brak dopasowania znanej operacji, brak sygnału prompt injection, brak próby sterowania wyglądem;
2. zgłoszenie ma dokładnie jedno twierdzenie;
3. jedna rola (rodzina sportowa liczy się razem) ma więcej trafień różnych rdzeni niż każda inna.

Remis między rodzinami, brak trafień albo którykolwiek powód poważny daje pogodynka. W rodzinie sportowej wygrywa ta rola, która ma więcej trafień; remis oddaje komentatorowi. Sportowe tematy poważne (śmierć, wypadek, doping, przemoc, wojna) zawsze dają pogodynka, a "strzelił gola" nie jest przemocą (samo "strzelanina" nadal jest tematem wrażliwym).

## Zapis przy rekordzie

Rola jest liczona raz, po odpowiedzi silnika, i zapisana w tabeli `record_roles` (`INSERT OR IGNORE`), więc ten sam adres `/r/<id>` zawsze ma tę samą rolę, nawet gdy później zmieni się lista słów. Odpowiedź API (`POST /api/verify`, strumień, `GET /api/records/:id`) ma dodatkowe pole `appearance: { role, serious }`. Awaria zapisu nie psuje odpowiedzi: pole znika, a interfejs używa pogodynka. Rekordy usunięte przez retencję zabierają ze sobą role. W logu zdarzeń jest `role_chosen` (rola i flaga, bez treści zgłoszenia).

Silnik (zamrożony) nadal zapisuje własne pole `role` z trzema wartościami; interfejs czyta `appearance.role` i tylko bez niego wraca do `role`.

## Interfejs

- Scena czekania: rola jest przewidywana z samego zgłoszenia (`predictLiveRole`, ostrożnie, jak wyżej); gdy wynik ma inną rolę, widać jej obraz.
- Obraz wyniku: słownik pogody ma tylko pogodynek i tylko przy temacie neutralnym; w pozostałych przypadkach jest gest wskazania cytatu i daty (zad. C).
- Parametr `?rola=<kod>` działa tylko w trybie deweloperskim.

## Test

`tests/roles/live.test.ts` ma 30+ wiadomości kontrolnych (każda rola, obie sportowe, tematy poważne ze sportu i szkoły, injection, incydent, sterowanie, wiele twierdzeń), zapis i stałość roli, retencję oraz awarię zapisu.
