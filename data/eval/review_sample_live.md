# Próbka cytatów do ręcznego przeglądu

Przebieg: claude-haiku-5-5 (zestaw kontrolny_v2), sędzia automatyczny: claude-sonnet-5-5, stan na 2026-11-21T17:30:18.342Z.
Wylosowano 20 z 296 par twierdzenie-cytat (kolejność wg skrótu SHA-256, niezależna od wyników).

Jak oceniać: przeczytaj twierdzenie, relację i cytat w otoczeniu fragmentu. Wpisz w pliku review_sample.json w polu `humanSupports` true (cytat uczciwie uzasadnia relację) albo false, a w `humanNote` krótki powód.

## 1. B15 (rozbieznosc_kontekstu)

- **Twierdzenie:** Statki rejestruje urząd morski.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Obecnie rejestracją statków zajmują się izby morskie, a procedury nie zawsze odpowiadają potrzebom międzynarodowego transportu morskiego, w którym liczy się szybka obsługa i sprawny obieg dokumentów. Nowe przepisy zakładają przeniesienie zadań związanych z rejestracją statków do urzędu morskiego i utworzenie jednego, cyfrowego rejestru okrętowego.”
- **Źródło:** Polska bandera bardziej dostępna. Rząd upraszcza rejestrację statków (https://www.gov.pl/web/infrastruktura/polska-bandera-bardziej-dostepna-rzad-upraszcza-rejestracje-statkow)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi, że obecnie statki rejestrują izby morskie, a urząd morski ma to robić dopiero na mocy nowych przepisów, więc twierdzenie w czasie teraźniejszym jest przedstawione jako stan faktyczny, a nie plan, i relacja "ta sama sprawa z inną datą" nie czyni z cytatu podstawy tego twierdzenia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Obecnie rejestracją statków zajmują się izby morskie, a procedury nie zawsze odpowiadają potrzebom międzynarodowego transportu morskiego, w którym liczy się szybka obsługa i sprawny obieg dokumentów. Nowe przepisy zakładają przeniesienie zadań związanych z rejestracją statków do urzędu morskiego i utworzenie jednego, cyfrowego rejestru okrętowego. Wnioski i dokumenty będzie można składać elektronicznie, również w języku angielskim. Bezpłatny będzie także dostęp do informacji zawartych w rejestrze. Wprowadzone zostaną ponadto elektroniczne certyfikaty okrętowe, potwierdzające dane i status statku.

</details>

## 2. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Krajowe Centrum Przetwarzania Danych będzie kosztować 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wartość inwestycji wynosi 1,6 mld zł.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tej samej inwestycji, ale podaje skalę 1,6 mld zł zamiast 16 mld zł, więc słusznie pokazuje rozbieżność w wartości.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa 09.11.2026 Bezpieczniejsze dane, większa odporność na awarie i stabilne działanie usług cyfrowych administracji publicznej - to główne korzyści z budowy Krajowego Centrum Przetwarzania Danych (KCPD). Nowoczesna infrastruktura pozwoli na bezpieczne przetwarzanie danych wykorzystywanych przez instytucje publiczne. Wartość inwestycji wynosi 1,6 mld zł. Projekt realizuje NASK - Państwowy Instytut Badawczy, a jego partnerem jest Ministerstwo Cyfryzacji.

</details>

## 3. B09 (rozbieznosc_kontekstu)

- **Twierdzenie:** Nowa umowa na blisko 46 tys. karabinków Grot jest warta około 6 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wartość kontraktu wynosi około 600 mln zł, a dostawy przewidziano na lata 2026-2027.”
- **Źródło:** Kolejne Groty dla Wojska Polskiego (https://www.gov.pl/web/obrona-narodowa/kolejne-groty-dla-wojska-polskiego)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tej samej umowy na ok. 46 tys. karabinków Grot, ale podaje wartość 600 mln zł zamiast 6 mld zł, więc słusznie pokazuje inną skalę niż w twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Przykładem wykorzystania uwolnionych przez Skarb Państwa środków jest umowa na dostawę blisko 46 tys. karabinków MSBS GROT C14 A3 dla Sił Zbrojnych RP. Wartość kontraktu wynosi około 600 mln zł, a dostawy przewidziano na lata 2026-2027. Przedmiotem zamówienia jest najnowsza wersja karabinka MSBS GROT C14 A3, opracowanego przez Fabrykę Broni „Łucznik” - Radom we współpracy z Wojskową Akademią Techniczną. Kolejne modyfikacje konstrukcji uwzględniają doświadczenia z eksploatacji wcześniejszych wersji oraz potrzeby zgłaszane przez żołnierzy, bezpośrednich użytkowników broni. Zmiany mają zwiększać ergonomię, funkcjonalność i efektywność użytkowania karabinka.

</details>

## 4. D13 (obala)

- **Twierdzenie:** Mikrocefalię u dzieci w Brazylii wywołał wirus Zika, a nie szczepionka DTPA.
- **Werdykt systemu:** falszywe
- **Cytat:** „"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej. Nie podają jednak, o jakich naukowców chodzi ani na jakie badania się powołują.”
- **Źródło:** Tysiące noworodków chorują z powodu "szczepionki od Gatesów"? W tej historii nic się nie zgadza (https://konkret24.tvn24.pl/zdrowie/tysiace-noworodkow-choruja-z-powodu-szczepionki-od-gatesow-w-tej-historii-nic-sie-nie-zgadza-st9214449)
- **Sędzia automatyczny:** nie wspiera (Cytat przytacza fałszywe twierdzenie z posta i zaznacza brak źródeł, więc nie przeczy twierdzeniu o Zika, tylko je pośrednio wzmacnia, a relacja „przeczy” jest błędnie przypisana.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej. Nie podają jednak, o jakich naukowców chodzi ani na jakie badania się powołują.

</details>

## 5. K04 (rozbieznosc_kontekstu)

- **Twierdzenie:** Prezydent zawetował ustawę o DSA.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Ustawa czeka na podpis Prezydenta 05.11.2026 Szybsze usuwanie treści związanych z wykorzystywaniem seksualnym dzieci, skuteczniejsza walka z oszustwami internetowymi i jasne procedury reagowania na nielegalne treści w sieci. Ustawa wdrażająca unijne rozporządzenie o usługach cyfrowych (DSA) oczekuje na podpis Prezydenta RP.”
- **Źródło:** Bezpieczniejszy internet na ostatniej prostej. Ustawa czeka na podpis Prezydenta (https://www.gov.pl/web/cyfryzacja/bezpieczniejszy-internet-na-ostatniej-prostej-ustawa-czeka-na-podpis-prezydenta)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi, że ustawa czeka na podpis, nie opisuje weta, więc relacja o tym samym zdarzeniu z innymi warunkami nie zachodzi.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpieczniejszy internet na ostatniej prostej. Ustawa czeka na podpis Prezydenta 05.11.2026 Szybsze usuwanie treści związanych z wykorzystywaniem seksualnym dzieci, skuteczniejsza walka z oszustwami internetowymi i jasne procedury reagowania na nielegalne treści w sieci. Ustawa wdrażająca unijne rozporządzenie o usługach cyfrowych (DSA) oczekuje na podpis Prezydenta RP. Nowe przepisy określają, kiedy i na jakich zasadach organy państwa będą mogły nakazywać dostawcom usług pośrednich (platformom cyfrowym) usuwanie nielegalnych treści z internetu. Zakres i tempo podejmowanych działań będą zależeć od rodzaju przestępstwa oraz stopnia zagrożenia dla użytkowników.

</details>

## 6. A01 (potwierdza)

- **Twierdzenie:** Polska ponownie została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że Polska została wybrana do Rady ITU na kolejną kadencję.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 7. A01 (potwierdza)

- **Twierdzenie:** Polska zdobyła 119 głosów na konferencji w Dosze.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat podaje, że Polska zdobyła 119 głosów podczas konferencji PP-26 w Dosze.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 8. A02 (obala)

- **Twierdzenie:** Polska odpadła w wyborach do Rady ITU.
- **Werdykt systemu:** falszywe
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat mówi, że Polska została wybrana do Rady ITU na kolejną kadencję, więc przeczy twierdzeniu o odpadnięciu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 9. K04 (potwierdza)

- **Twierdzenie:** Prezydent zawetował ustawę o DSA.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej.”
- **Źródło:** "Ponad 800 doradców" prezydenta? Policzyliśmy (https://konkret24.tvn24.pl/polityka/ponad-800-doradcow-prezydenta-policzylismy-st9341916)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że 13 listopada 2026 Nawrocki zawetował ustawę wdrażającą DSA.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej. Ustawa miała umożliwić m.in. blokowanie nielegalnych treści w internecie. W uzasadnieniu weta prezydent stwierdził , że na końcowym etapie prac "w Senacie ponownie rozszerzono kompetencje urzędnicze w zakresie blokowania treści". Dodał, że "wróciło widmo urzędnika cenzora, który będzie podejmował decyzję, co wolno, a czego nie wolno w internecie". Profesor Zoll o "jednoosobowej" decyzji prezydenta "Nie jestem w stanie pojąć". Premier o decyzji prezydenta

</details>

## 10. B17 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów 17 listopada.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów - Ministerstwo Finansów - Krajowa Administracja Skarbowa (https://www.gov.pl/web/kas/kas-wspolnie-z-policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow)
- **Sędzia automatyczny:** nie wspiera (Cytat podaje tę samą akcję w Kielcach i skalę, ale z datą publikacji 17.11.2026, a nie z inną datą, więc nie pokazuje przypisanej relacji różnicy.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii .

</details>

## 11. A25 (potwierdza)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów - Policja Małopolska (https://malopolska.policja.gov.pl/krk/aktualnosci/aktualnosci/77640,KAS-wspolnie-z-Policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow.html)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi o zabezpieczeniu prawie 11 mln szt. papierosów bez polskich znaków akcyzy podczas działań w Kielcach.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii. 29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.

</details>

## 12. A52 (potwierdza)

- **Twierdzenie:** Wody z wodociągu Święta Katarzyna nie wolno było pić.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h. W pozostałych próbkach wody pobranych w punktach poboru: Święta Katarzyna, ul. Główna 14a - Stacja Uzdatniania Wody, Święta Katarzyna, ul. Żernicka 17 - Budynek ZGK sp. z o.o., Święta Katarzyna, ul. H. Dąbrowskiego 3, Przedszkole, Święta Katarzyna, ul. Główna 1E, Przedszkole nie odnotowano przekroczenia dopuszczalnych wartości oznaczonych parametrów mikrobiologicznych.”
- **Źródło:** KOMUNIKAT NR 03/2025 w sprawie jakości wody uzdatnionej z wodociągu sieciowego Święta Katarzyna, - Powiatowa Stacja Sanitarno-Epidemiologiczna we Wrocławiu (https://www.gov.pl/web/psse-wroclaw/komunikat-nr-032025-w-sprawie-jakosci-wody-uzdatnionej-z-wodociagu-sieciowego-swieta-katarzyna)
- **Sędzia automatyczny:** nie wspiera (Cytat dotyczy późniejszego komunikatu o jakości wody, wskazuje jedynie przekroczenie jednego parametru w jednej próbce i nie mówi o zakazie picia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h. W pozostałych próbkach wody pobranych w punktach poboru: Święta Katarzyna, ul. Główna 14a - Stacja Uzdatniania Wody, Święta Katarzyna, ul. Żernicka 17 - Budynek ZGK sp. z o.o., Święta Katarzyna, ul. H. Dąbrowskiego 3, Przedszkole, Święta Katarzyna, ul. Główna 1E, Przedszkole nie odnotowano przekroczenia dopuszczalnych wartości oznaczonych parametrów mikrobiologicznych.

</details>

## 13. A52 (obala)

- **Twierdzenie:** Wodą z wodociągu Święta Katarzyna można się było myć.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h.”
- **Źródło:** KOMUNIKAT NR 03/2025 w sprawie jakości wody uzdatnionej z wodociągu sieciowego Święta Katarzyna, - Powiatowa Stacja Sanitarno-Epidemiologiczna we Wrocławiu (https://www.gov.pl/web/psse-wroclaw/komunikat-nr-032025-w-sprawie-jakosci-wody-uzdatnionej-z-wodociagu-sieciowego-swieta-katarzyna)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi o przekroczeniu liczby mikroorganizmów w jednej próbce i nie dotyczy zakazu mycia; fragment dodaje, że w pozostałych próbkach nie było przekroczeń.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h. W pozostałych próbkach wody pobranych w punktach poboru: Święta Katarzyna, ul. Główna 14a - Stacja Uzdatniania Wody, Święta Katarzyna, ul. Żernicka 17 - Budynek ZGK sp. z o.o., Święta Katarzyna, ul. H. Dąbrowskiego 3, Przedszkole, Święta Katarzyna, ul. Główna 1E, Przedszkole nie odnotowano przekroczenia dopuszczalnych wartości oznaczonych parametrów mikrobiologicznych.

</details>

## 14. B34 (potwierdza)

- **Twierdzenie:** Woda z wodociągu w Gałkowie Dużym w gminie Koluszki nie nadaje się do picia.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r . Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia Dotyczy miejscowości: - Gałków Duży - Różyca, ul.”
- **Źródło:** Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-publiczny-galkow-duzy-gm-koluszki---woda-nie-nadaje-sie-do-spozycia)
- **Sędzia automatyczny:** wspiera (Tytuł komunikatu i fragment mówią, że woda nie nadaje się do spożycia, a badania wykazały enterokoki.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r . Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia Dotyczy miejscowości: - Gałków Duży - Różyca, ul. Letniskowa - Gałków Parcela, ul. Dzieci Polskich Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w dniu 14 lipca 2026 r. pobrano do badań laboratoryjnych próbkę wody z wodociągu publicznego Gałków Duży w stacji wodociągowej (woda podawana do sieci). Na podstawie przeprowadzonych badań stwierdzono obecności enterokoków.

</details>

## 15. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Krajowe Centrum Przetwarzania Danych będzie kosztować 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Ponad 1,5 mld zł dofinansowania z Funduszy Europejskich Całkowita wartość projektu Krajowego Centrum Przetwarzania Danych wynosi 1,6 mld zł, z czego 1,558 mld zł stanowi dofinansowanie z programu Fundusze Europejskie na Rozwój Cyfrowy 2021-2027.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy kosztu tego samego projektu i podaje 1,6 mld zł zamiast 16 mld zł, więc pokazuje rozbieżność w skali.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

W projekcie wykorzystane zostaną również technologie BIM (Building Information Modeling) oraz Digital Twin. Rozwiązania te umożliwią skuteczniejsze planowanie, monitorowanie i zarządzanie infrastrukturą na wszystkich etapach jej funkcjonowania. Ponad 1,5 mld zł dofinansowania z Funduszy Europejskich Całkowita wartość projektu Krajowego Centrum Przetwarzania Danych wynosi 1,6 mld zł, z czego 1,558 mld zł stanowi dofinansowanie z programu Fundusze Europejskie na Rozwój Cyfrowy 2021-2027.

</details>

## 16. A24 (potwierdza)

- **Twierdzenie:** Mężczyzna, który w krakowskim Bieżanowie strzelał do policjantów, był obywatelem Ukrainy.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Sprawca zamachu jest Ukraińcem/Ukraina zorganizowała zamach - narracja wygasła szybko po potwierdzeniu narodowości zamachowca przez służby.”
- **Źródło:** Narracje dezinformacyjne związane z zamachem terrorystycznym w Krakowie (https://www.gov.pl/web/cyfryzacja/narracje-dezinformacyjne-zwiazane-z-zamachem-terrorystycznym-w-krakowie)
- **Sędzia automatyczny:** nie wspiera (Cytat opisuje wygasłą narrację dezinformacyjną, a nie potwierdza, że sprawca był Ukraińcem; dotyczy też innego zdarzenia (zamach), więc nie jest podstawą potwierdzenia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Istnieje związek między strzelaniną w Krakowie a protestami pod Trybunałem Konstytucyjnym - to także narracja popularna w pierwszych godzinach od zamachu i mogła łącznie osiągnąć nawet 14 mln zasięgu, wygasła w sposób naturalny. Bazowała głównie na fałszywej informacji o niewystarczającej ilości przedstawicieli służb na miejscu zdarzenia. Sprawca zamachu jest Ukraińcem/Ukraina zorganizowała zamach - narracja wygasła szybko po potwierdzeniu narodowości zamachowca przez służby. Po tym podejmowane były próby przekształcenia narracji w dezinformację o tym, że sprawca był najemnikiem walczącym dla ukraińskiej armii.

</details>

## 17. A53 (rozbieznosc_kontekstu)

- **Twierdzenie:** Od początku 2027 r. szczepienia przeciw HPV mają być w Polsce obowiązkowe dla dzieci i nastolatków w wieku 9-15 lat.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Schemat szczepień i termin realizacji bezpłatnych szczepień u osób dorosłych Szczepienia realizowane są w okresie od 1 października 2026 r. do 31 maja 2027 r. Obejmuje podanie 3 dawek w schemacie 0, 1, 6 miesięcy. Warunkiem skorzystania z bezpłatnych szczepień, jest podanie wszystkich 3 dawek do końca maja 2027 r.”
- **Źródło:** Komunikat nr 2 Głównego Inspektora Sanitarnego ws. bezpłatnych szczepień przeciw wirusowi brodawczaka ludzkiego (HPV) u osób dorosłych w wieku 19-26 lat - przekazanie dodatkowych dawek szczepionki 2-walentnej (https://www.gov.pl/web/gis/komunikat-nr-2-glownego-inspektora-sanitarnego-ws-bezplatnych-szczepien-przeciw-wirusowi-brodawczaka-ludzkiego-hpv-u-osob-doroslych-w-wieku-19-26-lat---przekazanie-dodatkowych-dawek-szczepionki-2-walentnej)
- **Sędzia automatyczny:** nie wspiera (Cytat dotyczy bezpłatnych, zalecanych (nieobowiązkowych) szczepień dorosłych w latach 2026-2027, a nie obowiązkowych szczepień dzieci, więc nie jest wariantem tego samego zdarzenia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Schemat szczepień i termin realizacji bezpłatnych szczepień u osób dorosłych Szczepienia realizowane są w okresie od 1 października 2026 r. do 31 maja 2027 r. Obejmuje podanie 3 dawek w schemacie 0, 1, 6 miesięcy. Warunkiem skorzystania z bezpłatnych szczepień, jest podanie wszystkich 3 dawek do końca maja 2027 r. Placówki wykonujące szczepienia Szczepienie przeciw HPV w ramach Programu bezpłatnych szczepień osób dorosłych należy do szczepień zalecanych, które są wykonywane w trybie wskazanym w art. 19 ust. 2 ustawy z dnia 5 grudnia 2008 r. o zapobieganiu oraz zwalczaniu zakażeń i chorób zakaźnych u ludzi (Dz. U. z 2025 r. poz. 1675 z późn. zm.). Do realizacji szczepienia właściwe są placówki POZ posiadające umowę z Narodowym Funduszem Zdrowia na udzielanie świadczeń podstawowej opieki zdrowotnej.

</details>

## 18. A45 (potwierdza)

- **Twierdzenie:** Fakenews.pl pisze, że większość migrantów przyjeżdża do Polski do pracy, a nie po zasiłki.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się.”
- **Źródło:** Ekonomiczny bilans migracji - czy migranci przyjeżdżają tylko po zasiłki? (https://fakenews.pl/blog/ekonomiczny-bilans-migracji-czy-migranci-przyjezdzaja-tylko-po-zasilki/)
- **Sędzia automatyczny:** nie wspiera (Cytat pochodzi z dokumentu o innym tytule, a twierdzenie przypisuje treść serwisowi Fakenews.pl, którego fragment nie wskazuje jako autora.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zatrzymaj się! Tworzenie treści kosztuje i jest czasochłonne. Może podarujesz nam kawę? Ekonomiczny bilans migracji – czy migranci przyjeżdżają tylko po zasiłki? Utworzone: 19 listopada 2025 Aktualizacja: 25 listopada 2025 przez Julia Dobrowolska Komentarze Jednym z najczęściej powtarzanych mitów dotyczących migracji jest przekonanie, że migranci przyjeżdżają po zasiłki i obciążają system socjalny. Tego typu stwierdzenia, będące źródłem napięć społecznych, często pojawiają się w debacie publicznej. Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się. Niniejsza seria tekstów ukazała się w ramach Tygodnia Edukacji Globalnej 2025.

</details>

## 19. A45 (potwierdza)

- **Twierdzenie:** Większość migrantów przyjeżdża do Polski do pracy.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się.”
- **Źródło:** Ekonomiczny bilans migracji - czy migranci przyjeżdżają tylko po zasiłki? (https://fakenews.pl/blog/ekonomiczny-bilans-migracji-czy-migranci-przyjezdzaja-tylko-po-zasilki/)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że większość migrantów przybywa do Polski, by podjąć pracę, a kontekst fragmentu tego nie osłabia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zatrzymaj się! Tworzenie treści kosztuje i jest czasochłonne. Może podarujesz nam kawę? Ekonomiczny bilans migracji – czy migranci przyjeżdżają tylko po zasiłki? Utworzone: 19 listopada 2025 Aktualizacja: 25 listopada 2025 przez Julia Dobrowolska Komentarze Jednym z najczęściej powtarzanych mitów dotyczących migracji jest przekonanie, że migranci przyjeżdżają po zasiłki i obciążają system socjalny. Tego typu stwierdzenia, będące źródłem napięć społecznych, często pojawiają się w debacie publicznej. Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się. Niniejsza seria tekstów ukazała się w ramach Tygodnia Edukacji Globalnej 2025.

</details>

## 20. A45 (potwierdza)

- **Twierdzenie:** Większość migrantów nie przyjeżdża do Polski po zasiłki.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się.”
- **Źródło:** Ekonomiczny bilans migracji - czy migranci przyjeżdżają tylko po zasiłki? (https://fakenews.pl/blog/ekonomiczny-bilans-migracji-czy-migranci-przyjezdzaja-tylko-po-zasilki/)
- **Sędzia automatyczny:** wspiera (Cytat przeciwstawia się micie o zasiłkach i mówi, że większość przybywa do pracy i samodzielnego utrzymania, co wspiera twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zatrzymaj się! Tworzenie treści kosztuje i jest czasochłonne. Może podarujesz nam kawę? Ekonomiczny bilans migracji – czy migranci przyjeżdżają tylko po zasiłki? Utworzone: 19 listopada 2025 Aktualizacja: 25 listopada 2025 przez Julia Dobrowolska Komentarze Jednym z najczęściej powtarzanych mitów dotyczących migracji jest przekonanie, że migranci przyjeżdżają po zasiłki i obciążają system socjalny. Tego typu stwierdzenia, będące źródłem napięć społecznych, często pojawiają się w debacie publicznej. Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się. Niniejsza seria tekstów ukazała się w ramach Tygodnia Edukacji Globalnej 2025.

</details>

