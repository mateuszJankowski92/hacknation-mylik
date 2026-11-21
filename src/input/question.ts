// Zgłoszenie w formie pytania. Pytanie rozstrzygające (tak/nie) i zapis "podobno", "słyszałem, że"
// to najczęstszy zapis obywatela: zamieniamy je na twierdzenie do sprawdzenia (ta sama ścieżka co
// zdanie oznajmujące, ten sam klucz rekordu). Pytanie otwarte bez tezy ("kto", "ile", "gdzie"...)
// nie jest sprawdzeniem: wejście prosi wtedy o zdanie do sprawdzenia.
// Reguły są ogólne (forma gramatyczna), bez list konkretnych tematów.

const E = '(?![\\p{L}\\p{N}])';

/**
 * Pytanie o to, czy redakcja lub instytucja coś sprawdzała ("Czy X sprawdzał, czy ...?"): teza stoi
 * po drugim "czy" albo "że". Forma gramatyczna, bez nazw konkretnych redakcji.
 */
const REVIEW_LEAD = `czy\\s+(?:redakcj\\p{L}*\\s+)?\\p{L}[\\p{L}.-]*(?:\\s+\\p{L}[\\p{L}.-]*)?\\s+(?:to\\s+|kiedyś\\s+|kiedys\\s+|już\\s+|juz\\s+)?(?:sprawdza\\p{L}*|sprawdzi\\p{L}*|weryfikowa\\p{L}*|zweryfikowa\\p{L}*)\\s*,?\\s*(?:czy|że|ze)`;

/** Wstępy relacjonujące albo pytające, po których stoi teza (z opcjonalnym "że"). */
const LEAD_INS = [
  REVIEW_LEAD,
  `czy\\s+(?:to\\s+)?(?:jest\\s+)?prawd(?:a|ą)(?:\\s+jest)?,?\\s+(?:że|ze)`,
  `czy\\s+(?:to\\s+)?(?:jest\\s+)?prawd(?:a|ą)(?:\\s+jest)?\\s*[:,-]?`,
  `czy\\s+(?:naprawdę|naprawde|rzeczywiście|rzeczywiscie|faktycznie|serio|aby|przypadkiem|na\\s+pewno)`,
  `(?:to\\s+)?prawda,?\\s+(?:że|ze)`,
  `(?:podobno|ponoć|ponoc|rzekomo|ponoć\\s+to\\s+prawda)`,
  `(?:słyszał(?:e|a)m|slyszal(?:e|a)m|czytał(?:e|a)m|czytal(?:e|a)m|widział(?:e|a)m|widzial(?:e|a)m|dowiedział(?:e|a)m\\s+się|dowiedzial(?:e|a)m\\s+sie)(?:\\s+\\p{L}+){0,3},?\\s+(?:że|ze)`,
  `(?:ktoś|ktos|kolega|koleżanka|kolezanka|sąsiad|sasiad|sąsiadka|sasiadka|znajom\\p{L}*|rodzin\\p{L}*|mama|tata|babcia|dziadek)(?:\\s+\\p{L}+){0,4}?\\s+(?:mówi|mowi|mówił\\p{L}*|mowil\\p{L}*|powiedział\\p{L}*|powiedzial\\p{L}*|pisze|napisał\\p{L}*|napisal\\p{L}*|twierdzi|przysłał\\p{L}*|przyslal\\p{L}*)(?:\\s+\\p{L}+){0,2},?\\s+(?:że|ze)`,
  `(?:mówią|mowia|piszą|pisza|ludzie\\s+mówią|ludzie\\s+mowia|w\\s+internecie\\s+piszą|w\\s+internecie\\s+pisza),?\\s+(?:że|ze)`,
  `czy`,
];
const LEAD_IN = new RegExp(`^\\s*(?:${LEAD_INS.join('|')})${E}\\s*[,:]?\\s*`, 'iu');

/** Doczepione na końcu pytanie o potwierdzenie (", prawda?", ", tak?", ", czy nie?"). */
const TAG_QUESTION = new RegExp(`,\\s*(?:prawda|tak|czy\\s+nie|nie|serio|naprawdę|naprawde)\\s*\\?+\\s*$`, 'iu');

/** Pytanie otwarte: zaczyna się zaimkiem pytającym (bez tezy do potwierdzenia lub zaprzeczenia). */
const OPEN_QUESTION = new RegExp(
  `^\\s*(?:a\\s+)?(?:kto|kogo|komu|kim|co|czego|czemu|czym|ile|ilu|gdzie|kiedy|jak|jaki|jaka|jakie|jakiego|jakiej|jakich|jakim|dlaczego|po\\s+co|skąd|skad|dokąd|dokad|który|ktory|która|ktora|które|ktore|którego|ktorego|której|ktorej|których|ktorych|czyj|czyja|czyje|odkąd|odkad|dokąd|na\\s+ile|o\\s+której|o\\s+ktorej)${E}`,
  'iu',
);

// Granica zdania: znak końca, odstęp i wielka litera albo cudzysłów (nie dzieli dat "21.11" ani liczb).
const SENTENCE_BOUNDARY = /(?<=[.!?…])\s+(?=[\p{Lu}„"«(])/u;
const sentencesOf = (line: string) => line.split(SENTENCE_BOUNDARY);

function capitalize(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase('pl') + s.slice(1) : s;
}

/** Jedno zdanie: wstęp pytający lub relacjonujący znika, znak zapytania zmienia się w kropkę. */
function sentenceToStatement(sentence: string): string {
  const trimmed = sentence.trim();
  if (!trimmed) return '';
  const isQuestion = /\?\s*$/u.test(trimmed);
  let body = trimmed.replace(TAG_QUESTION, isQuestion ? '' : '$&');
  const hadTag = body !== trimmed;
  const before = body;
  body = body.replace(LEAD_IN, '');
  const changed = hadTag || body !== before;
  if (!isQuestion && !changed) return trimmed;
  if (isQuestion && !changed && OPEN_QUESTION.test(trimmed)) return trimmed;
  body = body.replace(/[\s?]+$/u, '').replace(/[.!…]+$/u, '');
  if (!body.trim()) return '';
  return `${capitalize(body.trim())}.`;
}

/**
 * Zamienia pytania rozstrzygające i wstępy relacjonujące na zdania oznajmujące. Pytania otwarte
 * i zwykłe zdania zostają bez zmian. Nowe wiersze zostają (każdy wiersz osobno).
 */
export function questionToStatement(text: string): string {
  return text
    .split('\n')
    .map((line) => sentencesOf(line).map(sentenceToStatement).filter(Boolean).join(' '))
    .filter((line) => line.length > 0)
    .join('\n');
}

/** Czy całe zgłoszenie to wyłącznie pytania otwarte (bez żadnej tezy do sprawdzenia). */
export function isOnlyOpenQuestions(text: string): boolean {
  const sentences = text.split('\n').flatMap(sentencesOf).map((s) => s.trim()).filter(Boolean);
  return sentences.length > 0 && sentences.every((s) => /\?\s*$/u.test(s) && OPEN_QUESTION.test(s));
}

export const OPEN_QUESTION_MESSAGE =
  'Napisz zdanie, które chcesz sprawdzić. Na przykład: „Od jutra bilet w mieście kosztuje 10 zł.”';


const REVIEW_QUESTION = new RegExp(`^\\s*${REVIEW_LEAD}${E}`, 'iu');
const REVIEW_ONLY = /^\s*czy\s+(?:redakcj\p{L}*\s+)?\p{L}[\p{L}.-]*(?:\s+\p{L}[\p{L}.-]*)?\s+(?:to\s+|kiedyś\s+|kiedys\s+|już\s+|juz\s+)?(?:sprawdza\p{L}*|sprawdzi\p{L}*|weryfikowa\p{L}*|zweryfikowa\p{L}*)/iu;

/** Pytanie rozstrzygające (tak/nie): zaczyna się od "czy" albo kończy znakiem zapytania i nie jest pytaniem otwartym. */
export function isYesNoQuestion(text: string): boolean {
  // Pytanie rozstrzygające w dowolnym zdaniu zgłoszenia (np. „Słyszałem, że X. Czy to prawda?”).
  const sentences = text.split('\n').flatMap(sentencesOf).map((s) => s.trim()).filter(Boolean);
  return sentences.some((s) => /^\s*(?:a\s+)?czy(?![\p{L}\p{N}])/iu.test(s) || (/\?\s*$/u.test(s) && !OPEN_QUESTION.test(s)));
}

/** Pytanie o to, czy redakcja lub instytucja coś sprawdzała ("Czy X sprawdzał, czy ...?", "Czy X to sprawdzał?"). */
export function isReviewQuestion(text: string): boolean {
  const t = text.trim();
  return REVIEW_QUESTION.test(t) || REVIEW_ONLY.test(t);
}
