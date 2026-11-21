# Próbka cytatów do ręcznego przeglądu

Przebieg: claude-sonnet-5-5 (zestaw kontrolny), sędzia automatyczny: claude-opus-5-5, stan na 2026-11-21T15:36:14.503Z.
Wylosowano 20 z 40 par twierdzenie-cytat (kolejność wg skrótu SHA-256, niezależna od wyników).

Jak oceniać: przeczytaj twierdzenie, relację i cytat w otoczeniu fragmentu. Wpisz w pliku review_sample.json w polu `humanSupports` true (cytat uczciwie uzasadnia relację) albo false, a w `humanNote` krótki powód.

## 1. B04 (rozbieznosc_kontekstu)

- **Twierdzenie:** Policja zarządziła operację TOR po wybuchu na torach w miejscowości Mika w listopadzie 2024 roku.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wobec ryzyka kolejnych incydentów również na innych odcinkach sieci kolejowej konieczne było skoordynowanie działań służb odpowiedzialnych za bezpieczeństwo państwa. 21 listopada 2025 roku Komendant Główny Policji zarządził ogólnopolską operację policyjną pod kryptonimem „TOR”.”
- **Źródło:** Operacja TOR. Rok wspólnej służby na rzecz bezpieczeństwa kolei (https://policja.pl/pol/aktualnosci/284115,Operacja-TOR-Rok-wspolnej-sluzby-na-rzecz-bezpieczenstwa-kolei.html)
- **Sędzia automatyczny:** wspiera (Cytat opisuje zarządzenie operacji TOR, ale z datą 21 listopada 2025, a nie w 2024 roku.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wobec ryzyka kolejnych incydentów również na innych odcinkach sieci kolejowej konieczne było skoordynowanie działań służb odpowiedzialnych za bezpieczeństwo państwa. 21 listopada 2025 roku Komendant Główny Policji zarządził ogólnopolską operację policyjną pod kryptonimem „TOR”. Do wspólnych działań skierowano policjantów, funkcjonariuszy Straży Ochrony Kolei oraz żołnierzy Sił Zbrojnych RP. Ich zadaniem jest przeciwdziałanie aktom sabotażu i dywersji, ochrona strategicznych elementów infrastruktury kolejowej, a także zapewnienie bezpieczeństwa i porządku publicznego.

</details>

## 2. C01 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Polsce działa blisko 200 klas mundurowych dla przyszłych policjantów i strażników granicznych.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Niemal 10 tys. uczniów klas mundurowych w całej Polsce Niemal 10 tys. uczniów kształci się w klasach mundurowych o profilach przygotowujących do służby w Policji i Straży Granicznej. W liceach i technikach w całej Polsce funkcjonuje blisko 420 takich oddziałów, w tym ponad 180 klas drugich i ponad 230 klas pierwszych.”
- **Źródło:** Odbudowujemy i dbamy o bezpieczeństwo. Podsumowanie trzeciego tygodnia października w MSWiA (https://www.gov.pl/web/mswia/odbudowujemy-i-dbamy-o-bezpieczenstwo-podsumowanie-trzeciego-tygodnia-pazdziernika-w-mswia)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tych samych klas mundurowych, ale podaje inną skalę – blisko 420 oddziałów zamiast 200.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Policja pozostaje obecna i reaguje adekwatnie do sytuacji, także w dalszym ciągu całodobowo monitoruje sieć i reaguje na każde zgłoszenie. Niemal 10 tys. uczniów klas mundurowych w całej Polsce Niemal 10 tys. uczniów kształci się w klasach mundurowych o profilach przygotowujących do służby w Policji i Straży Granicznej. W liceach i technikach w całej Polsce funkcjonuje blisko 420 takich oddziałów, w tym ponad 180 klas drugich i ponad 230 klas pierwszych. MSWiA przekazało dotychczas ponad 13 mln zł na wyposażenie uczniów w sprzęt i mundury. Klasy mundurowe to projekt, który pozwala młodym ludziom zdobywać wiedzę i umiejętności przydatne w służbie na rzecz bezpieczeństwa Polek i Polaków.

</details>

## 3. B02 (obala)

- **Twierdzenie:** Ostrzeżenie sanepidu o żelkach konopnych BRAIN WASH zawierających THC dotyczy tylko jednej partii produktu.
- **Werdykt systemu:** falszywe
- **Cytat:** „Nazwa produktu: BRAIN WASH, suplement diety - żelki konopne o smaku wieloowocowym z dodatkiem witaminy C, 100 g Numer partii: 161026BW08O Data minimalnej trwałości: 16.10.2027 Producent/dystrybutor: DR JOINT sp. z o.o., ul. Prymasa Stefana Wyszyńskiego 1B, 62-800 Kalisz Nazwa produktu: BRAIN WASH, suplement diety - żelki konopne o smaku mango z dodatkiem L-teaniny, 100 g Numer partii: 0109BW09M Data minimalnej trwałości: 01.09.2027”
- **Źródło:** Aktualizacja ostrzeżenia publicznego dotyczącego żywności z dnia 28.10.2026: Stwierdzenie substancji psychoaktywnej w suplemencie diety (https://www.gov.pl/web/gis/aktualizacja-ostrzezenia-publicznego-dotyczacego-zywnosci-z-dnia-28102026-stwierdzenie-substancji-psychoaktywnej-w-suplemencie-diety)
- **Sędzia automatyczny:** wspiera (Cytat wymienia co najmniej dwie różne partie żelków BRAIN WASH objęte komunikatem, co przeczy twierdzeniu o jednej partii.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Nazwa produktu: BRAIN WASH, suplement diety - żelki konopne o smaku wieloowocowym z dodatkiem witaminy C, 100 g Numer partii: 161026BW08O Data minimalnej trwałości: 16.10.2027 Producent/dystrybutor: DR JOINT sp. z o.o., ul. Prymasa Stefana Wyszyńskiego 1B, 62-800 Kalisz Nazwa produktu: BRAIN WASH, suplement diety - żelki konopne o smaku mango z dodatkiem L-teaniny, 100 g Numer partii: 0109BW09M Data minimalnej trwałości: 01.09.2027

</details>

## 4. C03 (potwierdza)

- **Twierdzenie:** Producent pesto Łowicz później zapobiegawczo wycofał ze sprzedaży także drugą partię tego produktu.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Aktualizacja ostrzeżenia publicznego dotyczącego żywności z dnia 28.08.2026 r. Możliwa obecność toksyny botulinowej w zielonym pesto 18.09.2026 Zagrożenie: W nawiązaniu do komunikatu z dnia 28.08.2026 r. Główny Inspektor Sanitarny został poinformowany, że producent zdecydował o prewencyjnym wycofaniu dodatkowej partii zielonego pesto ze względu na możliwe zanieczyszczenie Clostridium botulinum jednego z surowców wykorzystanych do produkcji obu partii produktu - objętej ostrzeżeniem z dnia 28.08.2026 r. oraz określonej w niniejszym komunikacie.”
- **Źródło:** Aktualizacja ostrzeżenia publicznego dotyczącego żywności z dnia 28.08.2026 r. Możliwa obecność toksyny botulinowej w zielonym pesto (https://www.gov.pl/web/gis/aktualizacja-ostrzezenia-publicznego-dotyczacego-zywnosci-z-dnia-28082026-r-mozliwa-obecnosc-toksyny-botulinowej-w-zielonym-pesto)
- **Sędzia automatyczny:** wspiera (Cytat mówi o prewencyjnym wycofaniu przez producenta dodatkowej partii zielonego pesto po wcześniejszym komunikacie, choć sama nazwa marki Łowicz nie pada w podanym fragmencie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Aktualizacja ostrzeżenia publicznego dotyczącego żywności z dnia 28.08.2026 r. Możliwa obecność toksyny botulinowej w zielonym pesto 18.09.2026 Zagrożenie: W nawiązaniu do komunikatu z dnia 28.08.2026 r. Główny Inspektor Sanitarny został poinformowany, że producent zdecydował o prewencyjnym wycofaniu dodatkowej partii zielonego pesto ze względu na możliwe zanieczyszczenie Clostridium botulinum jednego z surowców wykorzystanych do produkcji obu partii produktu - objętej ostrzeżeniem z dnia 28.08.2026 r. oraz określonej w niniejszym komunikacie. Spożycie żywności zanieczyszczonej toksyną botulinową może prowadzić do choroby zwanej botulizmem.

</details>

## 5. A03 (potwierdza)

- **Twierdzenie:** System Cell Broadcast wysyła ostrzeżenie prosto na telefon, bez aplikacji i bez SMS-a.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Minister Marcin Kierwiński podpisał list intencyjny ws. systemu ostrzegania ludności cywilnej Cell Broadcast 14.10.2026 Minister spraw wewnętrznych i administracji Marcin Kierwiński podpisał list intencyjny ws. uruchomienia systemu ostrzegania ludności cywilnej Cell Broadcast. Umożliwi on wysyłanie ostrzeżeń bezpośrednio do użytkowników telefonów komórkowych na obszarze zagrożenia, bez konieczności instalowania aplikacji czy wysyłania SMS-ów.”
- **Źródło:** Minister Marcin Kierwiński podpisał list intencyjny ws. systemu ostrzegania ludności cywilnej Cell Broadcast (https://www.gov.pl/web/mswia/minister-marcin-kierwinski-podpisal-list-intencyjny-ws-systemu-ostrzegania-ludnosci-cywilnej-cell-broadcast)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi, że system umożliwi wysyłanie ostrzeżeń bezpośrednio na telefony bez aplikacji i SMS-ów.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Minister Marcin Kierwiński podpisał list intencyjny ws. systemu ostrzegania ludności cywilnej Cell Broadcast 14.10.2026 Minister spraw wewnętrznych i administracji Marcin Kierwiński podpisał list intencyjny ws. uruchomienia systemu ostrzegania ludności cywilnej Cell Broadcast. Umożliwi on wysyłanie ostrzeżeń bezpośrednio do użytkowników telefonów komórkowych na obszarze zagrożenia, bez konieczności instalowania aplikacji czy wysyłania SMS-ów. W uroczystości popisania listu wzięli udział przedstawiciele czterech największych operatorów sieci komórkowych oraz Rządowego Centrum Bezpieczeństwa. MSWiA na technologię Cell Broadcast przeznaczy blisko 100 mln zł ze środków Programu Ochrony Ludności i Obrony Cywilnej.

</details>

## 6. A01 (potwierdza)

- **Twierdzenie:** Pod koniec października w gdańskim porcie otwarto nowy terminal przeznaczony do obsługi budowy morskich farm wiatrowych na Bałtyku.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „30 października 2026 r. oficjalnie otwarto terminal instalacyjny offshore T5 w Porcie Gdańsk.”
- **Źródło:** Otwarto nowy terminal instalacyjny offshore w Porcie Gdańsk (https://www.gov.pl/web/infrastruktura/otwarto-nowy-terminal-instalacyjny-offshore-w-porcie-gdansk)
- **Sędzia automatyczny:** wspiera (Cytat podaje datę 30 października i otwarcie terminalu offshore w Porcie Gdańsk, a fragment wskazuje, że służy on morskiej energetyce wiatrowej na Bałtyku.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Otwarto nowy terminal instalacyjny offshore w Porcie Gdańsk 30.10.2026 Port Gdańsk zyskał nową infrastrukturę, która wesprze rozwój morskiej energetyki wiatrowej na Morzu Bałtyckim. 30 października 2026 r. oficjalnie otwarto terminal instalacyjny offshore T5 w Porcie Gdańsk. W uroczystości uczestniczył m.in. premier Donald Tusk oraz wiceminister infrastruktury Arkadiusz Marchewka. Inwestycja o wartości blisko 1,2 mld zł, dofinansowana kwotą 700 mln zł z Krajowego Planu Odbudowy, powiększyła lądowy obszar portu o ponad 21 hektarów.

</details>

## 7. A06 (obala)

- **Twierdzenie:** Polska przegrała z Niemcami rywalizację o centrum serwisowe pocisków PAC-3.
- **Werdykt systemu:** falszywe
- **Cytat:** „Myślę, że ta decyzja sprzed dwóch tygodni o tym, żeby na terytorium Polski ulokować pierwsze na świecie poza Stanami Zjednoczonymi centrum serwisowe do rakiet, do systemu Patriot, do pocisków PAC-3, że to lokalizacja będzie właśnie w Polsce, to świetny dowód na to i otwarcie nowego rozdziału w tej relacji handlowej pomiędzy Stanami Zjednoczonymi a Polską - powiedziała sekretarz stanu w Ministerstwie Obrony Narodowej Magdalena Sobkowiak-Czarnecka.”
- **Źródło:** Transatlantyckie Forum Przemysłu Obronnego w Warszawie (https://www.gov.pl/web/obrona-narodowa/transatlantyckie-forum-przemyslu-obronnego-w-warszawie)
- **Sędzia automatyczny:** wspiera (Cytat potwierdza decyzję o ulokowaniu centrum PAC-3 w Polsce, co przeczy twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

- Współpraca polsko-amerykańska, jeżeli chodzi o przemysł zbrojeniowy, ma bardzo długą historię i jest realizowana fantastycznie, ale czas przejść na nowy poziom. Dzisiaj Polska nie chce być już tylko kupującym, dzisiaj Polska z roli kupującego chce przejść do roli partnera. Centra serwisowe, koprodukcja, nasi poddostawcy czy inwestycje, to warunki, które dzisiaj stawiamy tym firmom, które chcą sprzedawać na rynku polskim. Myślę, że ta decyzja sprzed dwóch tygodni o tym, żeby na terytorium Polski ulokować pierwsze na świecie poza Stanami Zjednoczonymi centrum serwisowe do rakiet, do systemu Patriot, do pocisków PAC-3, że to lokalizacja będzie właśnie w Polsce, to świetny dowód na to i otwarcie nowego rozdziału w tej relacji handlowej pomiędzy Stanami Zjednoczonymi a Polską - powiedziała sekretarz stanu w Ministerstwie Obrony Narodowej Magdalena Sobkowiak-Czarnecka.

</details>

## 8. C01 (potwierdza)

- **Twierdzenie:** W Polsce działa blisko 200 klas mundurowych dla przyszłych policjantów i strażników granicznych.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „W całej Polsce mamy już blisko 200 klas mundurowych - o profilu policyjnym czy Straży Granicznej.”
- **Źródło:** Niemal 10 tys. uczniów klas mundurowych w całej Polsce (https://www.gov.pl/web/mswia/niemal-10-tys-uczniow-klas-mundurowych-w-calej-polsce)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi o blisko 200 klasach mundurowych o profilu policyjnym i Straży Granicznej.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

W oddziałach mundurowych o profilu służb MSWiA kształci się obecnie niemal 10 tys. uczniów, w tym ponad 4,6 tys. kobiet i ponad 5 tys. mężczyzn. Nauka w takich klasach otwiera przed absolwentami bezpośrednią ścieżkę do służby w Policji oraz Straży Granicznej. W całej Polsce mamy już blisko 200 klas mundurowych - o profilu policyjnym czy Straży Granicznej. Planujemy kolejne klasy, bo wiemy, jak ważna jest edukacja, która kształtuje postawy patriotyczne, buduje etos służby i przygotowuje młodych ludzi do pracy dla Polski. To bardzo dobry wybór - dobry dla uczniów, ale przede wszystkim dla Polski. Zrobimy wszystko, aby absolwenci klas mundurowych mieli szczególne możliwości rozwijania swoich talentów w polskich służbach. W tych trudnych i niebezpiecznych czasach każdy, kto wybiera służbę mundurową, zasługuje na ogromne uznanie

</details>

## 9. B02 (obala)

- **Twierdzenie:** Ostrzeżenie sanepidu o żelkach konopnych BRAIN WASH zawierających THC dotyczy tylko jednej partii produktu.
- **Werdykt systemu:** falszywe
- **Cytat:** „Ponadto przedsiębiorca podjął decyzję o dobrowolnym, zapobiegawczym wycofaniu również innych produktów marki BRAIN WASH wskazanych w tym komunikacie.”
- **Źródło:** Aktualizacja ostrzeżenia publicznego dotyczącego żywności z dnia 28.10.2026: Stwierdzenie substancji psychoaktywnej w suplemencie diety (https://www.gov.pl/web/gis/aktualizacja-ostrzezenia-publicznego-dotyczacego-zywnosci-z-dnia-28102026-stwierdzenie-substancji-psychoaktywnej-w-suplemencie-diety)
- **Sędzia automatyczny:** wspiera (Cytat mówi o wycofaniu również innych produktów marki BRAIN WASH, a fragment wymienia kilka numerów partii, co przeczy twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Ponadto przedsiębiorca podjął decyzję o dobrowolnym, zapobiegawczym wycofaniu również innych produktów marki BRAIN WASH wskazanych w tym komunikacie. Szczegóły dotyczące produktów Nazwa produktu: BRAIN WASH, suplement diety - żelki konopne o smaku wieloowocowym z dodatkiem witaminy C, 100 g Numery partii: 040826BW06O, 050826BW06O, 060826BW06O Data minimalnej trwałości: 07.08.2027 Producent/dystrybutor: DR JOINT sp. z o.o., ul. Prymasa Stefana Wyszyńskiego 1B, 62-800 Kalisz

</details>

## 10. C01 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Polsce działa blisko 200 klas mundurowych dla przyszłych policjantów i strażników granicznych.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Niemal 10 tys. uczniów klas mundurowych w całej Polsce 20.10.2026 Już niemal 10 tys. uczniów kształci się w klasach mundurowych dedykowanych Policji i Straży Granicznej. W liceach i technikach w całej Polsce działa niemal 420 takich klas, w tym ponad 180 klas drugich i ponad 230 klas pierwszych.”
- **Źródło:** Niemal 10 tys. uczniów klas mundurowych w całej Polsce (https://www.gov.pl/web/mswia/niemal-10-tys-uczniow-klas-mundurowych-w-calej-polsce)
- **Sędzia automatyczny:** wspiera (Cytat opisuje te same klasy mundurowe, lecz z inną liczbą – niemal 420 klas.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Niemal 10 tys. uczniów klas mundurowych w całej Polsce 20.10.2026 Już niemal 10 tys. uczniów kształci się w klasach mundurowych dedykowanych Policji i Straży Granicznej. W liceach i technikach w całej Polsce działa niemal 420 takich klas, w tym ponad 180 klas drugich i ponad 230 klas pierwszych. MSWiA przekazało łącznie ponad 13 mln zł na wyposażenie w sprzęt i mundury dla uczniów takich oddziałów. Klasy mundurowe to unikatowy projekt MSWiA, który przygotowuje młodych ludzi do służby na rzecz bezpieczeństwa Polek i Polaków.

</details>

## 11. A05 (obala)

- **Twierdzenie:** Sobota 21 listopada jest ostatnią w tym roku okazją, żeby bezpłatnie sprawdzić światła w samochodzie.
- **Werdykt systemu:** falszywe
- **Cytat:** „Kolejne sprawdzenia zaplanowano na 21 listopada oraz 5 grudnia br.”
- **Źródło:** 21 listopada sprawdź bezpłatnie światła w samochodzie (https://policja.pl/pol/aktualnosci/283982,21-listopada-sprawdz-bezplatnie-swiatla-w-samochodzie.html)
- **Sędzia automatyczny:** wspiera (Cytat podaje także termin 5 grudnia po 21 listopada, co przeczy twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Gdzie sprawdzić światła Z uwagi na to, że prawidłowe działanie świateł wymaga profesjonalnej oceny, w ramach kampanii „Twoje światła - Nasze bezpieczeństwo” odbędą się ogólnopolskie „dni otwarte” na 1567 stacjach kontroli pojazdów, na których kierowcy będą mieli możliwość bezpłatnego sprawdzenia świateł w swoich pojazdach. Kierowcy mieli już taką możliwość 24 października i 7 listopada. Kolejne sprawdzenia zaplanowano na 21 listopada oraz 5 grudnia br.

</details>

## 12. A03 (potwierdza)

- **Twierdzenie:** System Cell Broadcast wysyła ostrzeżenie prosto na telefon, bez aplikacji i bez SMS-a.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Cell Broadcast elementem systemu ostrzegania Minister spraw wewnętrznych i administracji Marcin Kierwiński podpisał list intencyjny ws. uruchomienia systemu ostrzegania ludności cywilnej Cell Broadcast. Umożliwi on wysyłanie ostrzeżeń bezpośrednio do użytkowników telefonów komórkowych na obszarze zagrożenia, bez konieczności instalowania aplikacji czy wysyłania SMS-ów.”
- **Źródło:** Rozwijamy system ostrzegania i dbamy o bezpieczeństwo. Podsumowanie drugiego tygodnia października w MSWiA (https://www.gov.pl/web/mswia/rozwijamy-system-ostrzegania-i-dbamy-o-bezpieczenstwo-podsumowanie-drugiego-tygodnia-pazdziernika-w-mswia)
- **Sędzia automatyczny:** wspiera (Cytat opisuje, że Cell Broadcast umożliwi wysyłanie ostrzeżeń bezpośrednio na telefony bez instalowania aplikacji i bez SMS-ów, co odpowiada twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Cell Broadcast elementem systemu ostrzegania Minister spraw wewnętrznych i administracji Marcin Kierwiński podpisał list intencyjny ws. uruchomienia systemu ostrzegania ludności cywilnej Cell Broadcast. Umożliwi on wysyłanie ostrzeżeń bezpośrednio do użytkowników telefonów komórkowych na obszarze zagrożenia, bez konieczności instalowania aplikacji czy wysyłania SMS-ów. W uroczystości popisania listu wzięli udział przedstawiciele czterech największych operatorów sieci komórkowych oraz Rządowego Centrum Bezpieczeństwa. MSWiA na technologię Cell Broadcast przeznaczy blisko 100 mln zł ze środków Programu Ochrony Ludności i Obrony Cywilnej. Pełne uruchomienie systemu zaplanowano na drugą połowę 2027 roku - po zaledwie 12 miesiącach prac.

</details>

## 13. B06 (obala)

- **Twierdzenie:** W cyberataku na polską energetykę pod koniec grudnia 2025 roku zaatakowano tylko jedną elektrociepłownię.
- **Werdykt systemu:** falszywe
- **Cytat:** „Opisaliśmy te ataki szczegółowo w naszym pierwotnym raporcie . Równolegle miał jednak miejsce jeszcze jeden incydent – w mniejszej elektrociepłowni dostarczającej ciepło dla 50 tys. mieszkańców.”
- **Źródło:** Uzupełnienie raportu z incydentu w sektorze energii w grudniu 2025 roku (https://cert.pl/posts/2026/08/uzupelnienie-raportu-incydent-sektor-energii-2025/)
- **Sędzia automatyczny:** wspiera (Fragment mówi o dużej elektrociepłowni oraz równoległym incydencie w drugiej, mniejszej elektrociepłowni, co przeczy tezie o jednej.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

29 grudnia 2025 roku doszło do skoordynowanych ataków na polską infrastrukturę energetyczną, m.in. na 30 farm wiatrowych i fotowoltaicznych oraz dużą elektrociepłownię. Opisaliśmy te ataki szczegółowo w naszym pierwotnym raporcie . Równolegle miał jednak miejsce jeszcze jeden incydent – w mniejszej elektrociepłowni dostarczającej ciepło dla 50 tys. mieszkańców. W wyniku opisywanego w raporcie ataku doszło do zatrzymania turbiny parowej oraz stacji uzdatniania wody do celów technicznych, co doprowadziło do przerwania kogeneracji czyli procesu, który polega na skojarzonej produkcji energii elektrycznej i cieplnej.

</details>

## 14. G01 (potwierdza)

- **Twierdzenie:** Na Dzień Otwarty MSZ w sobotę 21 listopada wstęp jest bezpłatny.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Zgłoszenia: Dzień Otwarty MSZ odbędzie się w sobotę 21 listopada 2026 r. w godz. 9:00 - 18:00 (ostatnie wejście o godz. 18:00). Udział w wydarzeniu jest bezpłatny.”
- **Źródło:** Dzień Otwarty w Ministerstwie Spraw Zagranicznych 21 listopada 2026 r. (https://www.gov.pl/web/dyplomacja/dzien-otwarty-w-ministerstwie-spraw-zagranicznych-21-listopada-2026-r)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że udział w Dniu Otwartym 21 listopada jest bezpłatny.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zgłoszenia: Dzień Otwarty MSZ odbędzie się w sobotę 21 listopada 2026 r. w godz. 9:00 - 18:00 (ostatnie wejście o godz. 18:00). Udział w wydarzeniu jest bezpłatny. Wszystkie zainteresowane osoby powyżej 13 roku życia prosimy o rejestrację. Dzieci poniżej 13. roku życia są zgłaszane przez osoby pełnoletnie i podlegają osobnej rejestracji. Prosimy pamiętać o zabraniu ze sobą w dniu wizyty dokumentu tożsamości wskazanego podczas rejestracji. FORMULARZ REJESTRACYJNY​ Wideo

</details>

## 15. G01 (potwierdza)

- **Twierdzenie:** Na Dzień Otwarty MSZ w sobotę 21 listopada obowiązuje wcześniejsza rejestracja.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Zgłoszenia: Dzień Otwarty MSZ odbędzie się w sobotę 21 listopada 2026 r. w godz. 9:00 - 18:00 (ostatnie wejście o godz. 18:00). Udział w wydarzeniu jest bezpłatny. Wszystkie zainteresowane osoby powyżej 13 roku życia prosimy o rejestrację.”
- **Źródło:** Dzień Otwarty w Ministerstwie Spraw Zagranicznych 21 listopada 2026 r. (https://www.gov.pl/web/dyplomacja/dzien-otwarty-w-ministerstwie-spraw-zagranicznych-21-listopada-2026-r)
- **Sędzia automatyczny:** wspiera (Cytat prosi wszystkie osoby powyżej 13 lat o rejestrację, a fragment wspomina formularz i dokument wskazany przy rejestracji, co potwierdza wymóg wcześniejszej rejestracji.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zgłoszenia: Dzień Otwarty MSZ odbędzie się w sobotę 21 listopada 2026 r. w godz. 9:00 - 18:00 (ostatnie wejście o godz. 18:00). Udział w wydarzeniu jest bezpłatny. Wszystkie zainteresowane osoby powyżej 13 roku życia prosimy o rejestrację. Dzieci poniżej 13. roku życia są zgłaszane przez osoby pełnoletnie i podlegają osobnej rejestracji. Prosimy pamiętać o zabraniu ze sobą w dniu wizyty dokumentu tożsamości wskazanego podczas rejestracji. FORMULARZ REJESTRACYJNY​ Wideo

</details>

## 16. B02 (obala)

- **Twierdzenie:** Ostrzeżenie sanepidu o żelkach konopnych BRAIN WASH zawierających THC dotyczy tylko jednej partii produktu.
- **Werdykt systemu:** falszywe
- **Cytat:** „Aktualizacja ostrzeżenia publicznego dotyczącego żywności z dnia 28.10.2026: Stwierdzenie substancji psychoaktywnej w suplemencie diety 10.11.2026 Zagrożenie W wyniku postępowania wyjaśniającego organów Państwowej Inspekcji Sanitarnej ustalono, że surowce użyte do produkcji partii żelków określonych w komunikacie z dnia 28.10.2026 zostały również wykorzystane do produkcji żelków konopnych o smaku wieloowocowym z niżej wymienionych partii.”
- **Źródło:** Aktualizacja ostrzeżenia publicznego dotyczącego żywności z dnia 28.10.2026: Stwierdzenie substancji psychoaktywnej w suplemencie diety (https://www.gov.pl/web/gis/aktualizacja-ostrzezenia-publicznego-dotyczacego-zywnosci-z-dnia-28102026-stwierdzenie-substancji-psychoaktywnej-w-suplemencie-diety)
- **Sędzia automatyczny:** wspiera (Cytat wskazuje, że te same surowce wykorzystano także do produkcji innych partii, więc ostrzeżenie nie dotyczy tylko jednej partii.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Aktualizacja ostrzeżenia publicznego dotyczącego żywności z dnia 28.10.2026: Stwierdzenie substancji psychoaktywnej w suplemencie diety 10.11.2026 Zagrożenie W wyniku postępowania wyjaśniającego organów Państwowej Inspekcji Sanitarnej ustalono, że surowce użyte do produkcji partii żelków określonych w komunikacie z dnia 28.10.2026 zostały również wykorzystane do produkcji żelków konopnych o smaku wieloowocowym z niżej wymienionych partii.

</details>

## 17. B01 (rozbieznosc_kontekstu)

- **Twierdzenie:** Po atakach w szkołach do ich ochrony skierowano łącznie 24 tysiące policjantów.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Podsumowanie pierwszego tygodnia października w MSWiA 12.10.2026 Wobec ostatnich ataków w szkołach skierowaliśmy do ich ochrony niemal 40 tys. policjantów.”
- **Źródło:** Dbamy o bezpieczeństwo najmłodszych. Podsumowanie pierwszego tygodnia października w MSWiA (https://www.gov.pl/web/mswia/dbamy-o-bezpieczenstwo-najmlodszych-podsumowanie-pierwszego-tygodnia-pazdziernika-w-mswia)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tego samego skierowania policjantów do ochrony szkół, lecz podaje inną skalę (niemal 40 tys. zamiast 24 tys.).)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Dbamy o bezpieczeństwo najmłodszych. Podsumowanie pierwszego tygodnia października w MSWiA 12.10.2026 Wobec ostatnich ataków w szkołach skierowaliśmy do ich ochrony niemal 40 tys. policjantów. Do szkół trafiła procedura reagowania na alarm. Rząd przeznaczy ponad 102 mld zł na Program Ochrony Ludności i Obrony Cywilnej na lata 2027-2031. Natychmiastowa reakcja MSWiA i służb na ataki w szkołach Po atakach w szkołach w Ostrołęce, Leszczydole-Nowinach i udaremnionym ataku w Sierpcu rząd zareagował szybko i zdecydowanie. Do kontroli szkół skierowano niemal 40 tys. funkcjonariuszy Policji, którzy dotychczas skontrolowali blisko 80 tys. placówek. Odnotowano 311 zdarzeń, w których zachodzi podejrzenie popełnienia czynu zabronionego. Zatrzymano 135 osób.

</details>

## 18. A04 (obala)

- **Twierdzenie:** Sanepid potwierdził, że w Rosji ludzie zachorowali na dżumę.
- **Werdykt systemu:** falszywe
- **Cytat:** „Na chwilę obecną w oficjalnych źródłach strony rosyjskiej ani międzynarodowych organizacji zdrowia publicznego nie opublikowano informacji potwierdzających wystąpienie przypadków dżumy u ludzi na terenie Federacji Rosyjskiej.”
- **Źródło:** Informacja dotycząca doniesień o możliwych przypadkach zachorowań na dżumę u ludzi na terenie Federacji Rosyjskiej (https://www.gov.pl/web/gis/informacja-dotyczaca-doniesien-o-mozliwych-przypadkach-zachorowan-na-dzume-u-ludzi-na-terenie-federacji-rosyjskiej)
- **Sędzia automatyczny:** wspiera (Komunikat służb sanitarnych stwierdza, że nie ma potwierdzonych przypadków dżumy u ludzi w Rosji, co przeczy twierdzeniu o potwierdzeniu zachorowań.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Informacja dotycząca doniesień o możliwych przypadkach zachorowań na dżumę u ludzi na terenie Federacji Rosyjskiej 05.10.2026 Polskie służby sanitarne na bieżąco śledzą sytuację epidemiologiczną w Polsce i na świecie. Na chwilę obecną w oficjalnych źródłach strony rosyjskiej ani międzynarodowych organizacji zdrowia publicznego nie opublikowano informacji potwierdzających wystąpienie przypadków dżumy u ludzi na terenie Federacji Rosyjskiej.

</details>

## 19. C02 (rozbieznosc_kontekstu)

- **Twierdzenie:** 21 listopada na ponad 1600 stacjach kontroli pojazdów będzie można za darmo sprawdzić światła w samochodzie.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Gdzie sprawdzić światła Z uwagi na to, że prawidłowe działanie świateł wymaga profesjonalnej oceny, w ramach kampanii „Twoje światła - Nasze bezpieczeństwo” odbędą się ogólnopolskie „dni otwarte” na 1567 stacjach kontroli pojazdów, na których kierowcy będą mieli możliwość bezpłatnego sprawdzenia świateł w swoich pojazdach.”
- **Źródło:** 21 listopada sprawdź bezpłatnie światła w samochodzie (https://policja.pl/pol/aktualnosci/283982,21-listopada-sprawdz-bezplatnie-swiatla-w-samochodzie.html)
- **Sędzia automatyczny:** wspiera (Cytat opisuje tę samą akcję, ale podaje inną skalę – 1567 stacji, czyli mniej niż 1600.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Gdzie sprawdzić światła Z uwagi na to, że prawidłowe działanie świateł wymaga profesjonalnej oceny, w ramach kampanii „Twoje światła - Nasze bezpieczeństwo” odbędą się ogólnopolskie „dni otwarte” na 1567 stacjach kontroli pojazdów, na których kierowcy będą mieli możliwość bezpłatnego sprawdzenia świateł w swoich pojazdach. Kierowcy mieli już taką możliwość 24 października i 7 listopada. Kolejne sprawdzenia zaplanowano na 21 listopada oraz 5 grudnia br.

</details>

## 20. A05 (obala)

- **Twierdzenie:** Sobota 21 listopada jest ostatnią w tym roku okazją, żeby bezpłatnie sprawdzić światła w samochodzie.
- **Werdykt systemu:** falszywe
- **Cytat:** „Najbliższa okazja do skorzystania z bezpłatnego sprawdzenia przypada dzisiaj 21 listopada 2026 roku. Kolejny termin zaplanowano na 5 grudnia 2026 roku.”
- **Źródło:** Nie daj się zaskoczyć ciemności. Dolnośląscy policjanci zachęcają: sprawdź bezpłatnie światła w swoim samochodzie - Policja Dolnośląska (https://dolnoslaska.policja.gov.pl/wr1/aktualnosci/biezace-inf/189255,Nie-daj-sie-zaskoczyc-ciemnosci-Dolnoslascy-policjanci-zachecaja-sprawdz-bezplat.html)
- **Sędzia automatyczny:** wspiera (Cytat wskazuje kolejny termin 5 grudnia, więc 21 listopada nie jest ostatnią okazją.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Najbliższa okazja do skorzystania z bezpłatnego sprawdzenia przypada dzisiaj 21 listopada 2026 roku. Kolejny termin zaplanowano na 5 grudnia 2026 roku. Wykaz stacji uczestniczących w kampanii można znaleźć na stronach internetowych Policji oraz partnerów przedsięwzięcia. Pomocna będzie również aplikacja Yanosik, która umożliwia odnalezienie najbliższej stacji oferującej bezpłatną kontrolę oświetlenia.

</details>

