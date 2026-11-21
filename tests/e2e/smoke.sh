#!/usr/bin/env bash
# Test dymny całości: build -> ingest (do bazy tymczasowej) -> start (mock) -> curl -> stop.
# Nie czyta .env z wartościami kluczy (LLM_PROVIDER=mock wymuszone w środowisku, ma pierwszeństwo).
# Użycie: bash tests/e2e/smoke.sh   (opcjonalnie SMOKE_PORT=8799, SKIP_BUILD=1)
set -euo pipefail

cd "$(dirname "$0")/../.."
PORT="${SMOKE_PORT:-8799}"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/mylik-smoke.XXXXXX")"
DB="$TMP/smoke.sqlite"
LOG="$TMP/server.log"
PID=""

cleanup() {
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT

fail() {
  echo "SMOKE: BŁĄD: $*" >&2
  [ -f "$LOG" ] && { echo "--- log serwera ---" >&2; cat "$LOG" >&2; }
  exit 1
}

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "SMOKE: npm run build"
  npm run build >/dev/null || fail "build"
fi

echo "SMOKE: npm run corpus:ingest (baza tymczasowa)"
npm run corpus:ingest -- --db "$DB" || fail "ingest"

echo "SMOKE: start serwera (mock) na porcie $PORT"
LLM_PROVIDER=mock DB_PATH="$DB" PORT="$PORT" node --import tsx src/main.ts >"$LOG" 2>&1 &
PID=$!

for _ in $(seq 1 50); do
  curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1 && break
  kill -0 "$PID" 2>/dev/null || fail "serwer zakończył się przed startem"
  sleep 0.2
done

HEALTH="$(curl -sf "http://localhost:$PORT/api/health")" || fail "/api/health"
echo "SMOKE: health $HEALTH"
node -e '
const h = JSON.parse(process.argv[1]);
if (h.ok !== true) throw new Error("ok != true");
if (h.provider !== "mock") throw new Error("provider != mock");
if (!(h.documents >= 12)) throw new Error("documents < 12");
' "$HEALTH" || fail "health niepoprawny"

OUT="$(curl -sf -X POST "http://localhost:$PORT/api/verify" -H 'content-type: application/json' \
  -d '{"text":"Obywatele Unii Europejskiej mogą podróżować w strefie Schengen bez kontroli granicznych."}')" || fail "/api/verify"
node -e '
const o = JSON.parse(process.argv[1]);
if (o.kind === "record") { if (!Array.isArray(o.record.claims) || !/^[0-9a-f]{64}$/.test(o.record.id)) throw new Error("rekord niepoprawny"); }
else if (o.kind === "state") { if (!o.state || !o.message) throw new Error("stan niepoprawny"); }
else throw new Error("nieznany kind");
console.log("SMOKE: verify kind=" + o.kind + (o.kind === "record" ? " werdykty=" + o.record.claims.map(c => c.verdict).join(",") : " stan=" + o.state));
' "$OUT" || fail "VerifyOutcome niepoprawny"

STATUS="$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://localhost:$PORT/api/verify" -H 'content-type: application/json' -d '{}')"
[ "$STATUS" = "400" ] || fail "puste body: oczekiwano 400, jest $STATUS"

N="$(curl -s "http://localhost:$PORT/" | grep -c 'lang="pl"' || true)"
[ "$N" = "1" ] || fail "strona główna bez lang=\"pl\" ($N)"

N2="$(curl -s "http://localhost:$PORT/zrodla" | grep -c 'lang="pl"' || true)"
[ "$N2" = "1" ] || fail "fallback SPA nie działa"

kill "$PID"
wait "$PID" 2>/dev/null || true
PID=""
echo "SMOKE: OK"
