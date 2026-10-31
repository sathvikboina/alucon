#!/usr/bin/env bash
#
# AlumniConnect — one-command local launcher.
#
#   ./run.sh                 start Mongo (if needed), API and client
#   ./run.sh --seed          reseed demo data, then start
#   ./run.sh --no-seed       never seed, even on a fresh database
#   ./run.sh --install       force npm install for server and client
#   ./run.sh --open          open the app in a browser after startup
#
# The API listens on :5001 and the React dev server on :3000. Both logs are
# written to .run/ so a crash is easy to inspect without losing the terminal.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/.run"
API_LOG="$LOG_DIR/server.log"
CLIENT_LOG="$LOG_DIR/client.log"

API_PORT="${PORT:-5001}"
CLIENT_PORT=3000
MONGO_PORT=27017
MONGO_CONTAINER="${MONGO_CONTAINER:-alumni-mongo}"
DEFAULT_MONGO_URI="mongodb://127.0.0.1:${MONGO_PORT}/alumniconnect"

SEED_MODE="auto"   # auto | always | never
FORCE_INSTALL=0
OPEN_BROWSER=0

usage() {
  sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
}

for arg in "$@"; do
  case "$arg" in
    --seed) SEED_MODE="always" ;;
    --no-seed) SEED_MODE="never" ;;
    --install) FORCE_INSTALL=1 ;;
    --open) OPEN_BROWSER=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 1 ;;
  esac
done

say() { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

port_open() {
  local port="$1"
  (exec 3<>"/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1
}

wait_for_port() {
  local port="$1" label="$2" tries="${3:-60}"
  for _ in $(seq 1 "$tries"); do
    if port_open "$port"; then return 0; fi
    sleep 1
  done
  return 1
}

command -v node >/dev/null 2>&1 || die "Node.js is required (v18+). Install it and retry."
command -v npm >/dev/null 2>&1 || die "npm is required. Install it and retry."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  die "Node.js $(node -v) is too old. Use Node 18 or newer."
fi

# ---------------------------------------------------------------- MongoDB ---
say "Checking MongoDB on 127.0.0.1:${MONGO_PORT}"
if ! port_open "$MONGO_PORT"; then
  if command -v docker >/dev/null 2>&1; then
    if docker ps -a --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
      say "Starting existing Docker container '${MONGO_CONTAINER}'"
      docker start "$MONGO_CONTAINER" >/dev/null
    else
      say "Creating Docker container '${MONGO_CONTAINER}' (mongo:6)"
      docker run -d --name "$MONGO_CONTAINER" -p "${MONGO_PORT}:27017" mongo:6 >/dev/null
    fi
    wait_for_port "$MONGO_PORT" "MongoDB" 45 \
      || die "MongoDB did not start. Check 'docker logs ${MONGO_CONTAINER}'."
  else
    die "MongoDB is not listening on :${MONGO_PORT} and Docker is unavailable.
Start MongoDB yourself, then rerun ./run.sh."
  fi
fi
say "MongoDB is reachable"

# ------------------------------------------------------------ environment ---
# server/.env ships with a placeholder URI, so fall back to local Mongo when it
# has not been configured. An explicit MONGO_URI in the shell always wins.
if [ -z "${MONGO_URI:-}" ]; then
  ENV_URI="$(grep -E '^MONGO_URI=' server/.env 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [ -z "$ENV_URI" ] || [[ "$ENV_URI" == *"your_mongodb_uri"* ]]; then
    export MONGO_URI="$DEFAULT_MONGO_URI"
  else
    export MONGO_URI="$ENV_URI"
  fi
fi
export PORT="$API_PORT"

if [ ! -f client/.env ]; then
  printf 'REACT_APP_BACKEND_URL=http://localhost:%s\n' "$API_PORT" > client/.env
  say "Created client/.env pointing at the local API"
fi

# ----------------------------------------------------------- dependencies ---
if [ "$FORCE_INSTALL" -eq 1 ] || [ ! -d server/node_modules ]; then
  say "Installing server dependencies"
  npm --prefix server install
fi
if [ "$FORCE_INSTALL" -eq 1 ] || [ ! -d client/node_modules ]; then
  say "Installing client dependencies"
  npm --prefix client install
fi

# ------------------------------------------------------------------ seed ----
if [ "$SEED_MODE" != "never" ]; then
  USER_COUNT="$(
    cd server && MONGO_URI="$MONGO_URI" node -e '
      const mongoose = require("mongoose");
      mongoose.connect(process.env.MONGO_URI)
        .then(async () => {
          const count = await mongoose.connection.db.collection("users").countDocuments();
          console.log(count);
          await mongoose.disconnect();
        })
        .catch(() => { console.log(-1); process.exit(0); });
    ' 2>/dev/null | tail -1
  )"
  if [ "$SEED_MODE" = "always" ] || [ "${USER_COUNT:-0}" = "0" ]; then
    say "Seeding demo users, posts, jobs, events and groups"
    (cd server && MONGO_URI="$MONGO_URI" npm run seed)
  else
    say "Database already has ${USER_COUNT} users — skipping seed (use --seed to refresh)"
  fi
fi

# ------------------------------------------------------------- port checks --
if port_open "$API_PORT"; then
  die "Port ${API_PORT} is already in use. Stop the existing API or set PORT to another value."
fi
if port_open "$CLIENT_PORT"; then
  die "Port ${CLIENT_PORT} is already in use. Stop the existing React dev server first."
fi

# ------------------------------------------------------------------ start ---
mkdir -p "$LOG_DIR"
: > "$API_LOG"
: > "$CLIENT_LOG"

SERVER_PID=""
CLIENT_PID=""
HAVE_SETSID=0
if command -v setsid >/dev/null 2>&1; then
  HAVE_SETSID=1
fi

# Each service runs in its own session/process group when setsid is available,
# so stopping the launcher also stops npm and the node child it spawned.
kill_tree() {
  local pid="$1"
  [ -z "$pid" ] && return 0
  local children
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  for child in $children; do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

stop_service() {
  local pid="$1" sig="${2:-TERM}"
  [ -z "$pid" ] && return 0
  if [ "$HAVE_SETSID" -eq 1 ]; then
    kill "-${sig}" "-${pid}" 2>/dev/null || true
  elif [ "$sig" = "TERM" ]; then
    kill_tree "$pid"
  else
    kill "-${sig}" "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  local code=$?
  trap - INT TERM EXIT
  stop_service "$CLIENT_PID" TERM
  stop_service "$SERVER_PID" TERM
  sleep 1
  stop_service "$CLIENT_PID" KILL
  stop_service "$SERVER_PID" KILL
  wait 2>/dev/null || true
  printf '\n\033[1;34m▸ Stopped AlumniConnect.\033[0m\n'
  exit "$code"
}
trap cleanup INT TERM EXIT

say "Starting API on http://localhost:${API_PORT}"
if [ "$HAVE_SETSID" -eq 1 ]; then
  setsid bash -c 'cd "$1" && exec npm start' _ "$ROOT/server" \
    >"$API_LOG" 2>&1 &
else
  (
    cd server
    MONGO_URI="$MONGO_URI" PORT="$API_PORT" npm start
  ) >"$API_LOG" 2>&1 &
fi
SERVER_PID=$!

say "Starting React dev server on http://localhost:${CLIENT_PORT}"
if [ "$HAVE_SETSID" -eq 1 ]; then
  setsid env \
    BROWSER=none \
    PORT="$CLIENT_PORT" \
    REACT_APP_BACKEND_URL="http://localhost:${API_PORT}" \
    bash -c 'cd "$1" && exec npm start' _ "$ROOT/client" \
    >"$CLIENT_LOG" 2>&1 &
else
  (
    cd client
    BROWSER=none \
    PORT="$CLIENT_PORT" \
    REACT_APP_BACKEND_URL="http://localhost:${API_PORT}" \
    npm start
  ) >"$CLIENT_LOG" 2>&1 &
fi
CLIENT_PID=$!

if ! wait_for_port "$API_PORT" "API" 60; then
  warn "API did not open :${API_PORT}. Last log lines:"
  tail -n 30 "$API_LOG" || true
  die "Startup failed. See ${API_LOG}."
fi
if ! wait_for_port "$CLIENT_PORT" "React" 120; then
  warn "React dev server did not open :${CLIENT_PORT}. Last log lines:"
  tail -n 30 "$CLIENT_LOG" || true
  die "Startup failed. See ${CLIENT_LOG}."
fi

cat <<EOF

  AlumniConnect is running

  App        http://localhost:${CLIENT_PORT}
  API        http://localhost:${API_PORT}
  MongoDB    ${MONGO_URI}
  API log    ${API_LOG}
  Client log ${CLIENT_LOG}

  Demo login sathvik.boina@iiita.ac.in / alumni123#
  Admin      iiita.alumniconnect@gmail.com / alumni123#

  Press Ctrl+C to stop both processes.

EOF

if [ "$OPEN_BROWSER" -eq 1 ]; then
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:${CLIENT_PORT}" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "http://localhost:${CLIENT_PORT}" >/dev/null 2>&1 || true
  fi
fi

# Wait for either process to exit, then let the trap stop the other one.
wait -n "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || wait "$SERVER_PID" "$CLIENT_PID"
