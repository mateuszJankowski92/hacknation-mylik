# Demagog (demagog.org.pl): ustalenia o dostępie i licencji

Data odczytu: 2026-11-21 (wieczór, czas lokalny CET). Odczyt: ręczny, kilka pojedynczych zapytań, User-Agent `Mylik-prototyp-hackathon`.

## Status: POBIERANIE NIE ZOSTAŁO WYKONANE

Powód: serwer blokuje nasz klient na poziomie WAF (Cloudflare), a brief zabrania omijania zabezpieczeń. Nie zmieniano User-Agenta, nie używano przeglądarki bezgłowej ani proxy.

## Wyniki sond (GET, User-Agent `Mylik-prototyp-hackathon`)

| Adres | Odpowiedź |
|---|---|
| https://demagog.org.pl/robots.txt | 200 |
| https://demagog.org.pl/ | 403 (Cloudflare "Sorry, you have been blocked") |
| https://demagog.org.pl/sitemap.xml | 403 |
| https://demagog.org.pl/sitemap_index.xml | 403 |
| https://demagog.org.pl/wp-sitemap.xml | 403 |
| https://demagog.org.pl/wp-json/ | 403 |
| https://demagog.org.pl/wp-json/wp/v2/posts?per_page=1 | 403 |
| https://demagog.org.pl/feed/ | 403 |
| https://demagog.org.pl/wypowiedzi/ | 403 |
| https://demagog.org.pl/fake_news/ | 403 |
| https://demagog.org.pl/regulamin/ | 403 |

Mapa witryny i publiczne API (wp-json) są więc niedostępne dla tego klienta; struktury stron wypowiedzi i fake newsów nie udało się rozpoznać automatycznie.

## robots.txt (https://demagog.org.pl/robots.txt, odczyt 2026-11-21)

- Sekcja `User-agent: *` jest pusta (brak `Disallow`), czyli sam robots.txt nie zakazuje ścieżek ogółowi robotów.
- Nagłówek Cloudflare "Content Signals": `Content-Signal: search=yes,ai-train=no,use=reference`. Operator wprost zastrzega prawa na podstawie art. 4 dyrektywy 2019/790 (wyjątek TDM): trenowanie modeli AI niedozwolone, użycie jako referencja dozwolone, wyszukiwanie dozwolone.
- Osobne `Disallow: /` dla wielu botów AI (m.in. ClaudeBot, GPTBot, CCBot, anthropic-ai, Google-Extended).

## Licencja treści

Źródło: https://demagog.org.pl/zasady-udostepniania-tresci/ ("Ogólne Warunki Licencji", obowiązują od 2022-12-28; odczyt 2026-11-21). Regulamin pod https://demagog.org.pl/regulamin/ dotyczy wyłącznie darowizn i nie mówi o treściach.

- Teksty są objęte wyłącznymi majątkowymi prawami autorskimi Stowarzyszenia Demagog. Dozwolone jest użycie niekomercyjne, bez zmian w treści, z oznaczeniem autorstwa i źródła, na takich samych warunkach dalej. Użycie komercyjne wymaga zgody (kontakt@demagog.org.pl).
- Dozwolony użytek (cytat, cele naukowe i dydaktyczne, krótkie wyciągi) pozostaje w mocy, z podaniem źródła.
- Warunki nie zawierają wyraźnego zakazu automatycznego pobierania.

## Wniosek

1. Technicznie: dostęp zablokowany (HTTP 403 WAF) dla każdej ścieżki, więc zbudowanie korpusu bez omijania zabezpieczeń nie jest możliwe.
2. Prawnie: nawet po odblokowaniu pełny korpus w prototypie wymaga zgody Stowarzyszenia (zastrzeżenie TDM `ai-train=no`, licencja niekomercyjna bez przeróbek). Rekomendacja: napisać na kontakt@demagog.org.pl z prośbą o dostęp do eksportu lub allowlistę dla User-Agent `Mylik-prototyp-hackathon`.
