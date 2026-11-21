# Zestaw kontrolny v2: rozkład i dokumenty

Plik `cases.json` (176 przypadków, 176 tez z oczekiwanym werdyktem). Stan na 21.11.2026, korpus 733 dokumenty (wersja cb62b4255ea0). Nie używać do zmian w silniku ani promptach: zestaw uruchamia się raz, po zadaniu 25, na Haiku.

Przypadki pisane bez wglądu w kod silnika, prompty i wyniki przebiegów. Etykiety ręcznie wg `docs/ETYKIETY.md`. Każdy cytat w polu `evidence` sprawdzony skryptem jako dosłowny podciąg fragmentu w `data/mylik.sqlite`.

**Koszyk** to przewidywana siła podstawy (wysoka, średnia, niska, brak), wyprowadzona z rodzaju podstawy w polu `basis`: urzędowe bieżące -> wysoka, nieurzędowe (Konkret24, fakenews.pl, EEAS) -> średnia, archiwalne (2023-2025) -> niska, brak pokrycia i opinie -> brak. To założenie autora zestawu, nie odczyt z silnika; faktyczny koszyk nada silnik. Tezy BRAK i NPW liczone w koszyku "brak".

| ID | Scen. | Etykieta | Domena | Podstawa | Koszyk (przewidywany) | Wątpliwy |
|---|---|---|---|---|---|---|
| A01 | A | POTW | cyfryzacja/dyplomacja | urzędowe bieżące | wysoka |  |
| A02 | A | tezy: FAŁSZ + FAŁSZ | cyfryzacja/dyplomacja | urzędowe bieżące | wysoka |  |
| A03 | A | POTW | cyfryzacja/administracja | urzędowe bieżące | wysoka |  |
| A04 | A | tezy: FAŁSZ | cyfryzacja/e-usługi | urzędowe bieżące | wysoka | tak |
| A05 | A | POTW | cyfryzacja/prawo | urzędowe bieżące | wysoka |  |
| A06 | A | POTW | cyfryzacja/infrastruktura | urzędowe bieżące | wysoka |  |
| A07 | A | FAŁSZ | finanse/rynek kapitałowy | urzędowe bieżące | wysoka |  |
| A08 | A | POTW | finanse/oszustwa | urzędowe bieżące | wysoka |  |
| A09 | A | FAŁSZ | finanse/oszustwa | urzędowe bieżące | wysoka |  |
| A10 | A | POTW | cło/handel | urzędowe bieżące | wysoka |  |
| A11 | A | POTW | cło/podróbki | urzędowe bieżące | wysoka |  |
| A12 | A | POTW | obronność/uzbrojenie | urzędowe bieżące | wysoka |  |
| A13 | A | POTW | obronność/przemysł | urzędowe bieżące | wysoka |  |
| A14 | A | FAŁSZ | obronność/dezinformacja | urzędowe bieżące | wysoka |  |
| A15 | A | POTW | dyplomacja/prawo | urzędowe bieżące | wysoka |  |
| A16 | A | POTW | dyplomacja/prawo humanitarne | urzędowe bieżące | wysoka |  |
| A17 | A | FAŁSZ | konsulaty/paszporty | urzędowe bieżące | wysoka |  |
| A18 | A | POTW | straż pożarna/OSP | urzędowe bieżące | wysoka |  |
| A19 | A | FAŁSZ | zdrowie/epidemie | urzędowe bieżące | wysoka |  |
| A20 | A | POTW | zdrowie/żywność | urzędowe bieżące | wysoka |  |
| A21 | A | POTW | morze/prawo | urzędowe bieżące | wysoka |  |
| A22 | A | FAŁSZ | konsumenci/handel | urzędowe bieżące | wysoka |  |
| A23 | A | POTW | bezpieczeństwo/sabotaż | urzędowe bieżące | wysoka |  |
| A24 | A | FAŁSZ | policja/Kraków | urzędowe bieżące | wysoka |  |
| A25 | A | tezy: POTW + FAŁSZ | cło/akcyza | urzędowe bieżące | wysoka | tak |
| A26 | A | POTW | zdrowie/szczepienia | nieurzędowe | średnia |  |
| A27 | A | POTW | polityka/rozliczenia | nieurzędowe | średnia |  |
| A28 | A | POTW | kolej/polityka | nieurzędowe | średnia | tak |
| A29 | A | FAŁSZ | policja/protesty | nieurzędowe | średnia |  |
| A30 | A | FAŁSZ | wojna/dezinformacja | nieurzędowe | średnia |  |
| A31 | A | POTW | wojna/Ukraina | nieurzędowe | średnia |  |
| A32 | A | FAŁSZ | świat/USA | nieurzędowe | średnia |  |
| A33 | A | FAŁSZ | prawo/zdrowie | nieurzędowe | średnia |  |
| A34 | A | POTW | wojna/prawa człowieka | nieurzędowe | średnia |  |
| A35 | A | POTW | klimat/dezinformacja | nieurzędowe | średnia |  |
| A36 | A | FAŁSZ | edukacja/media | nieurzędowe | średnia |  |
| A37 | A | POTW | UE/dezinformacja | nieurzędowe | średnia | tak |
| A38 | A | FAŁSZ | UE/dezinformacja | nieurzędowe | średnia | tak |
| A39 | A | POTW | świat/dyplomacja | nieurzędowe | średnia |  |
| A40 | A | POTW | cyfryzacja/prawo | urzędowe bieżące | wysoka |  |
| A41 | A | FAŁSZ | cyfryzacja/tożsamość | urzędowe bieżące | wysoka |  |
| A42 | A | POTW | woda/Łódź | archiwalne | niska |  |
| A43 | A | POTW | woda/Wrocław | archiwalne | niska |  |
| A44 | A | POTW | zdrowie/praca | archiwalne | niska |  |
| A45 | A | POTW | migracja | archiwalne | niska |  |
| A46 | A | POTW | edukacja/migracja | archiwalne | niska |  |
| A47 | A | POTW | woda/Łódź | archiwalne | niska |  |
| A48 | A | POTW | woda/Wrocław | archiwalne | niska |  |
| A49 | A | FAŁSZ | zdrowie/żywność | archiwalne | niska |  |
| A50 | A | FAŁSZ | migracja | archiwalne | niska |  |
| A51 | A | FAŁSZ | woda/Łódź | archiwalne | niska | tak |
| A52 | A | tezy: FAŁSZ | woda/Wrocław | archiwalne | niska | tak |
| A53 | A | POTW | zdrowie/szczepienia | nieurzędowe | średnia | tak |
| B01 | B | WWB | cyfryzacja/dyplomacja | urzędowe bieżące | wysoka |  |
| B02 | B | WWB | cyfryzacja/prawo | urzędowe bieżące | wysoka |  |
| B03 | B | WWB | cyfryzacja/infrastruktura | urzędowe bieżące | wysoka |  |
| B04 | B | WWB | finanse/rating | urzędowe bieżące | wysoka | tak |
| B05 | B | WWB | drogi/opłaty | urzędowe bieżące | wysoka |  |
| B06 | B | WWB | UE/budżet | urzędowe bieżące | wysoka |  |
| B07 | B | WWB | podatki/kryptowaluty | urzędowe bieżące | wysoka |  |
| B08 | B | WWB | hazard/policja | urzędowe bieżące | wysoka |  |
| B09 | B | WWB | obronność/uzbrojenie | urzędowe bieżące | wysoka |  |
| B10 | B | WWB | obronność/przemysł | urzędowe bieżące | wysoka |  |
| B11 | B | WWB | obronność/infrastruktura | urzędowe bieżące | wysoka |  |
| B12 | B | WWB | dyplomacja/prawo | urzędowe bieżące | wysoka |  |
| B13 | B | WWB | drogi/autostrady | urzędowe bieżące | wysoka |  |
| B14 | B | WWB | kolej/zabytki | urzędowe bieżące | wysoka |  |
| B15 | B | WWB | morze/prawo | urzędowe bieżące | wysoka |  |
| B16 | B | WWB | konsumenci/handel | urzędowe bieżące | wysoka |  |
| B17 | B | WWB | cło/akcyza | urzędowe bieżące | wysoka |  |
| B18 | B | WWB | powódź/odbudowa | urzędowe bieżące | wysoka |  |
| B19 | B | WWB | zdrowie/epidemie | urzędowe bieżące | wysoka |  |
| B20 | B | WWB | straż pożarna/sport | urzędowe bieżące | wysoka |  |
| B21 | B | WWB | dyplomacja/prawo humanitarne | urzędowe bieżące | wysoka |  |
| B22 | B | WWB | konsumenci/handel | urzędowe bieżące | wysoka | tak |
| B23 | B | WWB | dezinformacja/zdjęcia | nieurzędowe | średnia |  |
| B24 | B | WWB | świat/dyplomacja | nieurzędowe | średnia |  |
| B25 | B | WWB | zdrowie/szczepienia | nieurzędowe | średnia |  |
| B26 | B | WWB | polityka/rozliczenia | nieurzędowe | średnia |  |
| B27 | B | WWB | kolej/polityka | nieurzędowe | średnia |  |
| B28 | B | WWB | cyfryzacja/prawo | nieurzędowe | średnia |  |
| B29 | B | WWB | woda/Łódź | archiwalne | niska |  |
| B30 | B | WWB | woda/Łódź | archiwalne | niska |  |
| B31 | B | WWB | woda/Łódź | archiwalne | niska | tak |
| B32 | B | WWB | woda/Łódź | archiwalne | niska |  |
| B33 | B | WWB | woda/Łódź | archiwalne | niska |  |
| B34 | B | WWB | woda/Łódź | archiwalne | niska | tak |
| B35 | B | WWB | woda/Łódź | urzędowe bieżące | wysoka |  |
| B36 | B | WWB | migracja | archiwalne | niska |  |
| B37 | B | WWB | UE/prawo | urzędowe bieżące | wysoka | tak |
| C01 | C | BRAK | energetyka/górnictwo | nieurzędowe | brak | tak |
| C02 | C | BRAK | obronność/lotnictwo | urzędowe bieżące | brak | tak |
| C03 | C | POTW | cyfryzacja/infrastruktura | urzędowe bieżące | wysoka |  |
| C04 | C | POTW | konsumenci/handel | urzędowe bieżące | wysoka |  |
| C05 | C | POTW | zdrowie/szczepienia | urzędowe bieżące | wysoka | tak |
| D01 | D | BRAK | transport/samorząd | brak pokrycia | brak |  |
| D02 | D | BRAK | zdrowie/żywność | brak pokrycia | brak |  |
| D03 | D | BRAK | finanse/podatki | brak pokrycia | brak |  |
| D04 | D | BRAK | lotnictwo | brak pokrycia | brak |  |
| D05 | D | BRAK | cyfryzacja/policja | brak pokrycia | brak |  |
| D06 | D | BRAK | obronność/uzbrojenie | brak pokrycia | brak |  |
| D07 | D | BRAK | transport/samorząd | brak pokrycia | brak |  |
| D08 | D | BRAK | konsumenci/handel | brak pokrycia | brak |  |
| D09 | D | tezy: POTW + BRAK | cyfryzacja/dyplomacja | urzędowe bieżące | wysoka / brak |  |
| D10 | D | tezy: POTW + BRAK | hazard/policja | urzędowe bieżące | wysoka / brak | tak |
| D11 | D | BRAK | przyroda | brak pokrycia | brak |  |
| D12 | D | BRAK | pogoda | brak pokrycia | brak |  |
| D13 | D | BRAK | zdrowie/szczepienia | nieurzędowe | brak | tak |
| D14 | D | BRAK | zdrowie/5G | nieurzędowe | brak | tak |
| D15 | D | BRAK | historia/pamięć | nieurzędowe | brak | tak |
| D16 | D | BRAK | UE/motoryzacja | nieurzędowe | brak | tak |
| D17 | D | BRAK | zdrowie/epidemie | urzędowe bieżące | brak | tak |
| E01 | E | BRAK | UE/polityka | brak pokrycia | brak |  |
| E02 | E | POTW | cyfryzacja/dyplomacja | urzędowe bieżące | wysoka |  |
| E03 | E | POTW | konsumenci/handel | urzędowe bieżące | wysoka |  |
| E04 | E | FAŁSZ | konsulaty/paszporty | urzędowe bieżące | wysoka | tak |
| E05 | E | FAŁSZ | cyfryzacja/e-usługi | urzędowe bieżące | wysoka |  |
| E06 | E | FAŁSZ | cyfryzacja/administracja | urzędowe bieżące | wysoka |  |
| E07 | E | WWB | cło/podróbki | urzędowe bieżące | wysoka |  |
| E08 | E | BRAK | nauka/kosmos | brak pokrycia | brak |  |
| F01 | F | nieobsługiwany | wojna/dezinformacja | brak pokrycia | poza profilem |  |
| H01 | H | nieobsługiwany | inne | brak pokrycia | poza profilem |  |
| G01 | G | POTW | cło/handel | urzędowe bieżące | wysoka |  |
| G02 | G | FAŁSZ | cyfryzacja/prawo | urzędowe bieżące | wysoka |  |
| G03 | G | BRAK | transport/samorząd | brak pokrycia | brak |  |
| G04 | G | WWB | ostrzeżenia/powietrze | urzędowe bieżące | wysoka |  |
| G05 | G | NPW | ostrzeżenia/opinia | opinia | brak |  |
| I01 | I | tezy: POTW + BRAK | cyfryzacja/e-usługi | urzędowe bieżące | wysoka / brak | tak |
| I02 | I | POTW | ostrzeżenia/obrona | urzędowe bieżące | wysoka |  |
| I03 | I | WWB | cło/podróbki | urzędowe bieżące | wysoka |  |
| I04 | I | stan: brak_mozliwosci_sprawdzenia | bezpieczeństwo/SSRF | brak pokrycia | poza profilem |  |
| I05 | I | FAŁSZ | wojna/Ukraina | nieurzędowe | średnia |  |
| J01 | J | stan: awaria_techniczna | cyfryzacja/prawo | urzędowe bieżące | poza profilem |  |
| J02 | J | stan: awaria_techniczna | cyfryzacja/dyplomacja | urzędowe bieżące | poza profilem |  |
| J03 | J | stan: brak_mozliwosci_sprawdzenia | cło/akcyza | urzędowe bieżące | poza profilem |  |
| J04 | J | stan: awaria_techniczna | obronność/infrastruktura | urzędowe bieżące | poza profilem |  |
| K01 | inne | NPW | cyfryzacja/opinia | opinia | brak |  |
| K02 | inne | NPW | finanse/prognoza | opinia | brak |  |
| K03 | inne | NPW | obronność/opinia | opinia | brak |  |
| K04 | inne | NPW | cyfryzacja/opinia | opinia | brak |  |
| K05 | inne | NPW | cyfryzacja/prognoza | opinia | brak |  |
| K06 | inne | NPW | straż pożarna/opinia | opinia | brak |  |
| K07 | inne | tezy: POTW + NPW | finanse/rating | urzędowe bieżące | wysoka / brak |  |
| K08 | inne | POTW | finanse/prognoza | urzędowe bieżące | wysoka | tak |
| K09 | inne | NPW | technologia/prognoza | opinia | brak |  |
| K10 | inne | tezy: POTW + NPW | cyfryzacja/dyplomacja | urzędowe bieżące | wysoka / brak | tak |
| K11 | inne | NPW | kolej/opinia | opinia | brak |  |
| K12 | inne | NPW | ostrzeżenia/opinia | opinia | brak |  |
| K13 | inne | NPW | zdrowie/opinia | opinia | brak |  |
| K14 | inne | NPW | energetyka/prognoza | opinia | brak |  |
| K15 | inne | NPW | zdrowie/opinia | opinia | brak |  |
| K16 | inne | NPW | drogi/opinia | opinia | brak |  |
| A54 | A | POTW | UE/instytucje | archiwalne | niska |  |
| A55 | A | POTW | UE/instytucje | archiwalne | niska |  |
| A56 | A | POTW | UE/podróże | archiwalne | niska |  |
| A57 | A | POTW | UE/podróże | archiwalne | niska |  |
| A58 | A | FAŁSZ | migracja | archiwalne | niska | tak |
| A59 | A | POTW | migracja | archiwalne | niska |  |
| B38 | B | WWB | UE/instytucje | archiwalne | niska |  |
| B39 | B | WWB | UE/podróże | archiwalne | niska |  |
| B40 | B | WWB | UE/podróże | archiwalne | niska |  |
| B41 | B | WWB | woda/Wrocław | archiwalne | niska |  |
| A60 | A | POTW | wojna/dezinformacja | nieurzędowe | średnia |  |
| A61 | A | POTW | polityka/media | nieurzędowe | średnia |  |
| B42 | B | WWB | kultura/dezinformacja | nieurzędowe | średnia |  |
| B43 | B | WWB | zdrowie/5G | nieurzędowe | średnia |  |
| K17 | inne | NPW | kolej/opinia | opinia | brak |  |
| K18 | inne | NPW | UE/prognoza | opinia | brak |  |
| K19 | inne | NPW | konsumenci/opinia | opinia | brak |  |
| K20 | inne | NPW | cło/opinia | opinia | brak |  |
| K21 | inne | NPW | zdrowie/prognoza | opinia | brak |  |
| K22 | inne | NPW | obronność/opinia | opinia | brak |  |
| D18 | D | BRAK | obronność/przemysł | urzędowe bieżące | brak |  |
| D19 | D | BRAK | konsulaty/paszporty | brak pokrycia | brak |  |
| D20 | D | BRAK | cyfryzacja/e-usługi | urzędowe bieżące | brak |  |
| D21 | D | BRAK | woda/samorząd | brak pokrycia | brak |  |

## Podsumowanie

**Scenariusze (przypadki):** A 61, B 43, C 5, D 21, E 8, F 1, G 5, H 1, I 5, J 4, inne 22

**Etykiety (tezy):** POTW 53, FAŁSZ 28, WWB 46, BRAK 27, NPW 22

**Koszyki przewidywane (tezy):** wysoka 73, średnia 26, niska 28, brak 49

| Koszyk \ etykieta | POTW | FAŁSZ | WWB | BRAK | NPW |
|---|---|---|---|---|---|
| wysoka | 30 | 16 | 27 | 0 | 0 |
| średnia | 11 | 7 | 8 | 0 | 0 |
| niska | 12 | 5 | 11 | 0 | 0 |
| brak | 0 | 0 | 0 | 27 | 22 |

**Wątpliwe:** 27 przypadków (`doubtful: true`, powód w `note` po słowie UWAGA).

Poza profilem omylności: J01-J04 (stany techniczne), I04 (adres prywatny), F01 i H01 (nieobsługiwane: obraz, pętla informacji). Pole `notice` celowo pominięte (oczekiwane są tylko werdykty).

Ryzyko koszyków: jeśli silnik oceni źródła fact-checkingowe tak samo jak urzędowe albo nie uzna dokumentów z 2025 r. za archiwalne, koszyki "średnia" i "niska" mogą spaść poniżej 20 tez. Wtedy profil pokaże tylko koszyki "wysoka" i "brak".

## Dokumenty użyte (90)

Oznaczenie * : dokument użyty już w zestawie strojeniowym lub kontrolnym v1 (tu z innymi twierdzeniami).

- `eeas-fimi`: A37, A38
- `eu-podroze` *: A56, A57, B40
- `eu-polska` *: A54, A55, B38, B39
- `fakenews-pl-0726d3f8`: A59
- `fakenews-pl-08b714e3`: A45
- `fakenews-pl-257f8cfe`: A36
- `fakenews-pl-38835d03`: A58
- `fakenews-pl-78ef2996` *: A50, B36
- `fakenews-pl-8fff4a69`: A35
- `fakenews-pl-d74cb11c`: A46
- `gov-cyfryzacja-21ed64f1`: A05, B02
- `gov-cyfryzacja-613f45ce`: A04, E05, I01, D20
- `gov-cyfryzacja-85fbcc71`: A41
- `gov-cyfryzacja-a762f64a`: A40, G02
- `gov-cyfryzacja-b9bb8f60`: A06, B03, C03
- `gov-cyfryzacja-dfa61888`: A03, E06
- `gov-cyfryzacja-f478411e`: A01, A02, B01, D09, E02, K10
- `gov-finanse-015bdfdf`: A08, A09
- `gov-finanse-14b9e70e`: B04, K07, K08
- `gov-finanse-626addfe`: A07
- `gov-finanse-93ce21e6`: B05
- `gov-finanse-c639f048`: B06
- `gov-gis-23c4dca8`: C05
- `gov-gis-2e603047`: A19, B19, D17
- `gov-gis-ef1a2d9a`: A20
- `gov-infrastruktura-6fa273cf`: A21, B15
- `gov-infrastruktura-e72db21a`: B14
- `gov-infrastruktura-fe1af8d8`: B13
- `gov-kas-04f88045`: A10, B37, G01
- `gov-kas-39f3e020`: B07
- `gov-kas-828638c9`: A25, B17
- `gov-kas-88cc6cd5`: B08, D10
- `gov-kas-d15cd960`: A11, E07, I03
- `gov-kgpsp-b29de201`: A18
- `gov-kgpsp-c2a1b255`: B20
- `gov-mon-0ec9c07e`: B11
- `gov-mon-36b7bc6e`: C02
- `gov-mon-803eb58e`: A14
- `gov-mon-b9a9b175`: A13, B10, D18
- `gov-mon-f316693e`: A12, B09
- `gov-mswia-3888358d`: B18
- `gov-mswia-d59aed87`: A23
- `gov-rcb-254cabb7`: G04
- `gov-rcb-ae8232b6`: I02
- `gov-sanepid-0b8d725e`: A51, B32
- `gov-sanepid-15062b97`: B33
- `gov-sanepid-26e110c1`: A43, A52, B41
- `gov-sanepid-2e4c07e4`: B41
- `gov-sanepid-4ef4bf19`: B35
- `gov-sanepid-549ca51d`: B35
- `gov-sanepid-79239c94`: B29
- `gov-sanepid-7dac6e3d`: B33
- `gov-sanepid-9d850db9`: A44, A49
- `gov-sanepid-9f2861c8`: B30
- `gov-sanepid-a4617712`: B32
- `gov-sanepid-bbc5ef07`: B31
- `gov-sanepid-c2ab1fc5`: B34
- `gov-sanepid-cf3e6b9d`: B29
- `gov-sanepid-d0f7495b`: A42, B30
- `gov-sanepid-d5961b29`: A48
- `gov-sanepid-de29e348`: A47, B31
- `gov-sanepid-f899a759`: B34
- `konkret24-199cb092`: B27
- `konkret24-1d105139`: A31
- `konkret24-3878ab8a`: A39, B24
- `konkret24-553d8007`: A61
- `konkret24-5c0bdb54`: A40, B28
- `konkret24-5f84a92a`: A27, B26
- `konkret24-6331daff`: A53
- `konkret24-6ce8ef2f`: A32
- `konkret24-73e62f52`: D15
- `konkret24-81f720c7`: A28
- `konkret24-943355a8`: C01
- `konkret24-9929a2ba`: D16
- `konkret24-a378e7c1`: B42
- `konkret24-a81c2e79`: B23
- `konkret24-b48bf862`: D13
- `konkret24-bd08aa11`: D14, B43
- `konkret24-c3433856`: G02
- `konkret24-cf19f4a7`: A34
- `konkret24-d07d0ab0` *: A29
- `konkret24-d6a42449`: A26, B25
- `konkret24-eafd1455`: A30, A31, I05
- `konkret24-f445fd23`: A33
- `konkret24-f6d6ddd5`: A60
- `msz-005`: A17, E04
- `msz-1531d6aa`: A16, B21
- `msz-23df4a5e`: A15, B12
- `policja-892795c2`: A24
- `uokik-a5017bde`: A22, B16, B22, C04, E03
