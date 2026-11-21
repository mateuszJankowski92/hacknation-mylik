# Koszt prawdziwego kanału SMS

Stan na 21.11.2026. Prototyp ma tylko symulator (GET /sms) i punkt POST /sms/webhook, bez operatora. Poniższe liczby to rząd wielkości, nie oferta; trzeba je potwierdzić u wybranej bramki SMS.

- Odbiór SMS: numer lub krótki kod od bramki SMS, opłata miesięczna rzędu kilkudziesięciu złotych (numer długi) do kilkuset złotych (krótki kod) oraz opłata za każdy odebrany SMS.
- Wysyłka odpowiedzi: zwykle kilka do kilkunastu groszy za SMS. Odpowiedź (shortAnswer) ma do 320 znaków, więc przy polskich znakach (kodowanie UCS-2, 70 znaków na część) to do 5 części, czyli wielokrotność ceny jednego SMS-a.
- Wniosek: skracać odpowiedź lub unikać polskich znaków zwiększa koszt wolniej, ale obniża czytelność; do decyzji produktowej.
- Koszt modelu: ten sam rekord i klucz co w WWW, więc powtórzone zgłoszenie nie kosztuje drugi raz (odpowiedź z pamięci podręcznej).
- Ochrona przed nadużyciem: limit długości wejścia (480 znaków), limit zgłoszeń na numer i budżet dzienny wymagają wdrożenia przy prawdziwej integracji.
- Prywatność: numer nadawcy nie jest zapisywany ani przekazywany do silnika; treść jest maskowana (PII) w silniku tak samo jak w WWW.
