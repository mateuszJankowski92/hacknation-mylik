# Próbka cytatów do ręcznego przeglądu

Przebieg: claude-haiku-5-5 (zestaw kontrolny_v2), sędzia automatyczny: claude-sonnet-5-5, stan na 2026-11-21T17:10:09.738Z.
Wylosowano 20 z 283 par twierdzenie-cytat (kolejność wg skrótu SHA-256, niezależna od wyników).

Jak oceniać: przeczytaj twierdzenie, relację i cytat w otoczeniu fragmentu. Wpisz w pliku review_sample.json w polu `humanSupports` true (cytat uczciwie uzasadnia relację) albo false, a w `humanNote` krótki powód.

## 1. B15 (rozbieznosc_kontekstu)

- **Twierdzenie:** Izby morskie zostały już zlikwidowane.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Obecnie rejestracją statków zajmują się izby morskie, a procedury nie zawsze odpowiadają potrzebom międzynarodowego transportu morskiego, w którym liczy się szybka obsługa i sprawny obieg dokumentów. Nowe przepisy zakładają przeniesienie zadań związanych z rejestracją statków do urzędu morskiego i utworzenie jednego, cyfrowego rejestru okrętowego.”
- **Źródło:** Polska bandera bardziej dostępna. Rząd upraszcza rejestrację statków (https://www.gov.pl/web/infrastruktura/polska-bandera-bardziej-dostepna-rzad-upraszcza-rejestracje-statkow)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi o rejestracji statków przez izby morskie i planowanym przeniesieniu zadań, a nie o likwidacji izb, więc nie opisuje tego samego zdarzenia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Obecnie rejestracją statków zajmują się izby morskie, a procedury nie zawsze odpowiadają potrzebom międzynarodowego transportu morskiego, w którym liczy się szybka obsługa i sprawny obieg dokumentów. Nowe przepisy zakładają przeniesienie zadań związanych z rejestracją statków do urzędu morskiego i utworzenie jednego, cyfrowego rejestru okrętowego. Wnioski i dokumenty będzie można składać elektronicznie, również w języku angielskim. Bezpłatny będzie także dostęp do informacji zawartych w rejestrze. Wprowadzone zostaną ponadto elektroniczne certyfikaty okrętowe, potwierdzające dane i status statku.

</details>

## 2. B15 (rozbieznosc_kontekstu)

- **Twierdzenie:** Statki rejestruje teraz urząd morski.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Nowe przepisy zakładają przeniesienie zadań związanych z rejestracją statków do urzędu morskiego i utworzenie jednego, cyfrowego rejestru okrętowego.”
- **Źródło:** Polska bandera bardziej dostępna. Rząd upraszcza rejestrację statków (https://www.gov.pl/web/infrastruktura/polska-bandera-bardziej-dostepna-rzad-upraszcza-rejestracje-statkow)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tego samego zdarzenia (przeniesienia rejestracji do urzędu morskiego), ale jako planowanego, a nie już dokonanego, co zgadza się z relacją różnicy warunków.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Obecnie rejestracją statków zajmują się izby morskie, a procedury nie zawsze odpowiadają potrzebom międzynarodowego transportu morskiego, w którym liczy się szybka obsługa i sprawny obieg dokumentów. Nowe przepisy zakładają przeniesienie zadań związanych z rejestracją statków do urzędu morskiego i utworzenie jednego, cyfrowego rejestru okrętowego. Wnioski i dokumenty będzie można składać elektronicznie, również w języku angielskim. Bezpłatny będzie także dostęp do informacji zawartych w rejestrze. Wprowadzone zostaną ponadto elektroniczne certyfikaty okrętowe, potwierdzające dane i status statku.

</details>

## 3. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Krajowe Centrum Przetwarzania Danych będzie kosztować 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wartość inwestycji wynosi 1,6 mld zł.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy kosztu tej samej inwestycji i podaje 1,6 mld zł zamiast 16 mld zł, więc właściwie pokazuje różnicę skali względem twierdzenia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa 09.11.2026 Bezpieczniejsze dane, większa odporność na awarie i stabilne działanie usług cyfrowych administracji publicznej - to główne korzyści z budowy Krajowego Centrum Przetwarzania Danych (KCPD). Nowoczesna infrastruktura pozwoli na bezpieczne przetwarzanie danych wykorzystywanych przez instytucje publiczne. Wartość inwestycji wynosi 1,6 mld zł. Projekt realizuje NASK - Państwowy Instytut Badawczy, a jego partnerem jest Ministerstwo Cyfryzacji.

</details>

## 4. I03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Służba celna w Wólce Kosowskiej przejęła podrobione towary warte 4 miliardy złotych.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Na widok funkcjonariuszy SCS sprzedawcy porzucili stoiska oraz busy z towarem i uciekli. Funkcjonariusze zabezpieczyli prawie 80 tys. sztuk odzieży, obuwia, galanterii, okularów, torebek, zabawek, perfum i innych akcesoriów z podrobionymi znakami towarowymi.”
- **Źródło:** Akcja KAS w Wólce Kosowskiej. Porzucony towar wart 44 mln zł - Ministerstwo Finansów - Krajowa Administracja Skarbowa (https://www.gov.pl/web/kas/akcja-kas-w-wolce-kosowskiej-porzucony-towar-wart-44-mln-zl)
- **Sędzia automatyczny:** nie wspiera (Cytat opisuje przebieg akcji i ilość towaru (80 tys. sztuk), ale nie podaje wartości ani skali finansowej, więc nie pokazuje wskazanej różnicy.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Sprzedaż odbywała się na tymczasowych stoiskach oraz bezpośrednio z busów. Na widok funkcjonariuszy SCS sprzedawcy porzucili stoiska oraz busy z towarem i uciekli. Funkcjonariusze zabezpieczyli prawie 80 tys. sztuk odzieży, obuwia, galanterii, okularów, torebek, zabawek, perfum i innych akcesoriów z podrobionymi znakami towarowymi. Sprzedawcy w trakcie ucieczki porzucili towary również wzdłuż ulicy i na chodniku. Wśród nich było blisko 8 tys. szt. e-papierosów i 340 liquidów zawierających łącznie ponad 392 l płynów do e-papierosów.

</details>

## 5. B09 (rozbieznosc_kontekstu)

- **Twierdzenie:** Nowa umowa na blisko 46 tys. karabinków Grot jest warta około 6 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Przykładem wykorzystania uwolnionych przez Skarb Państwa środków jest umowa na dostawę blisko 46 tys. karabinków MSBS GROT C14 A3 dla Sił Zbrojnych RP. Wartość kontraktu wynosi około 600 mln zł, a dostawy przewidziano na lata 2026-2027.”
- **Źródło:** Kolejne Groty dla Wojska Polskiego (https://www.gov.pl/web/obrona-narodowa/kolejne-groty-dla-wojska-polskiego)
- **Sędzia automatyczny:** nie wspiera (Cytat podaje wartość kontraktu około 600 mln zł, a nie 6 mld zł, więc nie jest podstawą twierdzenia o 6 mld zł (różnica skali o rząd wielkości).)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Przykładem wykorzystania uwolnionych przez Skarb Państwa środków jest umowa na dostawę blisko 46 tys. karabinków MSBS GROT C14 A3 dla Sił Zbrojnych RP. Wartość kontraktu wynosi około 600 mln zł, a dostawy przewidziano na lata 2026-2027. Przedmiotem zamówienia jest najnowsza wersja karabinka MSBS GROT C14 A3, opracowanego przez Fabrykę Broni „Łucznik” - Radom we współpracy z Wojskową Akademią Techniczną. Kolejne modyfikacje konstrukcji uwzględniają doświadczenia z eksploatacji wcześniejszych wersji oraz potrzeby zgłaszane przez żołnierzy, bezpośrednich użytkowników broni. Zmiany mają zwiększać ergonomię, funkcjonalność i efektywność użytkowania karabinka.

</details>

## 6. A04 (obala)

- **Twierdzenie:** ePUAP nie działa.
- **Werdykt systemu:** falszywe
- **Cytat:** „Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników.”
- **Źródło:** ePUAP ponownie działa w pełnym zakresie (https://www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie)
- **Sędzia automatyczny:** wspiera (Cytat mówi, że dziś ePUAP działa w pełnym zakresie, więc przeczy twierdzeniu o niedziałaniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpośrednio po wykryciu problemu prewencyjnie ograniczyliśmy dostęp do części systemu, aby zatrzymać zagrożenie i bezpiecznie rozpocząć działania naprawcze. Od tego momentu prowadziliśmy równolegle analizę incydentu, weryfikację bezpieczeństwa systemów, wdrażanie dodatkowych zabezpieczeń oraz stopniowe przywracanie usług. Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników. Etapowe przywracanie systemu było świadomym działaniem. Nie chcieliśmy uruchamiać usług szybciej kosztem ich bezpieczeństwa. Każdy kolejny element ePUAP udostępnialiśmy po sprawdzeniu, że może działać prawidłowo i bezpiecznie. Przed uruchomieniem systemu przeprowadziliśmy testy funkcjonalne i bezpieczeństwa.

</details>

## 7. A04 (obala)

- **Twierdzenie:** Nie wiadomo, kiedy ePUAP zostanie przywrócony do działania.
- **Werdykt systemu:** falszywe
- **Cytat:** „Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników.”
- **Źródło:** ePUAP ponownie działa w pełnym zakresie (https://www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi, że ePUAP już działa, ale twierdzenie dotyczy niewiedzy o przyszłym terminie przywrócenia, więc relacja nie pasuje.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpośrednio po wykryciu problemu prewencyjnie ograniczyliśmy dostęp do części systemu, aby zatrzymać zagrożenie i bezpiecznie rozpocząć działania naprawcze. Od tego momentu prowadziliśmy równolegle analizę incydentu, weryfikację bezpieczeństwa systemów, wdrażanie dodatkowych zabezpieczeń oraz stopniowe przywracanie usług. Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników. Etapowe przywracanie systemu było świadomym działaniem. Nie chcieliśmy uruchamiać usług szybciej kosztem ich bezpieczeństwa. Każdy kolejny element ePUAP udostępnialiśmy po sprawdzeniu, że może działać prawidłowo i bezpiecznie. Przed uruchomieniem systemu przeprowadziliśmy testy funkcjonalne i bezpieczeństwa.

</details>

## 8. D13 (obala)

- **Twierdzenie:** Mikrocefalię u dzieci w Brazylii wywołał wirus Zika, a nie szczepionka DTPA.
- **Werdykt systemu:** falszywe
- **Cytat:** „"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej. Nie podają jednak, o jakich naukowców chodzi ani na jakie badania się powołują.”
- **Źródło:** Tysiące noworodków chorują z powodu "szczepionki od Gatesów"? W tej historii nic się nie zgadza (https://konkret24.tvn24.pl/zdrowie/tysiace-noworodkow-choruja-z-powodu-szczepionki-od-gatesow-w-tej-historii-nic-sie-nie-zgadza-st9214449)
- **Sędzia automatyczny:** nie wspiera (Cytat przytacza tylko fałszywe twierdzenie z posta i zaznacza brak źródeł, więc nie przeczy tezie o Zice, lecz ją pośrednio wspiera; relacja „przeczy” jest błędna.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej. Nie podają jednak, o jakich naukowców chodzi ani na jakie badania się powołują.

</details>

## 9. A01 (potwierdza)

- **Twierdzenie:** Polska ponownie została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi, że Polska została wybrana do Rady ITU na kolejną kadencję, co potwierdza twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 10. A01 (potwierdza)

- **Twierdzenie:** Polska zdobyła na konferencji w Dosze 119 głosów.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat zawiera informację, że w Dosze Polska zdobyła 119 głosów, bez zastrzeżeń zmieniających sens.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 11. A02 (obala)

- **Twierdzenie:** Polska nie zdobyła mandatu w wyborach do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU).
- **Werdykt systemu:** falszywe
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat mówi, że Polska została wybrana do Rady ITU na kolejną kadencję, co przeczy twierdzeniu o braku mandatu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 12. K04 (potwierdza)

- **Twierdzenie:** Prezydent zawetował ustawę o DSA.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej.”
- **Źródło:** "Ponad 800 doradców" prezydenta? Policzyliśmy (https://konkret24.tvn24.pl/polityka/ponad-800-doradcow-prezydenta-policzylismy-st9341916)
- **Sędzia automatyczny:** wspiera (Cytat wprost podaje, że Nawrocki zawetował ustawę wdrażającą DSA 13 listopada 2026.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej. Ustawa miała umożliwić m.in. blokowanie nielegalnych treści w internecie. W uzasadnieniu weta prezydent stwierdził , że na końcowym etapie prac "w Senacie ponownie rozszerzono kompetencje urzędnicze w zakresie blokowania treści". Dodał, że "wróciło widmo urzędnika cenzora, który będzie podejmował decyzję, co wolno, a czego nie wolno w internecie". Profesor Zoll o "jednoosobowej" decyzji prezydenta "Nie jestem w stanie pojąć". Premier o decyzji prezydenta

</details>

## 13. B17 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów 17 listopada.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów - Ministerstwo Finansów - Krajowa Administracja Skarbowa (https://www.gov.pl/web/kas/kas-wspolnie-z-policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow)
- **Sędzia automatyczny:** nie wspiera (Cytat zawiera datę 17.11.2026 zgodną z twierdzeniem, więc nie pokazuje innej daty, miejsca ani skali.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii .

</details>

## 14. A25 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów - Policja Małopolska (https://malopolska.policja.gov.pl/krk/aktualnosci/aktualnosci/77640,KAS-wspolnie-z-Policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow.html)
- **Sędzia automatyczny:** nie wspiera (Cytat opisuje dokładnie to samo zdarzenie, w tym samym miejscu i skali, bez różnic, więc relacja „inna data, miejsce lub skala” jest błędna.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii. 29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.

</details>

## 15. A52 (potwierdza)

- **Twierdzenie:** Wody z wodociągu Święta Katarzyna nie wolno było pić.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h. W pozostałych próbkach wody pobranych w punktach poboru: Święta Katarzyna, ul. Główna 14a - Stacja Uzdatniania Wody, Święta Katarzyna, ul. Żernicka 17 - Budynek ZGK sp. z o.o., Święta Katarzyna, ul. H. Dąbrowskiego 3, Przedszkole, Święta Katarzyna, ul. Główna 1E, Przedszkole nie odnotowano przekroczenia dopuszczalnych wartości oznaczonych parametrów mikrobiologicznych.”
- **Źródło:** KOMUNIKAT NR 03/2025 w sprawie jakości wody uzdatnionej z wodociągu sieciowego Święta Katarzyna, - Powiatowa Stacja Sanitarno-Epidemiologiczna we Wrocławiu (https://www.gov.pl/web/psse-wroclaw/komunikat-nr-032025-w-sprawie-jakosci-wody-uzdatnionej-z-wodociagu-sieciowego-swieta-katarzyna)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi o przekroczeniu liczby mikroorganizmów w jednej próbce i braku przekroczeń w pozostałych, nie o zakazie picia wody.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h. W pozostałych próbkach wody pobranych w punktach poboru: Święta Katarzyna, ul. Główna 14a - Stacja Uzdatniania Wody, Święta Katarzyna, ul. Żernicka 17 - Budynek ZGK sp. z o.o., Święta Katarzyna, ul. H. Dąbrowskiego 3, Przedszkole, Święta Katarzyna, ul. Główna 1E, Przedszkole nie odnotowano przekroczenia dopuszczalnych wartości oznaczonych parametrów mikrobiologicznych.

</details>

## 16. A52 (obala)

- **Twierdzenie:** Wodą z wodociągu Święta Katarzyna można się było myć.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h.”
- **Źródło:** KOMUNIKAT NR 03/2025 w sprawie jakości wody uzdatnionej z wodociągu sieciowego Święta Katarzyna, - Powiatowa Stacja Sanitarno-Epidemiologiczna we Wrocławiu (https://www.gov.pl/web/psse-wroclaw/komunikat-nr-032025-w-sprawie-jakosci-wody-uzdatnionej-z-wodociagu-sieciowego-swieta-katarzyna)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi o przekroczeniu liczby mikroorganizmów w próbce i nie dotyczy wprost możliwości mycia się wodą.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h. W pozostałych próbkach wody pobranych w punktach poboru: Święta Katarzyna, ul. Główna 14a - Stacja Uzdatniania Wody, Święta Katarzyna, ul. Żernicka 17 - Budynek ZGK sp. z o.o., Święta Katarzyna, ul. H. Dąbrowskiego 3, Przedszkole, Święta Katarzyna, ul. Główna 1E, Przedszkole nie odnotowano przekroczenia dopuszczalnych wartości oznaczonych parametrów mikrobiologicznych.

</details>

## 17. B34 (potwierdza)

- **Twierdzenie:** Woda z wodociągu w Gałkowie Dużym w gminie Koluszki nie nadaje się do picia.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r .”
- **Źródło:** Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-publiczny-galkow-duzy-gm-koluszki---woda-nie-nadaje-sie-do-spozycia)
- **Sędzia automatyczny:** wspiera (Tytuł komunikatu z 16.07.2026 wprost stwierdza, że woda z wodociągu Gałków Duży nie nadaje się do spożycia, a fragment podaje przyczynę (enterokoki).)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r . Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia Dotyczy miejscowości: - Gałków Duży - Różyca, ul. Letniskowa - Gałków Parcela, ul. Dzieci Polskich Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w dniu 14 lipca 2026 r. pobrano do badań laboratoryjnych próbkę wody z wodociągu publicznego Gałków Duży w stacji wodociągowej (woda podawana do sieci). Na podstawie przeprowadzonych badań stwierdzono obecności enterokoków.

</details>

## 18. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Krajowe Centrum Przetwarzania Danych będzie kosztować 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Ponad 1,5 mld zł dofinansowania z Funduszy Europejskich Całkowita wartość projektu Krajowego Centrum Przetwarzania Danych wynosi 1,6 mld zł, z czego 1,558 mld zł stanowi dofinansowanie z programu Fundusze Europejskie na Rozwój Cyfrowy 2021-2027.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat podaje całkowitą wartość projektu 1,6 mld zł, czyli ten sam koszt w innej skali niż 16 mld zł w twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

W projekcie wykorzystane zostaną również technologie BIM (Building Information Modeling) oraz Digital Twin. Rozwiązania te umożliwią skuteczniejsze planowanie, monitorowanie i zarządzanie infrastrukturą na wszystkich etapach jej funkcjonowania. Ponad 1,5 mld zł dofinansowania z Funduszy Europejskich Całkowita wartość projektu Krajowego Centrum Przetwarzania Danych wynosi 1,6 mld zł, z czego 1,558 mld zł stanowi dofinansowanie z programu Fundusze Europejskie na Rozwój Cyfrowy 2021-2027.

</details>

## 19. A45 (potwierdza)

- **Twierdzenie:** Większość migrantów przyjeżdża do Polski do pracy, a nie po zasiłki.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się.”
- **Źródło:** Ekonomiczny bilans migracji - czy migranci przyjeżdżają tylko po zasiłki? (https://fakenews.pl/blog/ekonomiczny-bilans-migracji-czy-migranci-przyjezdzaja-tylko-po-zasilki/)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że większość migrantów przybywa do Polski w celu podjęcia pracy i utrzymania się, a otoczenie fragmentu (obalanie mitu o zasiłkach) potwierdza ten sens bez zastrzeżeń.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zatrzymaj się! Tworzenie treści kosztuje i jest czasochłonne. Może podarujesz nam kawę? Ekonomiczny bilans migracji – czy migranci przyjeżdżają tylko po zasiłki? Utworzone: 19 listopada 2025 Aktualizacja: 25 listopada 2025 przez Julia Dobrowolska Komentarze Jednym z najczęściej powtarzanych mitów dotyczących migracji jest przekonanie, że migranci przyjeżdżają po zasiłki i obciążają system socjalny. Tego typu stwierdzenia, będące źródłem napięć społecznych, często pojawiają się w debacie publicznej. Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się. Niniejsza seria tekstów ukazała się w ramach Tygodnia Edukacji Globalnej 2025.

</details>

## 20. A20 (potwierdza)

- **Twierdzenie:** Partia L0036 herbatki z pokrzywy firmy Herbapol zawiera za dużo alkaloidów pirolizydynowych.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Szczegóły dotyczące produktu: Produkt: Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek Producent: Herbapol - Lublin S.A., ul. Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa.”
- **Źródło:** Ostrzeżenie publiczne dotyczące żywności: alkaloidy pirolizydynowe w określonej partii herbatki ziołowej z pokrzywy (https://www.gov.pl/web/gis/ostrzezenie-publiczne-dotyczace-zywnosci-alkaloidy-pirolizydynowe-w-okreslonej-partii-herbatki-ziolowej-z-pokrzywy3)
- **Sędzia automatyczny:** wspiera (Cytat wskazuje produkt, producenta i partię L 0036 oraz informację o przekroczeniu dopuszczalnego poziomu alkaloidów pirolizydynowych, a fragment obok potwierdza wycofanie tej partii.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Szczegóły dotyczące produktu: Produkt: Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek Producent: Herbapol - Lublin S.A., ul. Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.

</details>

