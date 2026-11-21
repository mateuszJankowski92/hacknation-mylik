# Próbka cytatów do ręcznego przeglądu

Przebieg: claude-haiku-5-5 (zestaw kontrolny_v2), sędzia automatyczny: claude-sonnet-5-5, stan na 2026-11-21T23:38:00.660Z.
Wylosowano 20 z 212 par twierdzenie-cytat (kolejność wg skrótu SHA-256, niezależna od wyników).

Jak oceniać: przeczytaj twierdzenie, relację i cytat w otoczeniu fragmentu. Wpisz w pliku review_sample.json w polu `humanSupports` true (cytat uczciwie uzasadnia relację) albo false, a w `humanNote` krótki powód.

## 1. B03 (rozbieznosc_kontekstu)

- **Twierdzenie:** Krajowe Centrum Przetwarzania Danych będzie kosztować 16 mld zł.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „Wartość inwestycji wynosi 1,6 mld zł.”
- **Źródło:** Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa (https://www.gov.pl/web/cyfryzacja/krajowe-centrum-przetwarzania-danych--16-mld-zl-na-bezpieczna-infrastrukture-cyfrowa-panstwa)
- **Sędzia automatyczny:** wspiera (Cytat dotyczy tej samej inwestycji (KCPD), ale podaje wartość 1,6 mld zł zamiast 16 mld zł, więc właściwie pokazuje różnicę w skali względem twierdzenia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Krajowe Centrum Przetwarzania Danych - 1,6 mld zł na bezpieczną infrastrukturę cyfrową państwa 09.11.2026 Bezpieczniejsze dane, większa odporność na awarie i stabilne działanie usług cyfrowych administracji publicznej - to główne korzyści z budowy Krajowego Centrum Przetwarzania Danych (KCPD). Nowoczesna infrastruktura pozwoli na bezpieczne przetwarzanie danych wykorzystywanych przez instytucje publiczne. Wartość inwestycji wynosi 1,6 mld zł. Projekt realizuje NASK - Państwowy Instytut Badawczy, a jego partnerem jest Ministerstwo Cyfryzacji.

</details>

## 2. A04 (obala)

- **Twierdzenie:** System ePUAP jest od 10 listopada całkowicie wyłączony.
- **Werdykt systemu:** falszywe
- **Cytat:** „Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników.”
- **Źródło:** ePUAP ponownie działa w pełnym zakresie (https://www.gov.pl/web/cyfryzacja/epuap-ponownie-dziala-w-pelnym-zakresie)
- **Sędzia automatyczny:** wspiera (Cytat stwierdza, że ePUAP działa już w pełnym zakresie, a fragment wspomina tylko prewencyjne ograniczenie części systemu, więc twierdzenie jest nieprawdziwe.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpośrednio po wykryciu problemu prewencyjnie ograniczyliśmy dostęp do części systemu, aby zatrzymać zagrożenie i bezpiecznie rozpocząć działania naprawcze. Od tego momentu prowadziliśmy równolegle analizę incydentu, weryfikację bezpieczeństwa systemów, wdrażanie dodatkowych zabezpieczeń oraz stopniowe przywracanie usług. Dziś ePUAP działa już w pełnym zakresie. Usługi zostały przywrócone i są dostępne dla użytkowników. Etapowe przywracanie systemu było świadomym działaniem. Nie chcieliśmy uruchamiać usług szybciej kosztem ich bezpieczeństwa. Każdy kolejny element ePUAP udostępnialiśmy po sprawdzeniu, że może działać prawidłowo i bezpiecznie. Przed uruchomieniem systemu przeprowadziliśmy testy funkcjonalne i bezpieczeństwa.

</details>

## 3. A01 (potwierdza)

- **Twierdzenie:** Polska ponownie została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że Polska została wybrana do Rady ITU na kolejną kadencję.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 4. A01 (potwierdza)

- **Twierdzenie:** Polska zebrała 119 głosów na konferencji w Dosze.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat podaje, że w Dosze Polska zdobyła 119 głosów, co dokładnie odpowiada twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 5. A02 (obala)

- **Twierdzenie:** Polska odpadła w wyborach do Rady ITU.
- **Werdykt systemu:** falszywe
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat stwierdza, że Polska została wybrana do Rady ITU na kolejną kadencję, co przeczy twierdzeniu o odpadnięciu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 6. K04 (potwierdza)

- **Twierdzenie:** Prezydent zawetował ustawę o DSA.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej.”
- **Źródło:** "Ponad 800 doradców" prezydenta? Policzyliśmy (https://konkret24.tvn24.pl/polityka/ponad-800-doradcow-prezydenta-policzylismy-st9341916)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że 13 listopada 2026 Nawrocki zawetował ustawę wdrażającą DSA.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Po tym, gdy 13 listopada 2026 roku Karol Nawrocki zawetował rządową ustawę wdrażającą Akt o usługach cyfrowych (DSA), kwestia wprowadzenia nowych przepisów ponownie stała się przedmiotem debaty publicznej. Ustawa miała umożliwić m.in. blokowanie nielegalnych treści w internecie. W uzasadnieniu weta prezydent stwierdził , że na końcowym etapie prac "w Senacie ponownie rozszerzono kompetencje urzędnicze w zakresie blokowania treści". Dodał, że "wróciło widmo urzędnika cenzora, który będzie podejmował decyzję, co wolno, a czego nie wolno w internecie". Profesor Zoll o "jednoosobowej" decyzji prezydenta "Nie jestem w stanie pojąć". Premier o decyzji prezydenta

</details>

## 7. A15 (potwierdza)

- **Twierdzenie:** Umowa ze Stałym Trybunałem Arbitrażowym umożliwia Trybunałowi prowadzenie spraw w Polsce.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Umowa pozwoli na prowadzenie w Polsce postępowań arbitrażowych, koncyliacyjnych i mediacyjnych, a także korzystanie z innych alternatywnych metod rozwiązywania sporów.”
- **Źródło:** Umowa między Polską a Stałym Trybunałem Arbitrażowym podpisana (https://www.gov.pl/web/dyplomacja/umowa-miedzy-polska-a-stalym-trybunalem-arbitrazowym-podpisana)
- **Sędzia automatyczny:** wspiera (Cytat mówi, że umowa pozwoli na prowadzenie w Polsce postępowań arbitrażowych, koncyliacyjnych i mediacyjnych, a otoczenie tego nie osłabia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Umowa pozwoli na prowadzenie w Polsce postępowań arbitrażowych, koncyliacyjnych i mediacyjnych, a także korzystanie z innych alternatywnych metod rozwiązywania sporów. Z uwagi na brak stałego biura Trybunału w regionie, zawarcie umowy z STA jest dobrym sygnałem dla polskich przedsiębiorców. Ewentualne spory o charakterze ponadnarodowym będą mogli rozwiązywać w ramach międzynarodowej procedury arbitrażowej w Polsce.

</details>

## 8. B17 (rozbieznosc_kontekstu)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów 17 listopada.
- **Werdykt systemu:** wprowadzajace_w_blad
- **Cytat:** „KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów - Ministerstwo Finansów - Krajowa Administracja Skarbowa (https://www.gov.pl/web/kas/kas-wspolnie-z-policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow)
- **Sędzia automatyczny:** nie wspiera (Cytat potwierdza datę 17.11.2026 jako datę publikacji i to samo zdarzenie, a nie inną datę, miejsce czy skalę, więc relacja „z inną datą)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyła 11 mln szt. nielegalnych papierosów 17.11.2026 Małopolska Krajowa Administracja Skarbowa (KAS) wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji (CBŚP) wykr yła prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii .

</details>

## 9. A25 (potwierdza)

- **Twierdzenie:** W Kielcach przejęto prawie 11 mln nielegalnych papierosów.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.”
- **Źródło:** KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów - Policja Małopolska (https://malopolska.policja.gov.pl/krk/aktualnosci/aktualnosci/77640,KAS-wspolnie-z-Policja-zabezpieczyli-11-mln-szt-nielegalnych-papierosow.html)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi, że w Kielcach zabezpieczono prawie 11 mln szt. papierosów bez polskich znaków akcyzy, a fragment tego nie osłabia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KAS wspólnie z Policją zabezpieczyli 11 mln szt. nielegalnych papierosów Małopolska Krajowa Administracja Skarbowa wspólnie z Komendą Powiatową Policji w Krakowie oraz Centralnym Biurem Śledczym Policji wykryli prawie 11 mln szt. papierosów bez polskich znaków akcyzy. Nielegalny towar znajdował się w samochodzie ciężarowym oraz na prywatnej posesji w Kielcach. Zatrzymano dwóch obywateli Armenii. 29 października 2026 r. funkcjonariusze Małopolskiego Urzędu Celno-Skarbowego w Krakowie (MUCS), działając wspólnie z policjantami z Wydziału do walki z Przestępczością Gospodarczą KPP oraz CBŚP, przeprowadzili działania na terenie Kielc. W ich trakcie zabezpieczyli prawie 11 mln szt. papierosów bez polskich znaków akcyzy.

</details>

## 10. B34 (potwierdza)

- **Twierdzenie:** Woda z wodociągu w Gałkowie Dużym w gminie Koluszki nie nadaje się do picia.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r .”
- **Źródło:** Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-publiczny-galkow-duzy-gm-koluszki---woda-nie-nadaje-sie-do-spozycia)
- **Sędzia automatyczny:** wspiera (Cytat to nagłówek komunikatu, a fragment podaje przyczynę (enterokoki), więc wprost potwierdza, że woda nie nadaje się do spożycia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia 16.07.2026 16 lipca 2026r . Wodociąg publiczny Gałków Duży, gm. Koluszki - woda nie nadaje się do spożycia Dotyczy miejscowości: - Gałków Duży - Różyca, ul. Letniskowa - Gałków Parcela, ul. Dzieci Polskich Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w dniu 14 lipca 2026 r. pobrano do badań laboratoryjnych próbkę wody z wodociągu publicznego Gałków Duży w stacji wodociągowej (woda podawana do sieci). Na podstawie przeprowadzonych badań stwierdzono obecności enterokoków.

</details>

## 11. A45 (potwierdza)

- **Twierdzenie:** Większość migrantów przyjeżdża do Polski do pracy.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się.”
- **Źródło:** Ekonomiczny bilans migracji - czy migranci przyjeżdżają tylko po zasiłki? (https://fakenews.pl/blog/ekonomiczny-bilans-migracji-czy-migranci-przyjezdzaja-tylko-po-zasilki/)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza, że większość migrantów przybywa do Polski z zamiarem podjęcia pracy, co odpowiada twierdzeniu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zatrzymaj się! Tworzenie treści kosztuje i jest czasochłonne. Może podarujesz nam kawę? Ekonomiczny bilans migracji – czy migranci przyjeżdżają tylko po zasiłki? Utworzone: 19 listopada 2025 Aktualizacja: 25 listopada 2025 przez Julia Dobrowolska Komentarze Jednym z najczęściej powtarzanych mitów dotyczących migracji jest przekonanie, że migranci przyjeżdżają po zasiłki i obciążają system socjalny. Tego typu stwierdzenia, będące źródłem napięć społecznych, często pojawiają się w debacie publicznej. Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się. Niniejsza seria tekstów ukazała się w ramach Tygodnia Edukacji Globalnej 2025.

</details>

## 12. A45 (potwierdza)

- **Twierdzenie:** Migranci nie przyjeżdżają do Polski po zasiłki.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Utworzone: 19 listopada 2025 Aktualizacja: 25 listopada 2025 przez Julia Dobrowolska Komentarze Jednym z najczęściej powtarzanych mitów dotyczących migracji jest przekonanie, że migranci przyjeżdżają po zasiłki i obciążają system socjalny. Tego typu stwierdzenia, będące źródłem napięć społecznych, często pojawiają się w debacie publicznej. Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się.”
- **Źródło:** Ekonomiczny bilans migracji - czy migranci przyjeżdżają tylko po zasiłki? (https://fakenews.pl/blog/ekonomiczny-bilans-migracji-czy-migranci-przyjezdzaja-tylko-po-zasilki/)
- **Sędzia automatyczny:** nie wspiera (Cytat mówi, że większość migrantów przyjeżdża do pracy, a nie że żaden nie przyjeżdża po zasiłki, więc twierdzenie jest mocniejsze niż źródło; nazwanie przekonania mitem nie wyklucza pojedynczych wyjątków.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Zatrzymaj się! Tworzenie treści kosztuje i jest czasochłonne. Może podarujesz nam kawę? Ekonomiczny bilans migracji – czy migranci przyjeżdżają tylko po zasiłki? Utworzone: 19 listopada 2025 Aktualizacja: 25 listopada 2025 przez Julia Dobrowolska Komentarze Jednym z najczęściej powtarzanych mitów dotyczących migracji jest przekonanie, że migranci przyjeżdżają po zasiłki i obciążają system socjalny. Tego typu stwierdzenia, będące źródłem napięć społecznych, często pojawiają się w debacie publicznej. Jednak w rzeczywistości większość osób z doświadczeniem migracji przybywa do Polski z zamiarem podjęcia pracy i samodzielnego utrzymania się. Niniejsza seria tekstów ukazała się w ramach Tygodnia Edukacji Globalnej 2025.

</details>

## 13. A20 (potwierdza)

- **Twierdzenie:** Partia L0036 herbatki z pokrzywy firmy Herbapol zawiera za dużo alkaloidów pirolizydynowych.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.”
- **Źródło:** Ostrzeżenie publiczne dotyczące żywności: alkaloidy pirolizydynowe w określonej partii herbatki ziołowej z pokrzywy (https://www.gov.pl/web/gis/ostrzezenie-publiczne-dotyczace-zywnosci-alkaloidy-pirolizydynowe-w-okreslonej-partii-herbatki-ziolowej-z-pokrzywy3)
- **Sędzia automatyczny:** wspiera (Cytat wprost mówi o przekroczeniu dopuszczalnego poziomu alkaloidów pirolizydynowych w partii L0036 herbatki Herbapol i jej wycofaniu, bez zastrzeżeń zmieniających sens.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Szczegóły dotyczące produktu: Produkt: Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek Producent: Herbapol - Lublin S.A., ul. Diamentowa 25, 20-471 Lublin Numer partii: L 0036 Data minimalnej trwałości: 01.2028 Działania podjęte przez przedsiębiorców i organy urzędowej kontroli: W związku z otrzymanymi informacjami dotyczącymi przekroczenia dopuszczalnego poziomu alkaloidów pirolizydynowych w produkcie Pokrzywa. Herbatka ziołowa, Zielnik Polski, 20 torebek o numerze partii L0036 i dacie minimalnej trwałości: 01.2028, Herbapol Lublin SA mając na celu dobro konsumentów podjął decyzję o wycofaniu przedmiotowej partii produktu, informując o tym swoich odbiorców.

</details>

## 14. A22 (obala)

- **Twierdzenie:** Sąd Apelacyjny uniewinnił właściciela Biedronki w sprawie dodatkowych rabatów od dostawców.
- **Werdykt systemu:** falszywe
- **Cytat:** „Sąd Apelacyjny potwierdził umyślne stosowanie przez Jeronimo Martins Polska praktyki nieuczciwego wykorzystywania przewagi kontraktowej. Zgodnie z prawomocnym wyrokiem spółka ma w ciągu 14 dni zapłacić 170 mln zł kary.”
- **Źródło:** Sąd Apelacyjny potwierdza naruszenie Biedronki – prawomocny wyrok w sprawie przewagi kontraktowej – UOKiK (https://uokik.gov.pl/sad-apelacyjny-potwierdza-naruszenie-biedronki-prawomocny-wyrok-w-sprawie-przewagi-kontraktowej)
- **Sędzia automatyczny:** wspiera (Cytat wprost stwierdza potwierdzenie umyślnego naruszenia i prawomocną karę 170 mln zł, co wyklucza uniewinnienie.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Sieć handlowa nie ma prawa pobierać od dostawców dodatkowych i niezapowiedzianych wcześniej rabatów - to ważne rozstrzygnięcie dla polskich dostawców i producentów żywności. Sąd Apelacyjny potwierdził umyślne stosowanie przez Jeronimo Martins Polska praktyki nieuczciwego wykorzystywania przewagi kontraktowej. Zgodnie z prawomocnym wyrokiem spółka ma w ciągu 14 dni zapłacić 170 mln zł kary. Wypowiedź Prezesa UOKiK Tomasza Chróstnego

</details>

## 15. D09 (potwierdza)

- **Twierdzenie:** Polska ponownie weszła do Rady ITU.
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję.”
- **Źródło:** Polska ponownie w Radzie ITU (https://www.gov.pl/web/cyfryzacja/polska-ponownie-w-radzie-itu)
- **Sędzia automatyczny:** wspiera (Cytat wprost informuje, że Polska została wybrana do Rady ITU na kolejną kadencję, a fragment obok tego nie osłabia.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Polska ponownie w Radzie ITU 16.11.2026 Polska została wybrana do Rady Międzynarodowego Związku Telekomunikacyjnego (ITU) na kolejną kadencję. Podczas Konferencji Pełnomocników ITU (PP-26) w Dosze nasz kraj zdobył 119 głosów, uzyskując drugi najlepszy wynik w grupie Europy Wschodniej i Azji Północnej. To ważny sukces Polski w jednej z kluczowych organizacji systemu ONZ zajmujących się technologiami cyfrowymi.

</details>

## 16. A40 (potwierdza)

- **Twierdzenie:** Zawetowana ustawa wdrażała unijny akt o usługach cyfrowych (DSA).
- **Werdykt systemu:** potwierdzone
- **Cytat:** „Prezydent zawetował ustawę o DSA 13.11.2026 Prezydent RP po raz drugi zawetował ustawę, która miała umożliwić szybsze reagowanie na nielegalne treści w internecie, w tym nawoływanie do przemocy, groźby i materiały zagrażające bezpieczeństwu dzieci.”
- **Źródło:** Bezpieczniejszy internet zablokowany. Prezydent zawetował ustawę o DSA (https://www.gov.pl/web/cyfryzacja/bezpieczniejszy-internet-zablokowany-prezydent-zawetowal-ustawe-o-dsa)
- **Sędzia automatyczny:** wspiera (Tytuł i cytat mówią o wecie ustawy o DSA, co potwierdza, że chodzi o ustawę wdrażającą DSA.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Bezpieczniejszy internet zablokowany. Prezydent zawetował ustawę o DSA 13.11.2026 Prezydent RP po raz drugi zawetował ustawę, która miała umożliwić szybsze reagowanie na nielegalne treści w internecie, w tym nawoływanie do przemocy, groźby i materiały zagrażające bezpieczeństwu dzieci. Decyzja oznacza, że nowe przepisy pozwalające na sprawniejsze blokowanie takich treści nie wejdą w życie.

</details>

## 17. A42 (potwierdza)

- **Twierdzenie:** W lipcu 2025 r. w wodociągu PKP Łódź-Olechów wykryto bakterie coli.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Wodociąg PKP Łódź-Olechów - woda nie nadaje sią do spożycia 11.07.2025 Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w próbkach wody pobranych do badań laboratoryjnych w dniu 08 lipca 2025r . z wodociągu PKP Łódź-Olechów (miejsca poboru: wieża ciśnień - woda podawana do sieci i punkt na sieci wodociągowej - PKP Cargo Łódź, ul. Blocha 15) stwierdzono obecność bakterii grupy coli, Escherichia coli oraz enterokoków.”
- **Źródło:** Wodociąg PKP Łódź-Olechów - woda nie nadaje sią do spożycia - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-pkp-lodz-olechow--woda-nie-nadaje-sia-do-spozycia)
- **Sędzia automatyczny:** wspiera (Komunikat z 11.07.2025 stwierdza obecność bakterii grupy coli w próbkach z 8 lipca 2025 r.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wodociąg PKP Łódź-Olechów - woda nie nadaje sią do spożycia 11.07.2025 Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w próbkach wody pobranych do badań laboratoryjnych w dniu 08 lipca 2025r . z wodociągu PKP Łódź-Olechów (miejsca poboru: wieża ciśnień - woda podawana do sieci i punkt na sieci wodociągowej - PKP Cargo Łódź, ul. Blocha 15) stwierdzono obecność bakterii grupy coli, Escherichia coli oraz enterokoków.

</details>

## 18. A42 (potwierdza)

- **Twierdzenie:** W lipcu 2025 r. w wodociągu PKP Łódź-Olechów wykryto bakterie E. coli.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Wodociąg PKP Łódź-Olechów - woda nie nadaje sią do spożycia 11.07.2025 Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w próbkach wody pobranych do badań laboratoryjnych w dniu 08 lipca 2025r . z wodociągu PKP Łódź-Olechów (miejsca poboru: wieża ciśnień - woda podawana do sieci i punkt na sieci wodociągowej - PKP Cargo Łódź, ul. Blocha 15) stwierdzono obecność bakterii grupy coli, Escherichia coli oraz enterokoków.”
- **Źródło:** Wodociąg PKP Łódź-Olechów - woda nie nadaje sią do spożycia - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-pkp-lodz-olechow--woda-nie-nadaje-sia-do-spozycia)
- **Sędzia automatyczny:** wspiera (Cytat wprost wymienia Escherichia coli stwierdzoną w próbkach z lipca 2025 r.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wodociąg PKP Łódź-Olechów - woda nie nadaje sią do spożycia 11.07.2025 Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w próbkach wody pobranych do badań laboratoryjnych w dniu 08 lipca 2025r . z wodociągu PKP Łódź-Olechów (miejsca poboru: wieża ciśnień - woda podawana do sieci i punkt na sieci wodociągowej - PKP Cargo Łódź, ul. Blocha 15) stwierdzono obecność bakterii grupy coli, Escherichia coli oraz enterokoków.

</details>

## 19. A42 (potwierdza)

- **Twierdzenie:** W lipcu 2025 r. w wodociągu PKP Łódź-Olechów wykryto enterokoki.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „Wodociąg PKP Łódź-Olechów - woda nie nadaje sią do spożycia 11.07.2025 Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w próbkach wody pobranych do badań laboratoryjnych w dniu 08 lipca 2025r . z wodociągu PKP Łódź-Olechów (miejsca poboru: wieża ciśnień - woda podawana do sieci i punkt na sieci wodociągowej - PKP Cargo Łódź, ul. Blocha 15) stwierdzono obecność bakterii grupy coli, Escherichia coli oraz enterokoków.”
- **Źródło:** Wodociąg PKP Łódź-Olechów - woda nie nadaje sią do spożycia - Powiatowa Stacja Sanitarno-Epidemiologiczna w Łodzi (https://www.gov.pl/web/psse-lodz/wodociag-pkp-lodz-olechow--woda-nie-nadaje-sia-do-spozycia)
- **Sędzia automatyczny:** wspiera (Cytat wprost wymienia enterokoki stwierdzone w próbkach z 8 lipca 2025 r.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

Wodociąg PKP Łódź-Olechów - woda nie nadaje sią do spożycia 11.07.2025 Państwowy Powiatowy Inspektor Sanitarny w Łodzi informuje, że w próbkach wody pobranych do badań laboratoryjnych w dniu 08 lipca 2025r . z wodociągu PKP Łódź-Olechów (miejsca poboru: wieża ciśnień - woda podawana do sieci i punkt na sieci wodociągowej - PKP Cargo Łódź, ul. Blocha 15) stwierdzono obecność bakterii grupy coli, Escherichia coli oraz enterokoków.

</details>

## 20. A43 (potwierdza)

- **Twierdzenie:** W październiku 2025 r. sanepid we Wrocławiu uznał, że woda z wodociągu Święta Katarzyna nie nadaje się do picia.
- **Werdykt systemu:** brak_wystarczajacych_dowodow
- **Cytat:** „KOMUNIKAT NR 01/2025 w sprawie stwierdzenia braku przydatności wody do spożycia z wodociągu sieciowego Święta Katarzyna zaopatrującego miejscowości: Święta Katarzyna, Grodziszów, Sulęcin, część Sulimowa, część Siechnic, Radwanice. Wrocław, dnia 22 października 2025 r.”
- **Źródło:** KOMUNIKAT NR 01/2025 w sprawie stwierdzenia braku przydatności wody do spożycia z wodociągu sieciowego Święta Katarzyna zaopatrującego miejscowości: Święta Katarzyna, Grodziszów, Sulęcin, część Sulimowa, część Siechnic, Radwanice. - Powiatowa Stacja Sanitarno-Epidemiologiczna we Wrocławiu (https://www.gov.pl/web/psse-wroclaw/komunikat-nr-012025-w-sprawie-stwierdzenia-braku-przydatnosci-wody-do-spozycia-z-wodociagu-sieciowego-swieta-katarzyna-zaopatrujacego-miejscowosci-swieta-katarzyna-grodziszow-sulecin-czesc-sulimowa-czesc-siechnic-radwanice)
- **Sędzia automatyczny:** wspiera (Tytuł i data komunikatu z 22 października 2025 r. wprost stwierdzają brak przydatności wody z tego wodociągu do spożycia, wydany przez sanepid we Wrocławiu.)
- **Ocena człowieka:** [ ] wspiera  [ ] nie wspiera

<details><summary>Cały fragment</summary>

KOMUNIKAT NR 01/2025 w sprawie stwierdzenia braku przydatności wody do spożycia z wodociągu sieciowego Święta Katarzyna zaopatrującego miejscowości: Święta Katarzyna, Grodziszów, Sulęcin, część Sulimowa, część Siechnic, Radwanice. Wrocław, dnia 22 października 2025 r. KOMUNIKAT NR 01/2025 HK.903.1068.2025.AM Państwowego Powiatowego Inspektora Sanitarnego we Wrocławiu z dnia 22 października 2025 r.

</details>

