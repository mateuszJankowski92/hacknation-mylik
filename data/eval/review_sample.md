# Próbka cytatów do ręcznego przeglądu

Przebieg: claude-haiku-5-5 (zestaw kontrolny_v2), sędzia automatyczny: claude-sonnet-5-5, stan na 2026-11-22T02:09:40.874Z.
Wylosowano 20 z 218 par twierdzenie-cytat (kolejność wg skrótu SHA-256, niezależna od wyników).

Jak oceniać: przeczytaj twierdzenie, relację i cytat w otoczeniu fragmentu. Wpisz w pliku review_sample.json w polu `humanSupports` true (cytat uczciwie uzasadnia relację) albo false, a w `humanNote` krótki powód.

## 1. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Krajowe Centrum Przetwarzania Danych będzie kosztować 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wartość inwestycji wynosi 1,6 mld zł.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tej samej inwestycji (KCPD), ale podaje wartość 1,6 mld zł zamiast 16 mld zł, więc słusznie pokazuje wariant tego samego faktu ze zmienioną skalą.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa 09.11.2026 Bezpieczniejsze dane, większa odporność na awarie i stabilne działanie usług cyfrowych administracji publicznej - to główne korzyści z budowy Krajowego Centrum Przetwarzania Danych (KCPD). Nowoczesna infrastruktura pozwoli na bezpieczne przetwarzanie danych wykorzystywanych przez instytucje publiczne. Wartość inwestycji wynosi 1,6 mld zł. Projekt realizuje NASK - Państwowy Instytut Badawczy, a jego partnerem jest Ministerstwo Cyfryzacji.

</details>

## 2. A04 (rozbieznosc_kontekstu)

- **Twierdzenie:** System ePUAP jest od 10 listopada całkowicie wyłączony.
- **Werdykt systemu:** falszywe
- **Cytat:** „Bezpośrednio po wykryciu problemu prewencyjnie ograniczyliśmy dostęp do części systemu, aby zatrzymać zagrożenie i bezpiecznie rozpocząć działania naprawcze.”
- **Źródło:** ePUAP ponownie działa w pełnym zakresie (https://www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie)
- **Sędzia automatyczny:** wspiera (Cytat mówi o ograniczeniu dostępu do części systemu, co pokazuje inną skalę niż całkowite wyłączenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpośrednio po wykryciu problemu prewencyjnie ograniczyliśmy dostęp do części systemu, aby zatrzymać zagrożenie i bezpiecznie rozpocząć działania naprawcze. Od tego momentu prowadziliśmy równolegle analizę incydentu, weryfikację bezpieczeństwa systemów, wdrażanie dodatkowych zabezpieczeń oraz stopniowe przywracanie usług. Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników. Etapowe przywracanie systemu było świadomym działaniem. Nie chcieliśmy uruchamiać usług szybciej kosztem ich bezpieczeństwa. Każdy kolejny element ePUAP udostępnialiśmy po sprawdzeniu, że może działać prawidłowo i bezpiecznie. Przed uruchomieniem systemu przeprowadziliśmy testy funkcjonalne i bezpieczeństwa.

</details>

## 3. A04 (obala)

- **Twierdzenie:** Nie wiadomo, kiedy system ePUAP wróci do działania.
- **Werdykt systemu:** falszywe
- **Cytat:** „Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników.”
- **Źródło:** ePUAP ponownie działa w pełnym zakresie (https://www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie)
- **Sędzia automatyczny:** wspiera (Cytat stwierdza, że ePUAP działa już w pełnym zakresie, więc przeczy twierdzeniu, że nie wiadomo, kiedy wróci.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpośrednio po wykryciu problemu prewencyjnie ograniczyliśmy dostęp do części systemu, aby zatrzymać zagrożenie i bezpiecznie rozpocząć działania naprawcze. Od tego momentu prowadziliśmy równolegle analizę incydentu, weryfikację bezpieczeństwa systemów, wdrażanie dodatkowych zabezpieczeń oraz stopniowe przywracanie usług. Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników. Etapowe przywracanie systemu było świadomym działaniem. Nie chcieliśmy uruchamiać usług szybciej kosztem ich bezpieczeństwa. Każdy kolejny element ePUAP udostępnialiśmy po sprawdzeniu, że może działać prawidłowo i bezpiecznie. Przed uruchomieniem systemu przeprowadziliśmy testy funkcjonalne i bezpieczeństwa.

</details>

## 4. D13 (obala)

- **Twierdzenie:** Mikrocefalię u dzieci w Brazylii wywołał wirus Zika, a nie szczepionka DTPA.
- **Werdykt systemu:** falszywe
- **Cytat:** „"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej.”
- **Źródło:** Tysiące noworodków chorują z powodu "szczepionki od Gatesów"? W tej historii nic się nie zgadza (https://konkret24.tvn24.pl/zdrowie/tysiace-noworodkow-choruja-z-powodu-szczepionki-od-gatesow-w-tej-historii-nic-sie-nie-zgadza-st9214449)
- **Sędzia automatyczny:** nie wspiera (Cytat to tylko cytowana dezinformacyjna teza, którą fragment od razu podważa, więc nie pokazuje, że twierdzenie jest nieprawdziwe, a wręcz przeciwnie, przytacza stanowisko przeciwne bez dowodu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

"Jednak australijscy naukowcy ujawniają, że prawdziwą przyczyną byłaby toksyczność szczepionki DTPA, podanej jako obowiązkowa kobietom w ciąży rok wcześniej" - piszą dalej. Nie podają jednak, o jakich naukowców chodzi ani na jakie badania się powołują.

</details>

## 5. A01 (potwierdza)

- **Twierdzenie:** Polska ponownie dostała się do Rady Międzynarodowego Związku Telekomunikacyjnego.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że Polska została wybrana do Rady ITU na kolejną kadencję, co potwierdza twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 6. A01 (potwierdza)

- **Twierdzenie:** Polska zebrała 119 głosów na konferencji w Dosze.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat podaje, że Polska zdobyła 119 głosów podczas konferencji w Dosze, zgodnie z twierdzeniem.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 7. A02 (obala)

- **Twierdzenie:** Polska odpadła w wyborach do Rady ITU.
- **Werdykt systemu:** falszywe
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat mówi, że Polska została wybrana do Rady ITU na kolejną kadencję, więc przeczy twierdzeniu o odpadnięciu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 8. K04 (potwierdza)

- **Twierdzenie:** Prezydent zawetował ustawę o DSA.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej.”
- **Źródło:** "Ponad 800 doradców" prezydenta? Policzyliśmy (https://konkret24.tvn24.pl/polityka/ponad-800-doradcow-prezydenta-policzylismy-st9341916)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że 13 listopada 2026 Nawrocki zawetował ustawę wdrażającą DSA.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej. Ustawa miała umożliwić m.in. blokowanie nielegalnych treści w internecie. W uzasadnieniu weta prezydent stwierdził , że na końcowym etapie prac "w Senacie ponownie rozszerzono kompetencje urzędnicze w zakresie blokowania treści". Dodał, że "wróciło widmo urzędnika cenzora, który będzie podejmował decyzję, co wolno, a czego nie wolno w internecie". Profesor Zoll o "jednoosobowej" decyzji prezydenta "Nie jestem w stanie pojąć". Premier o decyzji prezydenta

</details>

## 9. B17 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów 17 listopada.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów - Ministerstwo Finansów - Krajowa Administracja Skarbowa (https://www.gov.pl/web/kas/kas-wspolnie-z-policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow)
- **Sędzia automatyczny:** wspiera (Cytat opisuje to samo zdarzenie (prawie 11 mln papierosów, Kielce w fragmencie), ale z datą publikacji 17.11, a nie datą akcji, więc relacja różnicy w dacie jest uzasadniona.})
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii .

</details>

## 10. A25 (potwierdza)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów - Policja Małopolska (https://malopolska.policja.gov.pl/krk/aktualnosci/aktualnosci/77640,KAS-wspolnie-z-Policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow.html)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi o wykryciu prawie 11 mln szt. papierosów bez polskich znaków akcyzy w Kielcach, co potwierdza twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii. 29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.

</details>

## 11. B34 (potwierdza)

- **Twierdzenie:** Woda z wodociągu w Gałkowie Dużym w gminie Koluszki nie nadaje się do picia.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r .”
- **Źródło:** Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-publiczny-galkow-duzy-gm-koluszki---woda-nie-nadaje-sie-do-spozycia)
- **Sędzia automatyczny:** wspiera (Cytat to nagłówek komunikatu, a fragment wskazuje obecność enterokoków i potwierdza, że woda nie nadaje się do spożycia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r . Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia Dotyczy miejscowości: - Gałków Duży - Różyca, ul. Letniskowa - Gałków Parcela, ul. Dzieci Polskich Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w dniu 14 lipca 2026 r. pobrano do badań laboratoryjnych próbkę wody z wodociągu publicznego Gałków Duży w stacji wodociągowej (woda podawana do sieci). Na podstawie przeprowadzonych badań stwierdzono obecności enterokoków.

</details>

## 12. A45 (potwierdza)

- **Twierdzenie:** Większość migrantów przyjeżdża do Polski do pracy.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się.”
- **Źródło:** Ekonomiczny bilans migracji - czy migranci przyjeżdżają tylko po zasiłki? (https://fakenews.pl/blog/ekonomiczny-bilans-migracji-czy-migranci-przyjezdzaja-tylko-po-zasilki/)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że większość migrantów przybywa do Polski w celu podjęcia pracy, a kontekst (obalanie mitu o zasiłkach) tego nie osłabia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zatrzymaj się! Tworzenie treści kosztuje i jest czasochłonne. Może podarujesz nam kawę? Ekonomiczny bilans migracji – czy migranci przyjeżdżają tylko po zasiłki? Utworzone: 19 listopada 2025 Aktualizacja: 25 listopada 2025 przez Julia Dobrowolska Komentarze Jednym z najczęściej powtarzanych mitów dotyczących migracji jest przekonanie, że migranci przyjeżdżają po zasiłki i obciążają system socjalny. Tego typu stwierdzenia, będące źródłem napięć społecznych, często pojawiają się w debacie publicznej. Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się. Niniejsza seria tekstów ukazała się w ramach Tygodnia Edukacji Globalnej 2025.

</details>

## 13. A45 (potwierdza)

- **Twierdzenie:** Większość migrantów nie przyjeżdża do Polski po zasiłki.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się.”
- **Źródło:** Ekonomiczny bilans migracji - czy migranci przyjeżdżają tylko po zasiłki? (https://fakenews.pl/blog/ekonomiczny-bilans-migracji-czy-migranci-przyjezdzaja-tylko-po-zasilki/)
- **Sędzia automatyczny:** wspiera (Cytat, w kontekście obalania mitu o przyjazdach po zasiłki, stwierdza że większość przybywa pracować i się utrzymać, co potwierdza twierdzenie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zatrzymaj się! Tworzenie treści kosztuje i jest czasochłonne. Może podarujesz nam kawę? Ekonomiczny bilans migracji – czy migranci przyjeżdżają tylko po zasiłki? Utworzone: 19 listopada 2025 Aktualizacja: 25 listopada 2025 przez Julia Dobrowolska Komentarze Jednym z najczęściej powtarzanych mitów dotyczących migracji jest przekonanie, że migranci przyjeżdżają po zasiłki i obciążają system socjalny. Tego typu stwierdzenia, będące źródłem napięć społecznych, często pojawiają się w debacie publicznej. Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się. Niniejsza seria tekstów ukazała się w ramach Tygodnia Edukacji Globalnej 2025.

</details>

## 14. A20 (potwierdza)

- **Twierdzenie:** Główny Inspektorat Sanitarny ostrzega przed partią L0036 herbatki z pokrzywy firmy Herbapol.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.”
- **Źródło:** Ostrzeżenie publiczne dotyczące żywności: alkaloidy pirolizydynowe w określonej partii herbatki ziołowej z pokrzywy (https://www.gov.pl/web/gis/ostrzezenie-publiczne-dotyczace-zywnosci-alkaloidy-pirolizydynowe-w-okreslonej-partii-herbatki-ziolowej-z-pokrzywy3)
- **Sędzia automatyczny:** wspiera (Cytat wskazuje partię L0036 herbatki Herbapol i jej wycofanie z powodu alkaloidów, a tytuł dokumentu to ostrzeżenie publiczne, więc to właściwa podstawa twierdzenia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Szczegóły dotyczące produktu: Produkt: Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek Producent: Herbapol - Lublin S.A., ul. Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.

</details>

## 15. A20 (potwierdza)

- **Twierdzenie:** Herbatka z pokrzywy z partii L0036 firmy Herbapol zawiera za dużo alkaloidów pirolizydynowych.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.”
- **Źródło:** Ostrzeżenie publiczne dotyczące żywności: alkaloidy pirolizydynowe w określonej partii herbatki ziołowej z pokrzywy (https://www.gov.pl/web/gis/ostrzezenie-publiczne-dotyczace-zywnosci-alkaloidy-pirolizydynowe-w-okreslonej-partii-herbatki-ziolowej-z-pokrzywy3)
- **Sędzia automatyczny:** wspiera (Cytat mówi o otrzymanych informacjach o przekroczeniu dopuszczalnego poziomu alkaloidów pirolizydynowych w tej partii, co zgadza się z twierdzeniem i nie jest osłabione w kontekście.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Szczegóły dotyczące produktu: Produkt: Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek Producent: Herbapol - Lublin S.A., ul. Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.

</details>

## 16. K19 (rozbieznosc_kontekstu)

- **Twierdzenie:** Biedronka została ukarana karą w wysokości 170 mln zł.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Prezes UOKiK nałożył na uczestników tego porozumienia kary w łącznej wysokości ponad 570 mln zł, z czego 525 mln zł na właściciela Biedronki.”
- **Źródło:** Zmowa na rynku pracy. Ponad pół miliarda złotych kar na Biedronkę oraz firmy transportowe – UOKiK (https://uokik.gov.pl/zmowa-na-rynku-pracy-ponad-pol-miliarda-zlotych-kar-na-biedronke-oraz-firmy-transportowe)
- **Sędzia automatyczny:** nie wspiera (Cytat dotyczy innej sprawy, czyli zmowy na rynku pracy z karą 525 mln zł, a nie tej samej kary w innych warunkach.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Prezes UOKiK nałożył na uczestników tego porozumienia kary w łącznej wysokości ponad 570 mln zł, z czego 525 mln zł na właściciela Biedronki. Decyzja podlegała opiniowaniu przez Komisję Europejską, która zgodziła się z argumentacją Urzędu, że doszło do naruszenia konkurencji. - Pracownicy mają prawo szukać lepszej płacy i warunków pracy. Zmowa, która odbiera pracownikom to prawo, uderza w podstawowe zasady uczciwej konkurencji. Takie praktyki muszą być bezwzględnie eliminowane z rynku – mówi Prezes UOKiK Tomasz Chróstny.

</details>

## 17. B10 (rozbieznosc_kontekstu)

- **Twierdzenie:** Fabryka rakiet Grupy WB i Hanwha do Homarów-K powstaje w Zielonej Górze.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „W środę, 4 listopada br., w Gorzowie Wielkopolskim wiceminister obrony narodowej Magdalena Sobkowiak-Czarnecka, reprezentująca wiceprezesa Rady Ministrów, ministra obrony narodowej Władysława Kosiniaka-Kamysza, uczestniczyła w inauguracji budowy nowego zakładu produkcyjnego Hanwha WB Advanced System. Zakład będzie produkował m.in. pociski rakietowe przeznaczone do wyrzutni HOMAR-K.”
- **Źródło:** Powstaje fabryka nowoczesnej amunicji rakietowej. To inwestycja w bezpieczeństwo na dekady (https://www.gov.pl/web/obrona-narodowa/powstaje-fabryka-nowoczesnej-amunicji-rakietowej-to-inwestycja-w-bezpieczenstwo-na-dekady)
- **Sędzia automatyczny:** wspiera (Cytat opisuje tę samą fabrykę pocisków do HOMAR-K, ale w Gorzowie Wielkopolskim, a nie w Zielonej Górze, więc trafnie pokazuje różnicę w miejscu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

W środę, 4 listopada br., w Gorzowie Wielkopolskim wiceminister obrony narodowej Magdalena Sobkowiak-Czarnecka, reprezentująca wiceprezesa Rady Ministrów, ministra obrony narodowej Władysława Kosiniaka-Kamysza, uczestniczyła w inauguracji budowy nowego zakładu produkcyjnego Hanwha WB Advanced System. Zakład będzie produkował m.in. pociski rakietowe przeznaczone do wyrzutni HOMAR-K.

</details>

## 18. A22 (obala)

- **Twierdzenie:** Sąd Apelacyjny uniewinnił właściciela Biedronki w sprawie dodatkowych rabatów od dostawców.
- **Werdykt systemu:** falszywe
- **Cytat:** „Sąd Apelacyjny potwierdził umyślne stosowanie przez Jeronimo Martins Polska praktyki nieuczciwego wykorzystywania przewagi kontraktowej.”
- **Źródło:** Sąd Apelacyjny potwierdza naruszenie Biedronki – prawomocny wyrok w sprawie przewagi kontraktowej – UOKiK (https://uokik.gov.pl/sad-apelacyjny-potwierdza-naruszenie-biedronki-prawomocny-wyrok-w-sprawie-przewagi-kontraktowej)
- **Sędzia automatyczny:** wspiera (Cytat stwierdza, że Sąd Apelacyjny potwierdził umyślne stosowanie nieuczciwej praktyki, a fragment dodaje prawomocną karę 170 mln zł.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Sieć handlowa nie ma prawa pobierać od dostawców dodatkowych i niezapowiedzianych wcześniej rabatów - to ważne rozstrzygnięcie dla polskich dostawców i producentów żywności. Sąd Apelacyjny potwierdził umyślne stosowanie przez Jeronimo Martins Polska praktyki nieuczciwego wykorzystywania przewagi kontraktowej. Zgodnie z prawomocnym wyrokiem spółka ma w ciągu 14 dni zapłacić 170 mln zł kary. Wypowiedź Prezesa UOKiK Tomasza Chróstnego

</details>

## 19. D09 (potwierdza)

- **Twierdzenie:** Polska ponownie weszła do Rady ITU.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi, że Polska została wybrana do Rady ITU na kolejną kadencję, co potwierdza ponowne wejście.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 20. D15 (potwierdza)

- **Twierdzenie:** Po remoncie z bloku 15 Muzeum Auschwitz usunięto tablicę o polskich harcerzach.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polityk w emocjonalnym tonie przekonywał, że to dowód, iż "trwa eliminacja pamięci o polskich i chrześcijańskich ofiar Auschwitz" (pisownia postów oryginalna) . Pisał o dwóch tablicach, które wisiały na ścianie bloku 15. Pierwsza upamiętnia bohaterów Armii Krajowej, druga - polskich harcerzy zamordowanych w obozie. "Prace remontowe się zakończyły. Tablice nie wróciły" - informował polityk Konfederacji.”
- **Źródło:** Muzeum Auschwitz "usuwa informacje o polskich więźniach"? O co chodzi z tablicami (https://konkret24.tvn24.pl/polska/muzeum-auschwitz-usuwa-informacje-o-polskich-wiezniach-o-co-chodzi-z-tablicami-st9019462)
- **Sędzia automatyczny:** nie wspiera (Cytat tylko przytacza zarzut polityka Konfederacji, a tytuł sugeruje, że artykuł go weryfikuje, więc nie potwierdza faktu usunięcia tablicy przez muzeum.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

27 kwietnia polityk Konfederacji Paweł Usiądek na platformie X napisał , że z Muzeum Auschwitz w trakcie prac remontowych "zniknęła tablica upamiętniająca Polaków". Polityk w emocjonalnym tonie przekonywał, że to dowód, iż "trwa eliminacja pamięci o polskich i chrześcijańskich ofiar Auschwitz" (pisownia postów oryginalna) . Pisał o dwóch tablicach, które wisiały na ścianie bloku 15. Pierwsza upamiętnia bohaterów Armii Krajowej, druga - polskich harcerzy zamordowanych w obozie. "Prace remontowe się zakończyły. Tablice nie wróciły" - informował polityk Konfederacji.

</details>

