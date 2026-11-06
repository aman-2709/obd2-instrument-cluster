#!/usr/bin/env bash
# Smoke test for docker-compose.prod.yml: starts the real file and checks that the stack comes up
# the way it does on a Raspberry Pi, with no OBD adapter plugged in.
#
#   OBD_VERSION=3.1.0 scripts/prod-compose-smoke.sh
#   OBD_VERSION=ci scripts/prod-compose-smoke.sh path/to/other-compose.yml
#
# It never pulls. The images the compose file names for OBD_VERSION must already exist locally, so
# CI tests images built from the branch, and a throwaway Docker daemon can test published ones.
# The compose file has fixed container names and publishes ports 3000 and 8000, so run this on a
# clean daemon (a CI runner, or Docker-in-Docker), never next to your dev stack.
# Needs docker with the compose plugin, curl and bash.
set -uo pipefail

file=${1:-docker-compose.prod.yml}
version=${OBD_VERSION:?set OBD_VERSION to the tag of the local images, for example OBD_VERSION=ci}

# shellcheck source-path=SCRIPTDIR source=lib/smoke.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib/smoke.sh"

compose() { docker compose -f "$file" "$@"; }
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
health() { # container -> healthy | unhealthy | starting | none (no healthcheck) | missing
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$1" 2>/dev/null || echo missing
}
wait_healthy() { # container seconds -> its last health state
  local state=missing
  for _ in $(seq 1 "$2"); do
    state=$(health "$1")
    [ "$state" = "healthy" ] && break
    sleep 1
  done
  echo "$state"
}

teardown() { compose down -v --remove-orphans >/dev/null 2>&1; }
trap teardown EXIT

echo "== configuration"
# env -u: whatever the caller exported, this check must see OBD_VERSION unset.
if message=$(env -u OBD_VERSION docker compose -f "$file" config -q 2>&1); then
  bad "refuses to run without OBD_VERSION" "docker compose config succeeded without it"
else
  ok "refuses to run without OBD_VERSION"
  expect_contains "and the error says what to set" "OBD_VERSION" "$message"
fi
if message=$(compose config -q 2>&1); then
  ok "the file is valid with OBD_VERSION=$version"
else
  bad "the file is valid with OBD_VERSION=$version" "$message"
fi

missing_image=0
for image in $(compose config --images 2>/dev/null); do
  if docker image inspect "$image" >/dev/null 2>&1; then
    ok "image $image exists locally"
  else
    bad "image $image exists locally" "build or tag it first: this script never pulls"
    missing_image=1
  fi
done
if [ "$missing_image" -ne 0 ]; then smoke_finish; exit; fi

echo "== bring-up (no OBD adapter attached)"
if message=$(compose up -d --pull never 2>&1); then
  ok "docker compose up -d succeeds"
else
  bad "docker compose up -d succeeds" "$message"
fi
expect_eq "backend becomes healthy" "healthy" "$(wait_healthy obd_backend 60)"
expect_eq "frontend becomes healthy" "healthy" "$(wait_healthy react_frontend 60)"

echo "== what a browser and the Pi see"
expect_eq "frontend answers on :3000" "200" "$(status http://127.0.0.1:3000/)"
expect_contains "frontend serves its runtime config" "__CLUSTER_CONFIG__" "$(curl -fs http://127.0.0.1:3000/config.js)"
if (exec 3<>/dev/tcp/127.0.0.1/8000) 2>/dev/null; then
  ok "backend accepts connections on :8000"
else
  bad "backend accepts connections on :8000" "connection refused"
fi

echo "== failure and recovery"
docker stop obd_backend >/dev/null 2>&1
expect_eq "frontend keeps serving while the backend is down" "200" "$(status http://127.0.0.1:3000/)"
docker start obd_backend >/dev/null 2>&1
expect_eq "backend is healthy again after a restart" "healthy" "$(wait_healthy obd_backend 60)"

smoke_finish
