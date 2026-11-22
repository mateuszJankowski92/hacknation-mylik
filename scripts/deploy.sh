#!/usr/bin/env bash
# Wdrożenie MYLIK na hosting MyDevil (https://mylik.acwo.usermd.net). Jedno polecenie, można powtarzać:
#
#   scripts/deploy.sh                 # bramka (typecheck, test, build), budowa, wysyłka, restart, sprawdzenie
#   scripts/deploy.sh --dry-run       # to samo lokalnie + rsync -n; na serwerze nic się nie zmienia
#   scripts/deploy.sh --replace-db    # nadpisz bazę na serwerze migawką lokalną (stara idzie do data/backups/)
#   scripts/deploy.sh --skip-checks   # bez typecheck/test (build zawsze)
#   scripts/deploy.sh --no-smoke      # bez próbnego zgłoszenia (kosztuje jedno wywołanie modelu)
#
# Jak to działa:
# - Budowa lokalnie: vite (dist/web) i esbuild (serwer w jednym pliku src/_build/main.mjs; pakiety npm
#   zewnętrzne). Plik leży w src/_build, bo PROJECT_ROOT = dwa katalogi wyżej, a skrót wersji silnika
#   (fingerprint) czyta src/{engine,llm,contracts}/*.ts — te pliki też jadą na serwer.
# - Wysyłka rsync do ~/domains/<domena>/public_nodejs/. Chronione przed nadpisaniem i usunięciem:
#   .env, node_modules, public/, tmp/, data/*.sqlite*, data/backups/. Nic poza katalogiem strony.
# - Na serwerze: npm26 ci --omit=dev, potem devil www restart <domena>.
# - Baza (korpus + rekordy sprawdzeń) w data/mylik.sqlite poza public/. Wysyłana tylko, gdy na serwerze
#   jej nie ma albo z --replace-db (lokalna migawka przez VACUUM INTO, spójna mimo WAL).
# - Migawka EUvsDisinfo data/known-ops/ i data/eval/ (profil błędów) jadą zawsze.
# - .env: kopiowany plikiem (rsync, prawa 600), nigdy wypisywany. Ustawienia jawne w deploy/app.js.
# - Cel SSH (DEPLOY_SSH=login@host) bez wartości domyślnej: z deploy/.env.deploy (ignorowany przez git) lub ze środowiska.
# Zakazy: skrypt nie dotyka innych domen, DNS, poczty, baz, crona ani ustawień konta.
set -euo pipefail

DOMAIN="mylik.acwo.usermd.net"
REMOTE_DIR="domains/${DOMAIN}/public_nodejs"   # względnie od katalogu domowego
PUBLIC_URL="https://${DOMAIN}"

DRY_RUN=0; REPLACE_DB=0; SKIP_CHECKS=0; SMOKE=1
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    --replace-db) REPLACE_DB=1 ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    --no-smoke) SMOKE=0 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "Nieznana opcja: $a" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ -f deploy/.env.deploy ]; then
  set -a; . deploy/.env.deploy; set +a
fi
SSH_TARGET="${DEPLOY_SSH:-}"
[ -n "$SSH_TARGET" ] || { echo "Brak DEPLOY_SSH (login@host konta hostingu). Wpisz ją do deploy/.env.deploy albo ustaw w środowisku." >&2; exit 1; }
export PATH="$HOME/.local/bin:$PATH"
log() { printf '\n== %s\n' "$*"; }
ssh_run() { ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_TARGET" "$@"; }

[ -f .env ] || { echo "Brak .env w katalogu projektu." >&2; exit 1; }

# 1. Czysta kopia zatwierdzonego HEAD (nie bieżącego drzewa: inni mogą mieć tam niezatwierdzone zmiany)
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/mylik-deploy.XXXXXX")"
[ -n "${DEPLOY_KEEP_STAGE:-}" ] && echo "katalog przejściowy: $STAGE" || trap 'rm -rf "$STAGE"' EXIT
TREE="$STAGE/tree"
mkdir -p "$TREE" "$STAGE/app/src/_build" "$STAGE/app/data" "$STAGE/app/dist" "$STAGE/db"
REV="$(git rev-parse --short HEAD)"
log "kopia HEAD ${REV} ($(git log -1 --format=%s | cut -c1-70))"
git archive HEAD | tar -x -C "$TREE"
ln -s "$ROOT/node_modules" "$TREE/node_modules"
# Dane niewersjonowane potrzebne testom/serwerowi: migawka EUvsDisinfo i surowe strony korpusu
# (data/raw jest w .gitignore; część plików z data/sources.json istnieje tylko lokalnie).
ls data/known-ops/cases-*.json >/dev/null 2>&1 || { echo "Brak migawki data/known-ops/cases-*.json" >&2; exit 1; }
rsync -a data/known-ops/ "$TREE/data/known-ops/"
rsync -a --ignore-existing data/raw/ "$TREE/data/raw/"

# 2. Bramka i budowa (w kopii)
cd "$TREE"
if [ "$SKIP_CHECKS" = 0 ]; then
  log "typecheck"; npm run -s typecheck
  log "test"; npm test --silent
fi
log "build (web)"; npm run -s build

log "bundle serwera (esbuild)"
node_modules/.bin/esbuild src/main.ts --bundle --platform=node --format=esm --target=node22 \
  --packages=external --log-level=warning --outfile="$STAGE/app/src/_build/main.mjs"

for d in engine llm contracts; do
  rsync -a --include='*/' --exclude='*.test.ts' --include='*.ts' --exclude='*' "src/$d/" "$STAGE/app/src/$d/"
done
rsync -a dist/web "$STAGE/app/dist/"
cp package.json package-lock.json "$STAGE/app/"
cp "$ROOT/deploy/app.js" "$STAGE/app/app.js"
printf '%s\n' "$REV" > "$STAGE/app/REVISION"
rsync -a data/known-ops "$STAGE/app/data/"
[ -d data/eval ] && rsync -a data/eval "$STAGE/app/data/"
# Pliki konfiguracyjne czytane w czasie działania (bez nich warstwy wyłączają się po cichu):
# indeks weryfikacji redakcji (data/factcheck.json) i lista domen drugiej warstwy (data/live-sources.json).
for f in data/factcheck.json data/live-sources.json; do
  [ -f "$f" ] && cp "$f" "$STAGE/app/data/"
done
cd "$ROOT"

log "migawka bazy (VACUUM INTO)"
node -e '
const { DatabaseSync } = require("node:sqlite");
const [src, dst] = process.argv.slice(1);
const db = new DatabaseSync(src, { readOnly: true });
db.exec("VACUUM INTO \x27" + dst.replace(/\x27/g, "\x27\x27") + "\x27");
db.close();
const c = new DatabaseSync(dst, { readOnly: true });
const n = c.prepare("SELECT count(*) AS n FROM documents").get().n;
console.log("dokumentów w migawce:", n);
c.close();
if (!n) process.exit(1);
' "data/mylik.sqlite" "$STAGE/db/mylik.sqlite"

# 3. Wysyłka
RSYNC_FLAGS=(-az --delete
  --exclude=/.env --exclude=/node_modules/ --exclude=/public/ --exclude=/tmp/
  --exclude='/data/*.sqlite*' --exclude=/data/backups/)
[ "$DRY_RUN" = 1 ] && RSYNC_FLAGS+=(-n -i)

log "rsync aplikacji$( [ "$DRY_RUN" = 1 ] && echo ' (na sucho)' || true)"
ssh_run "test -d ${REMOTE_DIR}" || { echo "Brak katalogu strony na serwerze." >&2; exit 1; }
rsync "${RSYNC_FLAGS[@]}" "$STAGE/app/" "${SSH_TARGET}:${REMOTE_DIR}/" | { [ "$DRY_RUN" = 1 ] && tail -n 40 || cat; }

log ".env (prawa 600, bez wypisywania)"
if [ "$DRY_RUN" = 0 ]; then
  # Strumień przez stdin ssh (umask 077: plik od początku 600), podmiana atomowa; treść nie trafia na ekran.
  ssh_run "umask 077 && cat > ${REMOTE_DIR}/.env.new && chmod 600 ${REMOTE_DIR}/.env.new && mv -f ${REMOTE_DIR}/.env.new ${REMOTE_DIR}/.env && stat -f '%Sp' ${REMOTE_DIR}/.env" < .env
fi

HAS_DB="$(ssh_run "test -s ${REMOTE_DIR}/data/mylik.sqlite && echo tak || echo nie")"
log "baza na serwerze: ${HAS_DB}"
if [ "$HAS_DB" = nie ] || [ "$REPLACE_DB" = 1 ]; then
  if [ "$DRY_RUN" = 1 ]; then
    echo "(na sucho) wysłałbym migawkę bazy do ${REMOTE_DIR}/data/mylik.sqlite"
  else
    ssh_run "mkdir -p ${REMOTE_DIR}/data/backups"
    chmod 600 "$STAGE/db/mylik.sqlite"
    rsync -az "$STAGE/db/mylik.sqlite" "${SSH_TARGET}:${REMOTE_DIR}/data/mylik.sqlite.new"
    # Kopia starej bazy, podmiana atomowa; stare -wal/-shm należą do starej bazy, więc znikają.
    ssh_run "cd ${REMOTE_DIR}/data && if [ -s mylik.sqlite ]; then cp -p mylik.sqlite backups/mylik-\$(date +%Y%m%d-%H%M%S).sqlite; fi && mv -f mylik.sqlite.new mylik.sqlite && rm -f mylik.sqlite-wal mylik.sqlite-shm"
  fi
fi

if [ "$DRY_RUN" = 1 ]; then
  log "na sucho: koniec (bez npm ci, restartu i sprawdzenia)"; exit 0
fi

# 4. Zależności i restart
log "npm26 ci --omit=dev"
ssh_run "cd ${REMOTE_DIR} && npm26 ci --omit=dev --no-audit --no-fund --loglevel=error"
log "restart"
ssh_run "devil www restart ${DOMAIN}"

# 5. Sprawdzenie przez publiczny adres
log "GET /api/health"
ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 20 "${PUBLIC_URL}/api/health" -o "$STAGE/health.json"; then ok=1; break; fi
  sleep 3
done
[ "$ok" = 1 ] || { echo "Zdrowie: brak odpowiedzi." >&2; exit 1; }
cat "$STAGE/health.json"; echo

# Warstwy wyłączone po cichu to wpadka z 22.11.2026: jeśli lokalnie jest klucz indeksu weryfikacji (sprawdzamy
# tylko niepustość, bez wypisywania), a serwer zgłasza factcheck.enabled=false, wdrożenie kończy się błędem.
LOCAL_FACTCHECK_KEY=0
if [ -n "${GOOGLE_FACTCHECK_API_KEY:-}" ] || { [ -f .env ] && grep -qE '^GOOGLE_FACTCHECK_API_KEY=[[:space:]]*[^[:space:]]' .env; }; then
  LOCAL_FACTCHECK_KEY=1
fi
if [ "$LOCAL_FACTCHECK_KEY" = 1 ]; then
  node -e '
const h = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
const fc = h.factcheck;
if (!fc) { console.error("Błąd: /api/health nie zawiera pola factcheck (stara wersja aplikacji na serwerze?)."); process.exit(1); }
if (fc.enabled === false) {
  console.error("Błąd: indeks weryfikacji redakcji jest wyłączony na serwerze (powód: " + (fc.reason || "nieznany") + "), a lokalnie klucz jest ustawiony.");
  console.error("Sprawdź, czy dojechał data/factcheck.json oraz czy klucz GOOGLE_FACTCHECK_API_KEY jest w .env na serwerze.");
  process.exit(1);
}
console.log("indeks weryfikacji: włączony, wydawców: " + fc.publishers);
' "$STAGE/health.json" || exit 1
fi

if [ "$SMOKE" = 1 ]; then
  log "POST /api/verify (jedno próbne zgłoszenie)"
  curl -sS --max-time 120 -H 'content-type: application/json' \
    -d '{"text":"Od 1 stycznia 2026 roku 800 plus wypłacane jest tylko dzieciom do 10 lat.","channel":"www"}' \
    -o "$STAGE/verify.json" -w 'HTTP %{http_code}, %{time_total}s\n' "${PUBLIC_URL}/api/verify"
  node -e '
const o = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
if (o.kind === "record") {
  const r = o.record;
  console.log("wynik: rekord", r.id.slice(0, 12), "| twierdzeń:", r.claims.length, "| werdykty:", r.claims.map((c) => c.verdict).join(", "));
} else console.log("wynik:", o.kind ?? "?", o.state ?? o.code ?? "", (o.message ?? "").slice(0, 160));
' "$STAGE/verify.json"
fi
log "gotowe: ${PUBLIC_URL}"
