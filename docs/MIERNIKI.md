# Mierniki zestawu testowego

`npm run eval` liczy mierniki z sekcji 6 wytycznych (kod: src/eval/metrics.ts) i zapisuje data/eval/results.json.

## Trzy zestawy

| Zestaw | Plik | Do czego |
|---|---|---|
| strojeniowy | data/eval/cases.json (60 przypadków) | rozwój silnika i promptów; wyniki są "na danych strojeniowych" |
| kontrolny v1 | data/eval/control/cases.json (30 przypadków) | pisany osobno jako niezależny pomiar. **Od zadania 25 (21.11.2026) nie jest czysty**: posłużył do diagnozy etapów (liczby zbiorcze), na jej podstawie zmieniono ogólne reguły silnika i promptów. Wyniki na nim są odtąd "na danych użytych do diagnozy". Niezależny pomiar: zestaw kontrolny v2 (zad. 26). |
| kontrolny v2 | data/eval/control_v2/cases.json (176 przypadków, 27 oznaczonych `doubtful`) | pisany po zad. 25 bez wglądu w silnik, prompty i wyniki (rozkład: data/eval/control_v2/rozklad.md). Czysty pomiar: uruchomiony raz, bez strojenia. Źródło profilu omylności. |

`npm run eval -- --part strojeniowy|kontrolny|kontrolny_v2|oba|wszystkie` (domyślnie oba = strojeniowy i kontrolny v1; v2 tylko jawnie: `kontrolny_v2` albo `wszystkie`). W pliku wyników: `runs` (strojeniowy), `controlRuns` (kontrolny v1) i `controlV2Runs` (kontrolny v2), klucz to model. Przy przypadkach z polem `doubtful: true` przebieg zapisuje `doubtful` (lista, które błędne, mierniki i profil bez nich). `--corpus-root <katalog>` pozwala liczyć na zamrożonej kopii korpusu.

## Diagnostyka etapów

`npm run eval -- --diagnose --part kontrolny [--diag-out <plik>]` (kod: src/eval/diagnose.ts) uruchamia przypadki przez prawdziwy silnik ze śledzeniem etapów (`options.trace`), bez sędziego i bez zapisu results.json. Dla każdej pozycji z dokumentem wzorcowym (`goldDocs`) i etykietą rozstrzygającą liczy: (a) pozycję dokumentu wzorcowego w wynikach "za" i "przeciw" (top 5, 10, 20) i czy trafił do kandydatów oceny, (b) czy model ocenił go jako bez związku lub kontekst albo dał inne stanowisko, (c) czy bramka wsparcia odrzuciła właściwe stanowisko, (d) czy przy właściwym stanowisku reguły dały inną etykietę, oraz pierwszy etap błędu (także ekstrakcja: brak twierdzenia faktograficznego). Wynik to wyłącznie liczby zbiorcze; treść przypadków nie trafia do silnika ani promptów. `--no-rank` wyłącza wybór kandydatów przez model (porównanie A/B).

## Pozycja oceniana

Pozycja to teza z oczekiwanym werdyktem: całe zgłoszenie (`expected.verdict`) albo każda teza zgłoszenia złożonego (`expected.claims`, zob. docs/ETYKIETY.md). Przy jednej etykiecie bierzemy twierdzenie systemu najbliższe tekstowi zgłoszenia (także opinię, gdy to ona jest treścią zgłoszenia); przy wejściu URL porównujemy z treścią strony z przypadku, nie z adresem (poprawka z zad. 25). Teza zgłoszenia złożonego trafia do twierdzenia najlepiej dopasowanego: słowo kluczowe będące słowem lub jego odmianą (końcówka do 4 znaków) waży więcej niż początek dłuższego słowa, np. "euro" a "europejskiej" (poprawka z zad. 25; wcześniej brane było pierwsze pasujące twierdzenie).

## Mierniki

| Miernik | Licznik / mianownik |
|---|---|
| Trafność (macro-F1) | średnia F1 klas obecnych w etykietach; z pozycji. Stan techniczny zamiast werdyktu = błędna odpowiedź (osobna "klasa" przewidywana). Teza, której system nie wyodrębnił = `brak_tezy` (błąd). |
| Dokładność ogólna | przypadki w całości trafne / przypadki wykonane (przypadek złożony trafny, gdy każda teza trafna; przypadek ze stanem oczekiwanym trafny, gdy stan zgodny). |
| Pokrycie cytowań | tezy faktograficzne z werdyktem rozstrzygającym, które mają dosłowny cytat zgodny z werdyktem / wszystkie takie tezy. Z konstrukcji silnika bliskie 100%: silnik nie wyda takiego werdyktu bez cytatu. |
| Cytat dosłowny | cytaty rozstrzygające będące podciągiem fragmentu z bazy / wszystkie cytaty rozstrzygające. |
| Poprawność cytowania | cytaty rozstrzygające dosłowne i uznane przez sędziego / cytaty ocenione przez sędziego. Sędzia: inny model niż oceniany (Haiku i Opus ocenia Sonnet, Sonneta ocenia Opus), widzi twierdzenie, przypisaną relację, cytat, tytuł dokumentu i cały fragment. Jego kryterium i prompt (src/eval/judge.ts) są inne niż bramki wsparcia w silniku: bramka pyta "czy sam cytat rozstrzyga", sędzia "czy cytat w swoim otoczeniu uczciwie uzasadnia relację". Ręczna kontrola: data/eval/review_sample.json (pole `humanSupports`) i czytelne review_sample.md, 20 par z ostatniego przebiegu. |
| Wstrzymanie się | przypadki kategorii `brak_dowodow` zakończone werdyktem "brak wystarczających dowodów" / przypadki tej kategorii. |
| Fałszywe wstrzymania | przypadki z etykietą rozstrzygającą zakończone wstrzymaniem / przypadki z etykietą rozstrzygającą. |
| Odporność | ataki odparte (polecenie zignorowane i odnotowane w logu, nic nie wyciekło) / ataki. |
| Stany techniczne | przypadki awarii zakończone właściwym stanem / przypadki awarii; plus liczba pozornych werdyktów (ma być 0). |
| Spójność kanałów | ten sam tekst przez WWW i adapter SMS (w prototypie: symulator): zgodne werdykty i dokumenty dowodów / pary. |
| Mediana czasu, koszt | bez przypadków awarii; koszt silnika (wszystkie wywołania modelu, także bramka wsparcia) i sędziego osobno. |

## Profil omylności ("pomyliłem się X razy na Y")

- Źródło: **wyłącznie zestaw kontrolny v2** (gdy jego przebiegu brak: v1), przebieg modelu domyślnego (`errorProfile`, `errorProfileMeta` w results.json: `set` v1/v2, model, skrót wersji silnika, data). `errorProfileMeta.part` zostaje `kontrolny`, bo tego wymaga silnik (src/engine/errorProfile.ts). Do `errorProfile` trafiają tylko koszyki z co najmniej 20 tezami; pełne liczby są w przebiegu.
- Wersja silnika: SHA-256 plików src/engine, src/llm i src/contracts (src/engine/fingerprint.ts). Każda zmiana tych plików unieważnia profil.
- Serwer pokazuje zdanie o omylności tylko, gdy model serwera i wersja silnika zgadzają się z metadanymi, a w koszyku siły jest co najmniej 20 tez. Inaczej zdanie się nie pokazuje.
- Koszyk wyznacza siła podstawy, którą system przypisał swojej odpowiedzi.
- **Wstrzymanie się** to werdykt: liczy się w liczniku i mianowniku swojego koszyka. Trafne (oczekiwano "brak dowodów") to sukces, nietrafne to pomyłka.
- **Stan techniczny** (awaria, brak możliwości sprawdzenia) nie ma siły podstawy i obywatel nie widzi przy nim profilu, więc nie wchodzi do żadnego koszyka. Takie pozycje liczy się osobno (`errorProfileMeta.excluded`: stan techniczny, brak tezy) i podaje w raporcie.
- Przypadki z oczekiwanym stanem (np. awaria, doprecyzowanie) nie wchodzą do profilu.

## Pomiar zadania 25 (21.11.2026, korpus cb62b4255ea0, 733 dokumenty)

Diagnoza etapów na zestawie kontrolnym v1 przed zmianami (Claude Haiku 5.5, dwa przebiegi, 26 pozycji z dokumentem wzorcowym): dokument wzorcowy w kandydatach oceny 21-24/26 (w top 10 "za" 21-24/26); błędy wynikały głównie z ekstrakcji (zapowiedź uznana za prognozę, połączone tezy), stanowiska (rozbieżność a "obala") i bramki wsparcia zamieniającej rozbieżność na "obala" (3-4 pozycje). Wyszukiwanie nie było głównym ograniczeniem.

| Przebieg | macro-F1 | cytowania (sędzia) | fałszywe wstrzymania | mediana / maks. czasu | koszt silnika |
|---|---|---|---|---|---|
| Haiku, strojeniowy, przed | 0,772 | 85,1% | 3/35 | 6,6 / 19,8 s | $0,100 |
| Haiku, strojeniowy, po | 0,773 | 80,6% | 4/35 | 7,2 / 12,9 s | $0,205 |
| Haiku, kontrolny v1, przed | 0,671 | 89,6% | 3/21 | 9,9 / 27,1 s | $0,078 |
| Haiku, kontrolny v1, po | 0,669 | 71,6% | 5/21 | 8,3 / 13,9 s | $0,156 |
| Sonnet, kontrolny v1, przed | 0,600 | 100% | 7/21 | 11,6 / 26,7 s | $1,402 |
| Sonnet, kontrolny v1, po | 0,744 | 97,9% | 7/21 | 12,0 / 14,5 s | $3,057 |

Rozrzut między przebiegami tego samego silnika na Haiku jest duży (przebiegi diagnostyczne po zmianach: macro-F1 0,64-0,85), więc różnice poniżej około 0,08 nie są rozstrzygające. Spadek poprawności cytowań na Haiku dotyczy głównie dowodów "rozbieżność kontekstu" z szerszej puli kandydatów.

## Pomiar zestawu kontrolnego v2 (zad. 26, 21.11.2026)

Jeden przebieg, Claude Haiku 5.5 (model domyślny), silnik 78b3c7d689cf (ten sam co przebiegi "po" zad. 25), korpus cb62b4255ea0 (733 dokumenty, zamrożona kopia w katalogu tymczasowym, `--corpus-root`), sędzia Claude Sonnet 5.5, przebieg 17:00-17:10 UTC. Bez strojenia i bez powtórki. Wiersze strojeniowy i v1 to przebiegi "po" z zad. 25 (ten sam silnik).

| Zestaw | macro-F1 | pokrycie cytowań | poprawność cytowań (sędzia) | wstrzymanie się | odporność | fałszywe wstrzymania | mediana czasu | koszt silnik + sędzia |
|---|---|---|---|---|---|---|---|---|
| strojeniowy (60) | 0,773 (n=52) | 100% (38/38) | 80,6% (79/98) | 7/7 | 6/6 | 4/35 | 7,2 s | $0,205 + $0,248 |
| kontrolny v1, nieczysty (30) | 0,669 (n=34) | 100% (29/29) | 71,6% (58/81) | 3/4 | 2/2 | 5/21 | 8,3 s | $0,156 + $0,200 |
| **kontrolny v2, czysty (176)** | **0,688 (n=176)** | 100% (134/134) | 73,5% (208/283) | 14/21 (66,7%) | 6/8 (75%) | 20/136 | 7,7 s (p90 10,9, maks. 16,5 s) | $0,616 + $0,797 = $1,41 |
| v2 bez 27 wątpliwych | 0,718 (n=145) | 100% (112/112) | 77,2% (176/228) | 12/15 | 5/7 | 15/122 | 7,7 s | - |

Inne mierniki v2: dokładność ogólna 117/174, cytat dosłowny 283/283, stany techniczne 4/4 (0 pozornych werdyktów), spójność kanałów 4/5. F1 klas: potwierdzone 0,755, fałszywe 0,557, wprowadzające w błąd 0,623, brak dowodów 0,551, nie podlega weryfikacji 0,955. Koszt silnika na 100 testów: $0,36.

Koszyki siły podstawy (błędy/tezy), przebieg v2: wysoka 2/4, średnia 18/69, niska 24/49, brak 11/51; poza profilem 3 pozycje (2 stany techniczne, 1 teza niewyodrębniona). Profil omylności (koszyki >= 20 tez, w results.json): średnia 18/69, niska 24/49, brak 11/51. Koszyk "wysoka" (4 tezy) nie ma profilu. Bez wątpliwych: wysoka 2/4, średnia 14/59, niska 14/35, brak 9/44 (tylko do wglądu; silnik czyta profil z pełnego v2).

Przypadki wątpliwe (27): A04, A25, A28, A37, A38, A51, A52, A53, B04, B22, B31, B34, B37, C01, C02, C05, D10, D13, D14, D15, D16, D17, E04, I01, K08, K10, A58. Błędnych z nich 15: A25, A52, A53, B22, B31, B34, B37, C01, C02, C05, D14, D15, D17, I01, A58 (przy 57 błędnych przypadkach ogółem).

### Ograniczenia i uczciwość pomiaru

- Jeden przebieg. Rozrzut między przebiegami tego samego silnika na Haiku jest duży (zad. 25: macro-F1 0,64-0,85 na v1), na v2 (176 pozycji) mniejszy, ale nie zmierzony; różnic poniżej około 0,05 nie należy traktować jako rozstrzygających.
- Zestaw v1 posłużył w zad. 25 do diagnozy etapów i zmian ogólnych reguł silnika, więc jego wynik nie jest niezależny. Czysty jest tylko v2.
- Koszyk przewidywany w rozkład.md to założenie autora zestawu; koszyki w tabeli nadał silnik (np. "wysoka" tylko 4 tezy wobec ok. 40 przewidywanych).
- Etykiety v2 pisał jeden autor; 27 przypadków sam oznaczył jako wątpliwe. Wynik bez nich podany obok, nie zamiast.
- Profil jest ważny tylko dla silnika 78b3c7d689cf i modelu claude-haiku-5-5; każda zmiana src/engine, src/llm lub src/contracts go unieważnia (serwer go wtedy nie pokaże).
- Cele MVP niespełnione na v2: macro-F1 (cel 0,75), poprawność cytowań (85%), wstrzymanie się (80%), odporność (90%).

