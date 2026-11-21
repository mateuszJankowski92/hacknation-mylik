// Punkt wejścia serwera. Właściwy kod doda zadanie 06.
try {
  process.loadEnvFile?.();
} catch {
  // brak pliku .env: działamy na zmiennych środowiskowych i wartościach domyślnych
}

console.log('MYLIK: serwer jeszcze niepodłączony');
