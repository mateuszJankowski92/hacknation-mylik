# Zestaw kontrolny: rozkład i dokumenty

Plik `cases.json` (30 przypadków). Nie używać do zmian w silniku ani promptach.

| ID | Scen. | Etykieta | Domena | Wątpliwy |
|---|---|---|---|---|
| A01 | A | POTW | infrastruktura/morze |  |
| A02 | A | POTW | zdrowie/żywność |  |
| A03 | A | POTW | bezpieczeństwo/ostrzeganie |  |
| A04 | A | FAŁSZ | zdrowie/epidemie | tak |
| A05 | A | FAŁSZ | drogi/policja |  |
| A06 | A | tezy: POTW + FAŁSZ | obronność |  |
| A07 | A | FAŁSZ | społeczeństwo/migracja |  |
| A08 | A | FAŁSZ | obronność/dezinformacja |  |
| B01 | B | WWB | bezpieczeństwo/szkoły | tak |
| B02 | B | WWB | zdrowie/żywność | tak |
| B03 | B | WWB | drogi/samorząd |  |
| B04 | B | WWB | kolej/policja |  |
| B05 | B | WWB | sport/straż pożarna | tak |
| B06 | B | WWB | cyberbezpieczeństwo/energetyka |  |
| B07 | B | WWB | ostrzeżenia/woda | tak |
| C01 | C | BRAK | edukacja/służby | tak |
| C02 | C | BRAK | drogi/policja | tak |
| C03 | C | POTW | zdrowie/żywność |  |
| D01 | D | BRAK | infrastruktura/energetyka |  |
| D02 | D | BRAK | obronność |  |
| D03 | D | tezy: POTW + BRAK | ostrzeżenia/woda |  |
| D04 | D | BRAK | zdrowie/żywność |  |
| E01 | E | FAŁSZ | zdrowie/żywność |  |
| E02 | E | POTW | obronność |  |
| G01 | G | POTW | dyplomacja |  |
| G02 | G | FAŁSZ | prawo/konsulaty | tak |
| I01 | I | tezy: POTW + FAŁSZ | Unia Europejska |  |
| I02 | I | tezy: POTW + FAŁSZ | Unia Europejska |  |
| K01 | inne | NPW | bezpieczeństwo/ostrzeganie | tak |
| K02 | inne | NPW | obronność |  |

**Scenariusze:** A 8, B 7, C 3, D 4, E 2, G 2, I 2, inne 2
**Etykiety (całe przypadki):** POTW 6, FAŁSZ 6, tezy mieszane 4, WWB 7, BRAK 5, NPW 2

F, H, J pominięte: F i H system deklaruje jako nieobsługiwane, J testuje ścieżki kodu (pokryte w zestawie strojeniowym).

## Dokumenty użyte (żaden nie należy do 23 dokumentów wzorcowych zestawu strojeniowego)

- `cert-blog-af3a4b47`
- `dzu-2015-1274`
- `eu-polska`
- `fakenews-pl-78ef2996`
- `gov-cyfryzacja-b0d8bd7d`
- `gov-gis-12bee9e2`
- `gov-gis-1e0008f4`
- `gov-gis-5983d6b2`
- `gov-gis-7205eb42`
- `gov-gis-8e005a10`
- `gov-gis-a89ca2b7`
- `gov-gis-d6bc6b6f`
- `gov-infrastruktura-31399ca2`
- `gov-infrastruktura-bee74d0b`
- `gov-kgpsp-effbff2c`
- `gov-mon-0a6933bd`
- `gov-mon-8ff368dc`
- `gov-mswia-092086fe`
- `gov-mswia-3aa15075`
- `gov-mswia-7b7f94f1`
- `gov-mswia-9d3e180a`
- `gov-mswia-d8c0cd10`
- `gov-mswia-fefe8170`
- `gov-rcb-534c5797`
- `gov-rcb-ce8103c0`
- `msz-a16501ac`
- `policja-96d17139`
- `policja-f050b239`
- `policja-mazowiecka-8aa21c5b`
