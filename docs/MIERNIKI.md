# Mierniki zestawu testowego

`npm run eval` liczy mierniki z sekcji 6 wytycznych (kod: src/eval/metrics.ts) i zapisuje data/eval/results.json.

## Dwa zestawy

| Zestaw | Plik | Do czego |
|---|---|---|
| strojeniowy | data/eval/cases.json (60 przypadków) | rozwój silnika i promptów; wyniki są "na danych strojeniowych" |
| kontrolny v1 | data/eval/control/cases.json (30 przypadków) | pisany osobno jako niezależny pomiar. **Od zadania 25 (21.11.2026) nie jest czysty**: posłużył do diagnozy etapów (liczby zbiorcze), na jej podstawie zmieniono ogólne reguły silnika i promptów. Wyniki na nim są odtąd "na danych użytych do diagnozy". Niezależny pomiar: zestaw kontrolny v2 (zad. 26). |

`npm run eval -- --part strojeniowy|kontrolny|oba` (domyślnie oba; kontrolny pomijany, gdy pliku brak). W pliku wyników: `runs` (strojeniowy) i `controlRuns` (kontrolny), klucz to model. `--corpus-root <katalog>` pozwala liczyć na zamrożonej kopii korpusu.

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
| Spójność kanałów | ten sam tekst przez WWW i SMS: zgodne werdykty i dokumenty dowodów / pary. |
| Mediana czasu, koszt | bez przypadków awarii; koszt silnika (wszystkie wywołania modelu, także bramka wsparcia) i sędziego osobno. |

## Profil omylności ("pomyliłem się X razy na Y")

- Źródło: **wyłącznie zestaw kontrolny**, przebieg modelu domyślnego (`errorProfile`, `errorProfileMeta` w results.json: model, skrót wersji silnika, data).
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
