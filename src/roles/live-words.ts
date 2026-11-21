// Plik konfiguracyjny słów dla ról wyglądu na żywo (zad. 13b). JEDYNE miejsce tych list: aby coś zmienić, dopisz rdzeń.
// Rdzeń bez polskich znaków pasuje do początku słowa (odmiana); `exact` tylko całe słowo; kilka słów obok siebie to fraza.
// Rola nigdy nie wpływa na werdykt, siłę podstawy ani treść odpowiedzi. Każda wątpliwość daje pogodynka.
import { TOPIC_WORDS } from './topics';
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

/** Role wyglądu na żywo. `pogodynka` to rola domyślna i poważna; kody `pogodynka`, `bibliotekarka` i `sport` zna też silnik. */
export const LIVE_ROLES = [
  'pogodynka',
  'bibliotekarka',
  'sport',
  'pilkarz',
  'konduktor',
  'listonosz',
  'slusarz',
  'naukowiec',
  'lesnik',
  'nauczyciel',
  'kucharz',
  'kasjer',
] as const;
export type LiveRole = (typeof LIVE_ROLES)[number];
export const DEFAULT_LIVE_ROLE: LiveRole = 'pogodynka';

/** Role z rodziny sportowej: wygrywają razem, a między sobą rozstrzyga liczba trafień (remis: komentator). */
export const SPORT_FAMILY: readonly LiveRole[] = ['sport', 'pilkarz'];
export const SPORT_TIE_ROLE: LiveRole = 'sport';

/** Całe słowa (formy odmiany wypisane jawnie), tam gdzie rdzeń pasowałby też do innych wyrazów. */
function exact(...words: string[]): WordEntry[] {
  return words.map((stem) => ({ stem, exact: true }));
}

/**
 * Słowa wybierające rolę lekką. Rola lekka wymaga trafienia i przewagi nad pozostałymi rolami (rodzina sportowa
 * liczy się razem); brak trafienia albo remis daje pogodynka. Przy każdym słowie obowiązują bezpieczniki:
 * temat poważny, znana operacja, sygnał injection, więcej niż jedno twierdzenie, próba sterowania wyglądem.
 */
export const LIVE_ROLE_WORDS: Record<Exclude<LiveRole, 'pogodynka'>, readonly WordEntry[]> = {
  // piłkarz: gra, mecze, wyniki, strzelcy
  pilkarz: [
    ...exact('mecz', 'meczu', 'meczem', 'meczach', 'meczow', 'mecze', 'meczami', 'meczom', 'gol', 'gola', 'golu', 'golem', 'gole', 'goli'),
    'bramk', 'boisk', 'pilk', 'remis', 'zremisow', 'reprezentac', 'dogrywk', 'spalon', 'asyst', 'ligow',
    'strzelec', 'strzelc', 'strzelil', 'rzut karn', 'rzutu karn', 'rzuty karn', 'rzut wolny', 'rzuty rozne', 'hat trick',
    'wynik mecz', 'wyniki mecz', 'wynik spotkan', 'wyniki spotkan', 'pierwszej polowie', 'drugiej polowie',
  ],
  // komentator: przepisy, transfery, organizacja, wydarzenia okołosportowe i rozrywka
  sport: [
    'sport', 'olimpi', 'igrzysk', 'mistrzost', 'turniej', 'puchar', 'zawodni', 'trener', 'stadion', 'kibic',
    'federac', 'terminarz', 'rozgrywk', 'medal',
    ...exact('transfer', 'transfery', 'transferu', 'transferem', 'transferow', 'transferze', 'pzpn', 'uefa', 'fifa', 'ioc', 'var', 'liga', 'ligi', 'lidze'),
    'przepisy gry', 'przepisy sportow', 'przepisy pilk', 'przepisy fifa', 'przepisy uefa', 'przepisy futbol',
    'bilet na mecz', 'bilety na mecz', 'bilety na koncert', 'bilety na festiwal', 'organizacja turniej',
    'organizacja mistrzost', 'organizacja igrzysk', 'organizacja imprez', 'organizacja zawod', 'gospodarz turniej',
    'koncert', 'festiwal', 'film', 'serial', 'kino', 'eurowizj', 'teatr', 'spektakl', 'aktor', 'piosenk', 'album', 'muzyk',
  ],
  // bibliotekarz: przepisy i prawa obywatela (te same słowa, które wcześniej potwierdzały temat)
  bibliotekarka: TOPIC_WORDS.przepisy_i_prawa_obywatela,
  konduktor: [
    ...exact('pociag', 'pociagu', 'pociagiem', 'pociagi', 'pociagow', 'pociagach', 'kolej', 'kolei', 'koleje', 'metro', 'lot', 'lotu', 'loty', 'lotow', 'pkp'),
    'kolejow', 'intercity', 'polregio', 'rozklad jazdy', 'peron', 'dworzec', 'dworc', 'przewoznik', 'tramwaj', 'autobus',
    'komunikacja miejsk', 'komunikacji miejsk', 'opoznien', 'lotnisk', 'samolot', 'przewoz', 'autostrad', 'kierowc',
    'ruch drogow', 'transport publiczn', 'bilet', 'parking',
  ],
  listonosz: [
    'poczt', 'listonosz', 'przesylk', 'paczk', 'paczkomat', 'kurier', 'doreczen', 'adresat', 'nadawc', 'inpost', 'frankowan',
    'list polecon', 'listy polecone', 'list priorytet', 'znaczki poczt', 'skrzynk poczt',
    ...exact('dpd', 'dhl'),
  ],
  slusarz: [
    'zabezpiecz', 'cyberbezpiecz', 'haker', 'phishing', 'malware', 'antywirus', 'szyfrowan', 'logowan', 'klodk', 'alarm',
    ...exact('zamek', 'zamka', 'zamkiem', 'zamki', 'zamkow', 'zamku', 'klucz', 'klucze', 'kluczy', 'vpn', 'rodo', 'haslo', 'hasla', 'hasel', 'haslem'),
    'wyciek danych', 'wyciek hasel', 'weryfikacja dwuetap', 'dwuskladnik', 'ochrona danych', 'ochrony danych', 'dane osobow',
    'bezpieczenstwo w sieci', 'bezpieczenstwo danych', 'bezpieczenstwo cyfrow',
  ],
  naukowiec: [
    'naukow', 'uczon', 'badacz', 'badaczk', 'badani', 'eksperyment', 'laborator', 'hipotez', 'uniwersytet', 'uniwersytec',
    'teoria', 'teorii', 'odkryci', 'kosmos', 'kosmiczn', 'astronom', 'planet', 'teleskop', 'satelit', 'fizyk', 'chemi',
    'biolog', 'genetyk', 'genom', 'czastk', 'nobel', 'algorytm', 'sztuczn inteligenc', 'meteoryt',
    { stem: 'klimat', except: ['klimatyz'] },
    ...exact('nasa', 'esa', 'atom', 'atomu'),
  ],
  lesnik: [
    'lesn', 'drzew', 'grzyb', 'zwierz', 'dzik', 'wilk', 'jelen', 'sarn', 'zubr', 'niedzwiedz', 'ptak', 'ptaki', 'przyrod',
    'rezerwat', 'park narodow', 'puszcz', 'wycink', 'nasadzen', 'lowiectw', 'mysliw', 'polowan', 'szlak', 'ekolog',
    'ochrona srodowisk', 'ochrony srodowisk', 'srodowisk naturaln',
    ...exact('las', 'lasu', 'lasem', 'lasy', 'lasow', 'lasach', 'lesie'),
  ],
  nauczyciel: [
    'szkol', 'uczni', 'uczen', 'uczennic', 'nauczyciel', 'nauczycie', 'pedagog', 'lekcj', 'matur', 'egzamin', 'edukac',
    'oswiat', 'podstawa programow', 'program nauczania', 'podrecznik', 'przedszkol', 'student', 'studiow', 'uczelni',
    'kuratori', 'sprawdzian', 'kartkowk', 'zadan domow', 'prac domow', 'swiadectw',
    ...exact('ferie', 'ferii', 'studia', 'studiach'),
  ],
  kucharz: [
    'kuchn', 'gotowani', 'gotuj', 'ugotow', 'jedzeni', 'zywieni', 'obiad', 'kolacj', 'sniadani', 'posilk', 'restaurac',
    'gastronom', 'cukierni', 'piekarni', 'piekarz', 'chleb', 'ciast', 'mlek', 'miesn', 'warzyw', 'owoc', 'potraw',
    'skladnik', 'smaczn', 'maslo', 'cukier', 'herbat', 'napoj', 'produkt spozywcz', 'sanepid', 'diet',
    'przepis na', 'przepisu na', 'przepisy na',
    ...exact('zywnosc', 'zywnosci', 'ser', 'sera', 'serem', 'sery', 'serow', 'jajka', 'jajko', 'jaja', 'kawa', 'kawy', 'mieso', 'miesa'),
  ],
  kasjer: [
    'inflacj', 'drozyzn', 'podwyzk', 'obnizk', 'promocj', 'wyprzedaz', 'sklep', 'zakup', 'paragon', 'kasjer', 'platnosc',
    'platnos', 'blik', 'bankomat', 'kredyt', 'pozyczk', 'oszczednos', 'pensj', 'wynagrodz', 'rachunek', 'rachunki', 'faktur',
    'akcyz', 'stawk', 'oplat', 'czynsz', 'cennik', 'drozej', 'drozszy', 'tansz', 'tanio', 'bankow', 'karta platnicz',
    'placa minimaln', 'pensja minimaln', 'kurs walut', 'kurs euro', 'kurs dolara', 'budzet domow',
    ...exact(
      'cena', 'ceny', 'cene', 'cenie', 'cenach', 'cenami', 'zl', 'zlotych', 'pln', 'euro', 'dolar', 'dolarow', 'dolary',
      'kasa', 'kasy', 'kase', 'kasie', 'bank', 'banku', 'banki', 'bankow', 'vat', 'rata', 'raty', 'tani', 'tanie',
    ),
  ],
};
