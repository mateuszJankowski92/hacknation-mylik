# Próbka cytatów do ręcznego przeglądu

Przebieg: claude-haiku-5-5 (zestaw kontrolny_v2), sędzia automatyczny: claude-sonnet-5-5, stan na 2026-11-21T18:02:57.660Z.
Wylosowano 20 z 294 par twierdzenie-cytat (kolejność wg skrótu SHA-256, niezależna od wyników).

Jak oceniać: przeczytaj twierdzenie, relację i cytat w otoczeniu fragmentu. Wpisz w pliku review_sample.json w polu `humanSupports` true (cytat uczciwie uzasadnia relację) albo false, a w `humanNote` krótki powód.

## 1. B15 (rozbieznosc_kontekstu)

- **Twierdzenie:** Statki rejestruje obecnie urząd morski.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Obecnie rejestracją statków zajmują się izby morskie, a procedury nie zawsze odpowiadają potrzebom międzynarodowego transportu morskiego, w którym liczy się szybka obsługa i sprawny obieg dokumentów.”
- **Źródło:** Polska bandera bardziej dostępna. Rząd upraszcza rejestrację statków (https://www.gov.pl/web/infrastruktura/polska-bandera-bardziej-dostepna-rzad-upraszcza-rejestracje-statkow)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi, że obecnie rejestracją zajmują się izby morskie, a urząd morski dopiero przejmie te zadania w nowych przepisach.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Obecnie rejestracją statków zajmują się izby morskie, a procedury nie zawsze odpowiadają potrzebom międzynarodowego transportu morskiego, w którym liczy się szybka obsługa i sprawny obieg dokumentów. Nowe przepisy zakładają przeniesienie zadań związanych z rejestracją statków do urzędu morskiego i utworzenie jednego, cyfrowego rejestru okrętowego. Wnioski i dokumenty będzie można składać elektronicznie, również w języku angielskim. Bezpłatny będzie także dostęp do informacji zawartych w rejestrze. Wprowadzone zostaną ponadto elektroniczne certyfikaty okrętowe, potwierdzające dane i status statku.

</details>

## 2. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Krajowe Centrum Przetwarzania Danych będzie kosztować 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wartość inwestycji wynosi 1,6 mld zł.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tej samej inwestycji, ale podaje skalę 1,6 mld zł zamiast 16 mld zł, więc właściwie pokazuje rozbieżność w wartości.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa 09.11.2026 Bezpieczniejsze dane, większa odporność na awarie i stabilne działanie usług cyfrowych administracji publicznej - to główne korzyści z budowy Krajowego Centrum Przetwarzania Danych (KCPD). Nowoczesna infrastruktura pozwoli na bezpieczne przetwarzanie danych wykorzystywanych przez instytucje publiczne. Wartość inwestycji wynosi 1,6 mld zł. Projekt realizuje NASK - Państwowy Instytut Badawczy, a jego partnerem jest Ministerstwo Cyfryzacji.

</details>

## 3. I03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Służba celna w Wólce Kosowskiej przejęła podrobione towary warte 4 miliardy złotych.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Funkcjonariusze zabezpieczyli prawie 80 tys. sztuk odzieży, obuwia, galanterii, okularów, torebek, zabawek, perfum i innych akcesoriów z podrobionymi znakami towarowymi.”
- **Źródło:** Akcja KAS w Wólce Kosowskiej. Porzucony towar wart 44 mln zł - Ministerstwo Finansów - Krajowa Administracja Skarbowa (https://www.gov.pl/web/kas/akcja-kas-w-wolce-kosowskiej-porzucony-towar-wart-44-mln-zl)
- **Sędzia automatyczny:** nie wspiera (Cytat opisuje ilość zabezpieczonych towarów (prawie 80 tys. sztuk), a nie ich wartość, więc nie pokazuje różnicy skali wartości, o którą chodzi w relacji.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Sprzedaż odbywała się na tymczasowych stoiskach oraz bezpośrednio z busów. Na widok funkcjonariuszy SCS sprzedawcy porzucili stoiska oraz busy z towarem i uciekli. Funkcjonariusze zabezpieczyli prawie 80 tys. sztuk odzieży, obuwia, galanterii, okularów, torebek, zabawek, perfum i innych akcesoriów z podrobionymi znakami towarowymi. Sprzedawcy w trakcie ucieczki porzucili towary również wzdłuż ulicy i na chodniku. Wśród nich było blisko 8 tys. szt. e-papierosów i 340 liquidów zawierających łącznie ponad 392 l płynów do e-papierosów.

</details>

## 4. D18 (rozbieznosc_kontekstu)

- **Twierdzenie:** Fabryka w Gorzowie Wielkopolskim zacznie produkować rakiety w styczniu 2027 roku.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Nawet najnowocześniejsze systemy uzbrojenia nie mogą w pełni realizować swoich zadań bez stabilnego i pewnego zaopatrzenia. Dlatego fabryka w Gorzowie Wielkopolskim będzie ważnym elementem budowania krajowych zdolności produkcyjnych w obszarze amunicji rakietowej do systemów Homar-K.”
- **Źródło:** Powstaje fabryka nowoczesnej amunicji rakietowej. To inwestycja w bezpieczeństwo na dekady (https://www.gov.pl/web/obrona-narodowa/powstaje-fabryka-nowoczesnej-amunicji-rakietowej-to-inwestycja-w-bezpieczenstwo-na-dekady)
- **Sędzia automatyczny:** nie wspiera (Cytat ogólnie mówi o znaczeniu fabryki dla zdolności produkcyjnych, bez żadnej daty rozpoczęcia produkcji, więc nie jest podstawą relacji o innej dacie czy warunkach.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

- Współczesne bezpieczeństwo wymaga nie tylko posiadania nowoczesnego uzbrojenia, ale również zdolności do jego produkowania, utrzymywania i systematycznego uzupełniania zapasów. Doświadczenia wojny w Ukrainie jednoznacznie pokazują, jak istotne znaczenie na współczesnym polu walki mają artyleria rakietowa, precyzyjne rażenie celów oraz zapewnienie odpowiedniej ilości amunicji. Nawet najnowocześniejsze systemy uzbrojenia nie mogą w pełni realizować swoich zadań bez stabilnego i pewnego zaopatrzenia. Dlatego fabryka w Gorzowie Wielkopolskim będzie ważnym elementem budowania krajowych zdolności produkcyjnych w obszarze amunicji rakietowej do systemów Homar-K. To inwestycja, która pozwoli lepiej zabezpieczyć potrzeby Sił Zbrojnych RP, zwiększyć niezależność dostaw i wzmacniać odporność państwa na sytuacje kryzysowe

</details>

## 5. B09 (rozbieznosc_kontekstu)

- **Twierdzenie:** Nowa umowa na blisko 46 tys. karabinków Grot jest warta około 6 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wartość kontraktu wynosi około 600 mln zł, a dostawy przewidziano na lata 2026-2027.”
- **Źródło:** Kolejne Groty dla Wojska Polskiego (https://www.gov.pl/web/obrona-narodowa/kolejne-groty-dla-wojska-polskiego)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tej samej umowy na ok. 46 tys. karabinków Grot, ale podaje wartość ok. 600 mln zł zamiast 6 mld zł, więc trafnie pokazuje rozbieżność skali, którą opisuje relacja.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Przykładem wykorzystania uwolnionych przez Skarb Państwa środków jest umowa na dostawę blisko 46 tys. karabinków MSBS GROT C14 A3 dla Sił Zbrojnych RP. Wartość kontraktu wynosi około 600 mln zł, a dostawy przewidziano na lata 2026-2027. Przedmiotem zamówienia jest najnowsza wersja karabinka MSBS GROT C14 A3, opracowanego przez Fabrykę Broni „Łucznik” - Radom we współpracy z Wojskową Akademią Techniczną. Kolejne modyfikacje konstrukcji uwzględniają doświadczenia z eksploatacji wcześniejszych wersji oraz potrzeby zgłaszane przez żołnierzy, bezpośrednich użytkowników broni. Zmiany mają zwiększać ergonomię, funkcjonalność i efektywność użytkowania karabinka.

</details>

## 6. A04 (obala)

- **Twierdzenie:** ePUAP jest całkowicie wyłączony od 10 listopada.
- **Werdykt systemu:** falszywe
- **Cytat:** „Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników.”
- **Źródło:** ePUAP ponownie działa w pełnym zakresie (https://www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie)
- **Sędzia automatyczny:** wspiera (Cytat stwierdza, że ePUAP działa w pełnym zakresie, co przeczy twierdzeniu o całkowitym wyłączeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpośrednio po wykryciu problemu prewencyjnie ograniczyliśmy dostęp do części systemu, aby zatrzymać zagrożenie i bezpiecznie rozpocząć działania naprawcze. Od tego momentu prowadziliśmy równolegle analizę incydentu, weryfikację bezpieczeństwa systemów, wdrażanie dodatkowych zabezpieczeń oraz stopniowe przywracanie usług. Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników. Etapowe przywracanie systemu było świadomym działaniem. Nie chcieliśmy uruchamiać usług szybciej kosztem ich bezpieczeństwa. Każdy kolejny element ePUAP udostępnialiśmy po sprawdzeniu, że może działać prawidłowo i bezpiecznie. Przed uruchomieniem systemu przeprowadziliśmy testy funkcjonalne i bezpieczeństwa.

</details>

## 7. A04 (obala)

- **Twierdzenie:** Nie wiadomo, kiedy ePUAP wróci do działania.
- **Werdykt systemu:** falszywe
- **Cytat:** „Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników.”
- **Źródło:** ePUAP ponownie działa w pełnym zakresie (https://www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi, że ePUAP działa dziś, ale nie wskazuje terminu, więc nie przeczy wprost twierdzeniu o nieznanym terminie; dopiero data z innego fragmentu to robi.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpośrednio po wykryciu problemu prewencyjnie ograniczyliśmy dostęp do części systemu, aby zatrzymać zagrożenie i bezpiecznie rozpocząć działania naprawcze. Od tego momentu prowadziliśmy równolegle analizę incydentu, weryfikację bezpieczeństwa systemów, wdrażanie dodatkowych zabezpieczeń oraz stopniowe przywracanie usług. Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników. Etapowe przywracanie systemu było świadomym działaniem. Nie chcieliśmy uruchamiać usług szybciej kosztem ich bezpieczeństwa. Każdy kolejny element ePUAP udostępnialiśmy po sprawdzeniu, że może działać prawidłowo i bezpiecznie. Przed uruchomieniem systemu przeprowadziliśmy testy funkcjonalne i bezpieczeństwa.

</details>

## 8. D13 (obala)

- **Twierdzenie:** Mikrocefalię u dzieci w Brazylii wywołał wirus Zika, a nie szczepionka DTPA.
- **Werdykt systemu:** falszywe
- **Cytat:** „"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej. Nie podają jednak, o jakich naukowców chodzi ani na jakie badania się powołują.”
- **Źródło:** Tysiące noworodków chorują z powodu "szczepionki od Gatesów"? W tej historii nic się nie zgadza (https://konkret24.tvn24.pl/zdrowie/tysiace-noworodkow-choruja-z-powodu-szczepionki-od-gatesow-w-tej-historii-nic-sie-nie-zgadza-st9214449)
- **Sędzia automatyczny:** nie wspiera (Cytat przytacza dezinformacyjne twierdzenie wraz z zastrzeżeniem, że brak źródeł, więc nie przeczy twierdzeniu o Zika, tylko pokazuje niewiarygodność przeciwnej tezy.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej. Nie podają jednak, o jakich naukowców chodzi ani na jakie badania się powołują.

</details>

## 9. K04 (rozbieznosc_kontekstu)

- **Twierdzenie:** Prezydent zawetował ustawę o DSA.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Ustawa czeka na podpis Prezydenta 05.11.2026 Szybsze usuwanie treści związanych z wykorzystywaniem seksualnym dzieci, skuteczniejsza walka z oszustwami internetowymi i jasne procedury reagowania na nielegalne treści w sieci. Ustawa wdrażająca unijne rozporządzenie o usługach cyfrowych (DSA) oczekuje na podpis Prezydenta RP.”
- **Źródło:** Bezpieczniejszy internet na ostatniej prostej. Ustawa czeka na podpis Prezydenta (https://www.gov.pl/web/cyfryzacja/bezpieczniejszy-internet-na-ostatniej-prostej-ustawa-czeka-na-podpis-prezydenta)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi, że ustawa czeka na podpis, przed wetem, i nie opisuje weta z inną datą ani warunkami.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpieczniejszy internet na ostatniej prostej. Ustawa czeka na podpis Prezydenta 05.11.2026 Szybsze usuwanie treści związanych z wykorzystywaniem seksualnym dzieci, skuteczniejsza walka z oszustwami internetowymi i jasne procedury reagowania na nielegalne treści w sieci. Ustawa wdrażająca unijne rozporządzenie o usługach cyfrowych (DSA) oczekuje na podpis Prezydenta RP. Nowe przepisy określają, kiedy i na jakich zasadach organy państwa będą mogły nakazywać dostawcom usług pośrednich (platformom cyfrowym) usuwanie nielegalnych treści z internetu. Zakres i tempo podejmowanych działań będą zależeć od rodzaju przestępstwa oraz stopnia zagrożenia dla użytkowników.

</details>

## 10. A01 (potwierdza)

- **Twierdzenie:** Polska ponownie dostała się do Rady Międzynarodowego Związku Telekomunikacyjnego.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że Polska została wybrana do Rady ITU na kolejną kadencję, co potwierdza twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 11. A01 (potwierdza)

- **Twierdzenie:** Polska zdobyła 119 głosów na konferencji w Dosze.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat podaje, że Polska zdobyła 119 głosów podczas konferencji ITU w Dosze, a otoczenie tego nie zmienia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 12. A23 (potwierdza)

- **Twierdzenie:** Podpalenie dotyczyło stacji Starlink w Woli Krobowskiej.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Zatrzymano osoby podejrzane o podpalenie infrastruktury stacji Starlink w Woli Krobowskiej.”
- **Źródło:** Rozwijamy system ostrzegania i dbamy o bezpieczeństwo. Podsumowanie drugiego tygodnia października w MSWiA (https://www.gov.pl/web/mswia/rozwijamy-system-ostrzegania-i-dbamy-o-bezpieczenstwo-podsumowanie-drugiego-tygodnia-pazdziernika-w-mswia)
- **Sędzia automatyczny:** wspiera (Cytat jest podsumowaniem w nagłówku i wprost wskazuje podpalenie infrastruktury stacji Starlink w Woli Krobowskiej, zgodnie z fragmentem.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Rozwijamy system ostrzegania i dbamy o bezpieczeństwo. Podsumowanie drugiego tygodnia października w MSWiA 19.10.2026 Podpisaliśmy list intencyjny ws. uruchomienia systemu ostrzegania ludności cywilnej Cell Broadcast. Zatrzymano osoby podejrzane o podpalenie infrastruktury stacji Starlink w Woli Krobowskiej. Z Estonią i Finlandią rozmawialiśmy o bezpieczeństwie, a Akademia OLiOC nadal szkoli obywateli - tak wyglądał drugi tydzień października w MSWiA.

</details>

## 13. B30 (rozbieznosc_kontekstu)

- **Twierdzenie:** Woda z wodociągu PKP Łódź-Olechów jest skażona bakteriami.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „W żadnej z pobranych próbkach wody nie stwierdzono obecności bakterii Escherichia coli i enterokoków. W dniu 28 października 2026r. przeprowadzono powtórne badanie próbki wody pobranej w stacji wodociągowej w Wiśniowej Górze, które potwierdziło obecność bakterii grupy coli (wartość zbadana 1 jtk/100 ml). W badanej próbce wody nie stwierdzono bakterii Escherichia coli.”
- **Źródło:** Wodociąg publiczny Wiśniowa Góra, gm. Andrespol - stwierdzono niezgodność z wartością parametryczną dla bakterii grupy coli - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-publiczny-wisniowa-gora-gm-andrespol--stwierdzono-niezgodnosc-z-wartoscia-parametryczna-dla-bakterii-grupy-coli)
- **Sędzia automatyczny:** nie wspiera (Cytat dotyczy innego wodociągu (Wiśniowa Góra), a nie tego samego zdarzenia z inną datą czy skalą.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Na podstawie przeprowadzonych badań stwierdzono obecność bakterii grupy coli w ilości 1 jtk/100 ml w próbce wody podawanej do sieci wodociągowej. W próbkach wody pobranych na sieci wodociągowej nie stwierdzono obecności bakterii grupy coli. W żadnej z pobranych próbkach wody nie stwierdzono obecności bakterii Escherichia coli i enterokoków. W dniu 28 października 2026r. przeprowadzono powtórne badanie próbki wody pobranej w stacji wodociągowej w Wiśniowej Górze, które potwierdziło obecność bakterii grupy coli (wartość zbadana 1 jtk/100 ml). W badanej próbce wody nie stwierdzono bakterii Escherichia coli.

</details>

## 14. A02 (obala)

- **Twierdzenie:** Polska odpadła w wyborach do Rady ITU.
- **Werdykt systemu:** falszywe
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że Polska została wybrana do Rady ITU na kolejną kadencję, co przeczy twierdzeniu o odpadnięciu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 15. K04 (potwierdza)

- **Twierdzenie:** Prezydent zawetował ustawę o DSA.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej.”
- **Źródło:** "Ponad 800 doradców" prezydenta? Policzyliśmy (https://konkret24.tvn24.pl/polityka/ponad-800-doradcow-prezydenta-policzylismy-st9341916)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że 13 listopada 2026 Nawrocki zawetował ustawę wdrażającą DSA.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej. Ustawa miała umożliwić m.in. blokowanie nielegalnych treści w internecie. W uzasadnieniu weta prezydent stwierdził , że na końcowym etapie prac "w Senacie ponownie rozszerzono kompetencje urzędnicze w zakresie blokowania treści". Dodał, że "wróciło widmo urzędnika cenzora, który będzie podejmował decyzję, co wolno, a czego nie wolno w internecie". Profesor Zoll o "jednoosobowej" decyzji prezydenta "Nie jestem w stanie pojąć". Premier o decyzji prezydenta

</details>

## 16. B17 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów 17 listopada.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów - Ministerstwo Finansów - Krajowa Administracja Skarbowa (https://www.gov.pl/web/kas/kas-wspolnie-z-policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow)
- **Sędzia automatyczny:** wspiera (Cytat opisuje to samo zdarzenie (prawie 11 mln papierosów, Kielce w fragmencie), a data 17.11 to data publikacji, więc rozbieżność z działaniem 29 października jest właściwie wskazana jako inna data.})
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii .

</details>

## 17. A25 (potwierdza)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów - Policja Małopolska (https://malopolska.policja.gov.pl/krk/aktualnosci/aktualnosci/77640,KAS-wspolnie-z-Policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow.html)
- **Sędzia automatyczny:** wspiera (Cytat mówi o działaniach w Kielcach i zabezpieczeniu prawie 11 mln szt. papierosów bez akcyzy, co potwierdza twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii. 29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.

</details>

## 18. A25 (rozbieznosc_kontekstu)

- **Twierdzenie:** Zatrzymano dwóch obywateli Białorusi.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Zatrzymano dwóch obywateli Armenii.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów - Policja Małopolska (https://malopolska.policja.gov.pl/krk/aktualnosci/aktualnosci/77640,KAS-wspolnie-z-Policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow.html)
- **Sędzia automatyczny:** nie wspiera (Cytat dotyczy obywateli Armenii, a nie Białorusi, więc jest inną sprawą niż twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii. 29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.

</details>

## 19. A52 (potwierdza)

- **Twierdzenie:** Wody z wodociągu Święta Katarzyna nie wolno było pić.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h. W pozostałych próbkach wody pobranych w punktach poboru: Święta Katarzyna, ul. Główna 14a - Stacja Uzdatniania Wody, Święta Katarzyna, ul. Żernicka 17 - Budynek ZGK sp. z o.o., Święta Katarzyna, ul. H. Dąbrowskiego 3, Przedszkole, Święta Katarzyna, ul. Główna 1E, Przedszkole nie odnotowano przekroczenia dopuszczalnych wartości oznaczonych parametrów mikrobiologicznych.”
- **Źródło:** KOMUNIKAT NR 03/2025 w sprawie jakości wody uzdatnionej z wodociągu sieciowego Święta Katarzyna, - Powiatowa Stacja Sanitarno-Epidemiologiczna we Wrocławiu (https://www.gov.pl/web/psse-wroclaw/komunikat-nr-032025-w-sprawie-jakosci-wody-uzdatnionej-z-wodociagu-sieciowego-swieta-katarzyna)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi o przekroczeniu w jednej próbce i braku przekroczeń w pozostałych, nie zawiera zakazu picia wody.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

stwierdzono przekroczenie dopuszczalnej ogólnej liczby mikroorganizmów w temp. 22o C po 72 h. W pozostałych próbkach wody pobranych w punktach poboru: Święta Katarzyna, ul. Główna 14a - Stacja Uzdatniania Wody, Święta Katarzyna, ul. Żernicka 17 - Budynek ZGK sp. z o.o., Święta Katarzyna, ul. H. Dąbrowskiego 3, Przedszkole, Święta Katarzyna, ul. Główna 1E, Przedszkole nie odnotowano przekroczenia dopuszczalnych wartości oznaczonych parametrów mikrobiologicznych.

</details>

## 20. B34 (potwierdza)

- **Twierdzenie:** Woda z wodociągu w Gałkowie Dużym w gminie Koluszki nie nadaje się do picia.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r . Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia Dotyczy miejscowości: - Gałków Duży - Różyca, ul.”
- **Źródło:** Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-publiczny-galkow-duzy-gm-koluszki---woda-nie-nadaje-sie-do-spozycia)
- **Sędzia automatyczny:** wspiera (Tytuł komunikatu w cytacie mówi, że woda nie nadaje się do spożycia, a fragment podaje wykrycie enterokoków jako powód.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r . Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia Dotyczy miejscowości: - Gałków Duży - Różyca, ul. Letniskowa - Gałków Parcela, ul. Dzieci Polskich Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w dniu 14 lipca 2026 r. pobrano do badań laboratoryjnych próbkę wody z wodociągu publicznego Gałków Duży w stacji wodociągowej (woda podawana do sieci). Na podstawie przeprowadzonych badań stwierdzono obecności enterokoków.

</details>

