// Słowa potwierdzające temat (zad. 28b). Temat nadaje model; kod uznaje go za jednoznaczny tylko wtedy,
// gdy tekst zawiera słowo z listy tego tematu i żadnego słowa z listy drugiego tematu.
import type { Topic } from '../contracts/claim';
import type { WordEntry } from './text';

export const TOPIC_WORDS: Record<Exclude<Topic, 'inne'>, readonly WordEntry[]> = {
  sport_rozrywka: [
    'sport', 'mecz', 'lig', 'turniej', 'mistrz', 'olimpi', 'igrzysk', 'pilk', 'reprezentac', 'trener',
    'zawodni', 'gol', 'bramk', 'kibic', 'stadion', 'puchar', 'medal', 'wyscig', 'tenis', 'siatkow',
    'koszykow', 'skoczn', 'skoczk', 'maraton', 'druzyn', 'klub', 'sezon', 'zwyciest', 'final',
    'koncert', 'festiwal', 'film', 'serial', 'kino', 'kinow', 'muzyk', 'album', 'piosenk', 'aktor',
    'eurowizj', 'teatr', 'spektakl', 'gwiazd', 'zespol',
  ],
  przepisy_i_prawa_obywatela: [
    'ustaw', 'przepis', 'kodeks', 'rozporzadz', 'sejm', 'senat', 'obywatel', 'urzad', 'urzed', 'wniosek',
    'wnioski', 'wniosk', 'dowod osobist', 'paszport', 'emerytur', 'swiadczen', 'podat', 'mandat', 'zasilek',
    'zasilk', 'pesel', 'ministerstw', 'gmin', 'zus', 'krus', 'rejestr', 'pozwolen', 'prawo jazdy', 'urlop',
    'pracodaw', 'umow', 'konsument', 'reklamac', 'rzecznik', 'trybunal', 'deklarac', 'formularz', 'uprawni',
    { stem: 'prawo', exact: true }, { stem: 'prawa', exact: true }, { stem: 'praw', exact: true },
    { stem: 'sad', exact: true }, { stem: 'sadu', exact: true }, { stem: 'sadzie', exact: true },
  ],
};
