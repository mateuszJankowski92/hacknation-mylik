import type { State, StrengthLevel, StrengthReasonCode, Verdict } from '../contracts/verdict';

export const VERDICT_EXPLANATIONS_PL: Record<Verdict, string> = {
	potwierdzone: 'Sprawdzone źródła mówią to samo i żadne temu nie przeczy.',
	falszywe: 'Sprawdzone źródła mówią co innego niż to twierdzenie.',
	wprowadzajace_w_blad: 'Źródło opisuje to samo, ale w innych okolicznościach niż w tej wiadomości.',
	brak_wystarczajacych_dowodow: 'Nie znalazłem tego w sprawdzonych źródłach. Nie wiem, czy to prawda.',
	nie_podlega_weryfikacji: 'To opinia albo przewidywanie, więc nie sprawdzam jej w źródłach.',
};

export const STRENGTH_TITLE_PL = 'Na ile to pewne';

export const EVIDENCE_LINK_TEXT = 'Zobacz, skąd to wiem';

export const STRENGTH_PLAIN_PL: Record<StrengthLevel, string> = {
	wysoka: 'dużo',
	srednia: 'średnio',
	niska: 'mało',
	brak: 'wcale',
};

export const REASON_PLAIN_PL: Record<StrengthReasonCode, string> = {
	zrodlo_urzedowe: 'urzędowe źródło',
	kilka_niezaleznych_zrodel: 'kilka niezależnych źródeł',
	jedno_zrodlo: 'tylko jedno źródło',
	zrodlo_archiwalne: 'stare źródło',
	sprzeczne_zrodla: 'źródła mówią co innego',
	slabe_dopasowanie: 'źródła słabo pasują do twierdzenia',
	brak_dowodow: 'brak informacji w sprawdzonych źródłach',
};

export const STATE_MESSAGES_PL: Record<State, string> = {
	awaria_techniczna:
		'Coś poszło nie tak po naszej stronie. Nie sprawdziłem Twojego zgłoszenia. Spróbuj jeszcze raz za kilka minut.',
	brak_mozliwosci_sprawdzenia:
		'Nie mogę tego sprawdzić w moich źródłach. Nie wystawiłem oceny. Zajrzyj na stronę właściwego urzędu.',
	potrzeba_doprecyzowania:
		'Nie widzę w zgłoszeniu nic konkretnego do sprawdzenia. Napisz, co się stało, kogo dotyczy, gdzie i kiedy.',
};
