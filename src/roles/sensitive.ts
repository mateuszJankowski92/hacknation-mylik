// Lista tematów wrażliwych (zad. 28b). JEDYNE miejsce tej listy: aby ją rozszerzyć, dopisz rdzeń.
// Rdzeń bez polskich znaków pasuje do początku słowa (odmiana), np. "wojn" -> wojna, wojny, wojnie, wojnę.
// Każde trafienie daje rolę domyślną (pogodynka). Lepiej za dużo niż za mało: fałszywe trafienie kosztuje
// tylko lżejszy wygląd, przeoczenie mogłoby dać lekki wygląd przy krzywdzie.
import { matchedEntries, type WordEntry } from './text';

export const SENSITIVE_WORDS: readonly WordEntry[] = [
  // wojna, przemoc zbrojna, polityka bezpieczeństwa
  'wojn', 'wojen', 'atak', 'zamach', 'terror', 'bomb', 'wybuch', 'eksploz', 'strzel', 'ostrzal', 'rakiet',
  'armi', 'wojsk', 'zolnier', 'mobiliz', 'najezd', 'inwazj', 'okupac', 'front', 'zakladni', 'ludobojst',
  'tortur', 'egzekuc', 'sankcj', 'bojkot', 'wyklucz', 'rosj', 'rosyj', 'rosjan', 'ukrain', 'bialorus',
  'izrael', 'palestyn', 'gaza',
  { stem: 'nato', exact: true }, { stem: 'bron', exact: true }, { stem: 'broni', exact: true },
  { stem: 'bronia', exact: true },
  // śmierć, ofiary, ranni
  'smierc', 'smiert', 'umarl', 'umier', 'zmarl', 'zgin', 'zgon', 'nie zyje', 'nie zyja', 'pogrzeb', 'zalob',
  'zabit', 'zabic', 'zabij', 'zabil', 'zabojst', 'zabojc', 'morder', 'mord', 'ofiar', 'rann', 'poszkodow',
  'samobojst', 'cialo', 'ciala', 'zwlok',
  // choroba, zdrowie, leki
  { stem: 'chor', except: ['chorw', 'chorzow', 'choral', 'chorag'] }, 'zdrow', 'lekarz', 'lekarst',
  { stem: 'lek', except: ['lekk', 'lekcj'] }, 'szczepi', 'szczepion', 'epidemi', 'pandemi', 'wirus', 'covid',
  'zaraz', 'szpital', 'nowotw', { stem: 'rak', exact: true }, { stem: 'raka', exact: true },
  'zawal', 'udar', 'kontuzj', 'uraz', 'reanim', 'karetk', 'ratown', 'zatru', 'doping', 'narkot', 'dopal',
  // katastrofy i wypadki
  'katastrof', 'wypad', 'kolizj', 'karambol', 'pozar', 'powodz', 'zalan', 'trzesien', 'huragan', 'tragedi',
  'tragicz', 'ewakuac',
  // przestępstwa i krzywda
  'przestep', 'kradziez', 'kradl', 'oszust', 'oszuk', 'napad', 'napas', 'przemoc', 'molest', 'gwalt',
  'porwa', 'porwan', 'zagin', 'krzywd', 'pedofil', 'pobi', 'bojk', 'znecan', 'handel ludzmi', 'areszt',
  'zatrzyman', 'prokurat', 'skazan', 'wiezien', 'zbrodni', 'policj',
  // uchodźcy i migracja
  'uchodz', 'migrant', 'imigrant', 'migrac', 'azyl',
];

/** Dzieci są wrażliwe w kontekście krzywdy: słowo o dziecku + słowo z tej listy. */
export const CHILD_WORDS: readonly WordEntry[] = ['dziec', 'dzieci', 'nieletn', 'malolet', 'niemowl', 'noworod'];
export const CHILD_HARM_WORDS: readonly WordEntry[] = [
  'wykorzyst', 'zaniedb', 'porzuc', 'bic', 'bil', 'bity', 'skrzywdz', 'cierpi', 'glod', 'sierot', 'odebran',
];

/** Czy tekst dotyczy tematu wrażliwego (lista słów albo dziecko w kontekście krzywdy). */
export function isSensitive(text: string): boolean {
  if (matchedEntries(text, SENSITIVE_WORDS).length > 0) return true;
  return matchedEntries(text, CHILD_WORDS).length > 0 && matchedEntries(text, CHILD_HARM_WORDS).length > 0;
}
