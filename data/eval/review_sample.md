# Próbka cytatów do ręcznego przeglądu

Przebieg: claude-haiku-5-5 (zestaw kontrolny_v2), sędzia automatyczny: claude-sonnet-5-5, stan na 2026-11-22T03:57:42.794Z.
Wylosowano 20 z 221 par twierdzenie-cytat (kolejność wg skrótu SHA-256, niezależna od wyników).

Jak oceniać: przeczytaj twierdzenie, relację i cytat w otoczeniu fragmentu. Wpisz w pliku review_sample.json w polu `humanSupports` true (cytat uczciwie uzasadnia relację) albo false, a w `humanNote` krótki powód.

## 1. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Krajowe Centrum Przetwarzania Danych będzie kosztować 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wartość inwestycji wynosi 1,6 mld zł.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tej samej inwestycji i podaje inną skalę kosztu (1,6 mld zamiast 16 mld zł), co zgadza się z przypisaną relacją.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa 09.11.2026 Bezpieczniejsze dane, większa odporność na awarie i stabilne działanie usług cyfrowych administracji publicznej - to główne korzyści z budowy Krajowego Centrum Przetwarzania Danych (KCPD). Nowoczesna infrastruktura pozwoli na bezpieczne przetwarzanie danych wykorzystywanych przez instytucje publiczne. Wartość inwestycji wynosi 1,6 mld zł. Projekt realizuje NASK - Państwowy Instytut Badawczy, a jego partnerem jest Ministerstwo Cyfryzacji.

</details>

## 2. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Koszt Krajowego Centrum Przetwarzania Danych wyniesie 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wartość inwestycji wynosi 1,6 mld zł.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat opisuje ten sam koszt KCPD z inną wartością (1,6 mld zł wobec 16 mld zł), więc relacja różnicy skali jest trafna.)
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

## 4. A04 (obala)

- **Twierdzenie:** System ePUAP jest od 10 listopada całkowicie wyłączony.
- **Werdykt systemu:** falszywe
- **Cytat:** „Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników.”
- **Źródło:** ePUAP ponownie działa w pełnym zakresie (https://www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie)
- **Sędzia automatyczny:** wspiera (Cytat stwierdza, że ePUAP działa dziś w pełnym zakresie, co przeczy twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpośrednio po wykryciu problemu prewencyjnie ograniczyliśmy dostęp do części systemu, aby zatrzymać zagrożenie i bezpiecznie rozpocząć działania naprawcze. Od tego momentu prowadziliśmy równolegle analizę incydentu, weryfikację bezpieczeństwa systemów, wdrażanie dodatkowych zabezpieczeń oraz stopniowe przywracanie usług. Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników. Etapowe przywracanie systemu było świadomym działaniem. Nie chcieliśmy uruchamiać usług szybciej kosztem ich bezpieczeństwa. Każdy kolejny element ePUAP udostępnialiśmy po sprawdzeniu, że może działać prawidłowo i bezpiecznie. Przed uruchomieniem systemu przeprowadziliśmy testy funkcjonalne i bezpieczeństwa.

</details>

## 5. D13 (obala)

- **Twierdzenie:** Mikrocefalię u dzieci w Brazylii wywołał wirus Zika, a nie szczepionka DTPA.
- **Werdykt systemu:** falszywe
- **Cytat:** „"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej. Nie podają jednak, o jakich naukowców chodzi ani na jakie badania się powołują.”
- **Źródło:** Tysiące noworodków chorują z powodu "szczepionki od Gatesów"? W tej historii nic się nie zgadza (https://konkret24.tvn24.pl/zdrowie/tysiace-noworodkow-choruja-z-powodu-szczepionki-od-gatesow-w-tej-historii-nic-sie-nie-zgadza-st9214449)
- **Sędzia automatyczny:** nie wspiera (Cytat tylko przytacza fałszywe twierdzenie z wpisu, a dalsze zdanie zaznacza brak źródeł, więc nie pokazuje, że twierdzenie o Zika jest nieprawdziwe.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej. Nie podają jednak, o jakich naukowców chodzi ani na jakie badania się powołują.

</details>

## 6. A01 (potwierdza)

- **Twierdzenie:** Polska ponownie dostała się do Rady Międzynarodowego Związku Telekomunikacyjnego.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi, że Polska została wybrana do Rady ITU na kolejną kadencję.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 7. A01 (potwierdza)

- **Twierdzenie:** Polska zdobyła 119 głosów na konferencji w Dosze.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost podaje, że na konferencji w Dosze Polska zdobyła 119 głosów.)
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
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej.”
- **Źródło:** "Ponad 800 doradców" prezydenta? Policzyliśmy (https://konkret24.tvn24.pl/polityka/ponad-800-doradcow-prezydenta-policzylismy-st9341916)
- **Sędzia automatyczny:** wspiera (Cytat wprost podaje, że Nawrocki zawetował rządową ustawę wdrażającą DSA.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej. Ustawa miała umożliwić m.in. blokowanie nielegalnych treści w internecie. W uzasadnieniu weta prezydent stwierdził , że na końcowym etapie prac "w Senacie ponownie rozszerzono kompetencje urzędnicze w zakresie blokowania treści". Dodał, że "wróciło widmo urzędnika cenzora, który będzie podejmował decyzję, co wolno, a czego nie wolno w internecie". Profesor Zoll o "jednoosobowej" decyzji prezydenta "Nie jestem w stanie pojąć". Premier o decyzji prezydenta

</details>

## 10. B17 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów 17 listopada.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów - Ministerstwo Finansów - Krajowa Administracja Skarbowa (https://www.gov.pl/web/kas/kas-wspolnie-z-policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow)
- **Sędzia automatyczny:** nie wspiera (Cytat potwierdza datę 17.11 (data publikacji) i miejsce, więc nie pokazuje wariantu z inną datą, miejscem czy skalą, lecz zgodność z twierdzeniem.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii .

</details>

## 11. A25 (potwierdza)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów - Policja Małopolska (https://malopolska.policja.gov.pl/krk/aktualnosci/aktualnosci/77640,KAS-wspolnie-z-Policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow.html)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi o zabezpieczeniu prawie 11 mln papierosów bez polskich znaków akcyzy podczas działań w Kielcach.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii. 29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.

</details>

## 12. A25 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Kielcach zatrzymano dwóch obywateli Białorusi.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów - Policja Małopolska (https://malopolska.policja.gov.pl/krk/aktualnosci/aktualnosci/77640,KAS-wspolnie-z-Policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow.html)
- **Sędzia automatyczny:** nie wspiera (Cytat wskazuje na obywateli Armenii, co przeczy twierdzeniu o Białorusi, a nie opisuje jedynie innej daty czy skali tego samego faktu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii. 29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.

</details>

## 13. B34 (potwierdza)

- **Twierdzenie:** Woda z wodociągu w Gałkowie Dużym w gminie Koluszki nie nadaje się do picia.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r . Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia Dotyczy miejscowości: - Gałków Duży - Różyca, ul.”
- **Źródło:** Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-publiczny-galkow-duzy-gm-koluszki---woda-nie-nadaje-sie-do-spozycia)
- **Sędzia automatyczny:** wspiera (Cytat to tytuł komunikatu PSSE wprost stwierdzający, że woda z wodociągu Gałków Duży nie nadaje się do spożycia, co zgadza się z twierdzeniem.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r . Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia Dotyczy miejscowości: - Gałków Duży - Różyca, ul. Letniskowa - Gałków Parcela, ul. Dzieci Polskich Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w dniu 14 lipca 2026 r. pobrano do badań laboratoryjnych próbkę wody z wodociągu publicznego Gałków Duży w stacji wodociągowej (woda podawana do sieci). Na podstawie przeprowadzonych badań stwierdzono obecności enterokoków.

</details>

## 14. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Koszt Krajowego Centrum Przetwarzania Danych wyniesie 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Ponad 1,5 mld zł dofinansowania z Funduszy Europejskich Całkowita wartość projektu Krajowego Centrum Przetwarzania Danych wynosi 1,6 mld zł, z czego 1,558 mld zł stanowi dofinansowanie z programu Fundusze Europejskie na Rozwój Cyfrowy 2021-2027.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat podaje całkowitą wartość projektu 1,6 mld zł, czyli ten sam koszt w innej skali niż w twierdzeniu, a kontekst dofinansowania tego nie zmienia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

W projekcie wykorzystane zostaną również technologie BIM (Building Information Modeling) oraz Digital Twin. Rozwiązania te umożliwią skuteczniejsze planowanie, monitorowanie i zarządzanie infrastrukturą na wszystkich etapach jej funkcjonowania. Ponad 1,5 mld zł dofinansowania z Funduszy Europejskich Całkowita wartość projektu Krajowego Centrum Przetwarzania Danych wynosi 1,6 mld zł, z czego 1,558 mld zł stanowi dofinansowanie z programu Fundusze Europejskie na Rozwój Cyfrowy 2021-2027.

</details>

## 15. A53 (obala)

- **Twierdzenie:** Od początku 2027 roku szczepienia przeciw HPV mają być w Polsce obowiązkowe dla dzieci i nastolatków w wieku 9-15 lat.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Placówki wykonujące szczepienia Szczepienie przeciw HPV w ramach Programu bezpłatnych szczepień osób dorosłych należy do szczepień zalecanych, które są wykonywane w trybie wskazanym w art. 19 ust. 2 ustawy z dnia 5 grudnia 2008 r. o zapobieganiu oraz zwalczaniu zakażeń i chorób zakaźnych u ludzi (Dz.”
- **Źródło:** Komunikat nr 2 Głównego Inspektora Sanitarnego ws. bezpłatnych szczepień przeciw wirusowi brodawczaka ludzkiego (HPV) u osób dorosłych w wieku 19-26 lat - przekazanie dodatkowych dawek szczepionki 2-walentnej (https://www.gov.pl/web/gis/komunikat-nr-2-glownego-inspektora-sanitarnego-ws-bezplatnych-szczepien-przeciw-wirusowi-brodawczaka-ludzkiego-hpv-u-osob-doroslych-w-wieku-19-26-lat---przekazanie-dodatkowych-dawek-szczepionki-2-walentnej)
- **Sędzia automatyczny:** nie wspiera (Cytat dotyczy programu dla dorosłych i szczepień zalecanych, a nie obowiązku dla dzieci 9-15 lat, więc nie przeczy twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Schemat szczepień i termin realizacji bezpłatnych szczepień u osób dorosłych Szczepienia realizowane są w okresie od 1 października 2026 r. do 31 maja 2027 r. Obejmuje podanie 3 dawek w schemacie 0, 1, 6 miesięcy. Warunkiem skorzystania z bezpłatnych szczepień, jest podanie wszystkich 3 dawek do końca maja 2027 r. Placówki wykonujące szczepienia Szczepienie przeciw HPV w ramach Programu bezpłatnych szczepień osób dorosłych należy do szczepień zalecanych, które są wykonywane w trybie wskazanym w art. 19 ust. 2 ustawy z dnia 5 grudnia 2008 r. o zapobieganiu oraz zwalczaniu zakażeń i chorób zakaźnych u ludzi (Dz. U. z 2025 r. poz. 1675 z późn. zm.). Do realizacji szczepienia właściwe są placówki POZ posiadające umowę z Narodowym Funduszem Zdrowia na udzielanie świadczeń podstawowej opieki zdrowotnej.

</details>

## 16. A20 (potwierdza)

- **Twierdzenie:** GIS ostrzega przed partią L0036 herbatki z pokrzywy firmy Herbapol.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Szczegóły dotyczące produktu: Produkt: Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek Producent: Herbapol - Lublin S.A., ul. Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa.”
- **Źródło:** Ostrzeżenie publiczne dotyczące żywności: alkaloidy pirolizydynowe w określonej partii herbatki ziołowej z pokrzywy (https://www.gov.pl/web/gis/ostrzezenie-publiczne-dotyczace-zywnosci-alkaloidy-pirolizydynowe-w-okreslonej-partii-herbatki-ziolowej-z-pokrzywy3)
- **Sędzia automatyczny:** nie wspiera (Cytat urywa się przed wycofaniem partii i nie pokazuje, że to GIS ostrzega; podaje tylko dane produktu i wzmiankę o informacjach o przekroczeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Szczegóły dotyczące produktu: Produkt: Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek Producent: Herbapol - Lublin S.A., ul. Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.

</details>

## 17. A20 (potwierdza)

- **Twierdzenie:** Partia L0036 herbatki z pokrzywy firmy Herbapol zawiera za dużo alkaloidów pirolizydynowych.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.”
- **Źródło:** Ostrzeżenie publiczne dotyczące żywności: alkaloidy pirolizydynowe w określonej partii herbatki ziołowej z pokrzywy (https://www.gov.pl/web/gis/ostrzezenie-publiczne-dotyczace-zywnosci-alkaloidy-pirolizydynowe-w-okreslonej-partii-herbatki-ziolowej-z-pokrzywy3)
- **Sędzia automatyczny:** wspiera (Cytat wskazuje partię L0036 i informacje o przekroczeniu dopuszczalnego poziomu alkaloidów pirolizydynowych, co wraz z wycofaniem partii wspiera twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Szczegóły dotyczące produktu: Produkt: Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek Producent: Herbapol - Lublin S.A., ul. Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.

</details>

## 18. A22 (obala)

- **Twierdzenie:** Sąd Apelacyjny uniewinnił właściciela Biedronki w sprawie dodatkowych rabatów od dostawców.
- **Werdykt systemu:** falszywe
- **Cytat:** „Sąd Apelacyjny potwierdził umyślne stosowanie przez Jeronimo Martins Polska praktyki nieuczciwego wykorzystywania przewagi kontraktowej. Zgodnie z prawomocnym wyrokiem spółka ma w ciągu 14 dni zapłacić 170 mln zł kary.”
- **Źródło:** Sąd Apelacyjny potwierdza naruszenie Biedronki – prawomocny wyrok w sprawie przewagi kontraktowej – UOKiK (https://uokik.gov.pl/sad-apelacyjny-potwierdza-naruszenie-biedronki-prawomocny-wyrok-w-sprawie-przewagi-kontraktowej)
- **Sędzia automatyczny:** wspiera (Cytat stwierdza, że Sąd Apelacyjny potwierdził umyślne naruszenie i prawomocnie nałożył karę 170 mln zł, co przeczy uniewinnieniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Sieć handlowa nie ma prawa pobierać od dostawców dodatkowych i niezapowiedzianych wcześniej rabatów - to ważne rozstrzygnięcie dla polskich dostawców i producentów żywności. Sąd Apelacyjny potwierdził umyślne stosowanie przez Jeronimo Martins Polska praktyki nieuczciwego wykorzystywania przewagi kontraktowej. Zgodnie z prawomocnym wyrokiem spółka ma w ciągu 14 dni zapłacić 170 mln zł kary. Wypowiedź Prezesa UOKiK Tomasza Chróstnego

</details>

## 19. D09 (potwierdza)

- **Twierdzenie:** Polska znów weszła do Rady ITU.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi, że Polska została ponownie wybrana do Rady ITU na kolejną kadencję, co potwierdza twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 20. G04 (rozbieznosc_kontekstu)

- **Twierdzenie:** Alert RCB z 7 listopada ostrzegał mieszkańców Krakowa przed smogiem.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Alert RCB o tej treści został wysłany do odbiorców na terenie powiatu krakowskiego (woj. małopolskie). -------------------------------- "ĆWICZENIA: Dziś (06.11) w godz.”
- **Źródło:** Alert RCB - trening systemu alarmowania (06.11) (https://www.gov.pl/web/rcb/alert-rcb---trening-systemu-alarmowania-0611)
- **Sędzia automatyczny:** nie wspiera (Cytat dotyczy alertu z 06.11 o ćwiczeniach systemu alarmowania, a nie smogu z 7 listopada, więc to inne zdarzenie, a nie wariant tego samego.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Alert RCB o tej treści został wysłany do odbiorców na terenie powiatu krakowskiego (woj. małopolskie). -------------------------------- "ĆWICZENIA: Dziś (06.11) w godz. 10:00-11:00 na terenie powiatu olkuskiego odbędzie się trening systemu alarmowania z wykorzystaniem syren. Zachowaj spokój." Alert RCB o tej treści został wysłany do odbiorców na terenie powiatu olkuskiego (woj. małopolskie).

</details>

