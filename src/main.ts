// Punkt wejścia serwera: jeden proces, jeden port (PORT; Passenger nadaje go sam).
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { redactedConfig } from './config';
import { PROJECT_ROOT, bootstrap } from './server/bootstrap';

// Sekrety tylko z .env (zmienne już ustawione w środowisku mają pierwszeństwo).
for (const p of [join(PROJECT_ROOT, '.env'), '.env']) {
  try {
    process.loadEnvFile(p);
    break;
  } catch {
    // brak pliku .env: zmienne środowiskowe i wartości domyślne
  }
}

const app = bootstrap();
console.log('MYLIK: konfiguracja', JSON.stringify(redactedConfig(app.config)));
console.log(`MYLIK: dostawca modelu ${app.providerName} (${app.modelName})`);

const server = serve({ fetch: app.app.fetch, port: app.config.port }, (info) => {
  console.log(`MYLIK: serwer nasłuchuje na porcie ${info.port}`);
});

let closing = false;
function shutdown(signal: string): void {
  if (closing) return;
  closing = true;
  console.log(`MYLIK: zatrzymywanie (${signal})`);
  server.close(() => {
    app.close();
    process.exit(0);
  });
  setTimeout(() => {
    app.close();
    process.exit(0);
  }, 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
