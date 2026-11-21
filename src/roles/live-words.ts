// Plik konfiguracyjny słów dla ról wyglądu na żywo (zad. 13b). JEDYNE miejsce tych list: aby coś zmienić, dopisz rdzeń.
// Rdzeń bez polskich znaków pasuje do początku słowa (odmiana); `exact` tylko całe słowo; kilka słów obok siebie to fraza.
// Rola nigdy nie wpływa na werdykt, siłę podstawy ani treść odpowiedzi. Każda wątpliwość daje pogodynka.
import type { WordEntry } from './text';

/**
 * Dodatkowe słowa poważnych tematów, których nie ma na liście wrażliwych (src/roles/sensitive.ts), a które
 * często towarzyszą sportowi i szkole: przemoc w tłumie, szykany, nałogi, korupcja. Trafienie wyłącza rolę lekką
 * i obraz pogody (zamiast niego jest gest wskazania cytatu i daty).
 */
export const SERIOUS_EXTRA_WORDS: readonly WordEntry[] = [
  // przemoc i szykany (stadion, szkoła)
  'starci', 'agresj', 'nekan', 'mobbing', 'zastraszan', 'cyberprzemoc', 'przesladowan', 'dyskryminac',
  'rasizm', 'rasist', 'homofob', 'obelg', 'wyzwisk', 'hejt', 'zaczep', 'pobic', 'rozboj', 'bojka', 'burd',
  'zadym', 'petard', 'zranion', { stem: 'bite', exact: true }, { stem: 'bita', exact: true },
  { stem: 'bicie', exact: true },
  // zdrowie psychiczne, nałogi
  'depresj', 'samookaleczen', 'zaburzen', 'uzaleznien', 'nalog', 'alkohol', 'pijan', 'nietrzezw', 'amfetamin',
  'sterydy',
  // korupcja i nieuczciwość w sporcie
  'korupcj', 'lapowk', 'ustawian', 'ustawion', 'afer',
];

/**
 * Słowa, które w zwykłym sporcie nie oznaczają przemocy, a lista wrażliwych traktuje je jak "strzelaninę":
 * strzelił gola, strzelec, strzela. Wyjątek działa TYLKO z kontekstem sportowym i tylko dla tych form
 * (strzelanina, strzelba, strzelać do ludzi nadal są wrażliwe).
 */
export const SPORT_SHOT_PATTERN = /^strzel(il|ila|ilo|ili|ic|ec|ca|cy|cu|cem|com|cow|cach|cami|a)$/;

export const SPORT_SHOT_CONTEXT: readonly WordEntry[] = [
  'gol', 'bramk', 'mecz', 'pilk', 'boisk', 'lig', 'turniej', 'mistrzost', 'kadr', 'reprezentac',
];
