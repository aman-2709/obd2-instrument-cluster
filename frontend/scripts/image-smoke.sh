#!/usr/bin/env bash
# Smoke test for the production frontend image: runs real containers and checks what a browser,
# the Docker healthcheck and an operator (docker run -e REACT_APP_CLUSTER_THEME=...) would see.
#
#   docker build -t obd-frontend:test frontend
#   frontend/scripts/image-smoke.sh obd-frontend:test
#
# CI runs this same script. Needs docker and curl. Containers publish to a random loopback port.
set -uo pipefail

image=${1:?usage: image-smoke.sh <image>}
pass=0
fail=0
cid=""
port=""

ok() { pass=$((pass + 1)); printf '  ok    %s\n' "$1"; }
bad() { fail=$((fail + 1)); printf '  FAIL  %s\n          %s\n' "$1" "${2:-}"; }

expect_eq() { # description expected actual
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected [$2], got [$3]"; fi
}
expect_contains() { # description needle haystack
  case "$3" in *"$2"*) ok "$1" ;; *) bad "$1" "expected to contain [$2], got [$3]" ;; esac
}

stop() {
  if [ -n "$cid" ]; then docker rm -f "$cid" >/dev/null 2>&1; fi
  cid=""
}
trap stop EXIT

# start [docker run args...]: runs a fresh container and waits until it answers on /.
start() {
  stop
  cid=$(docker run -d -p 127.0.0.1::3000 "$@" "$image") || { bad "container starts" "docker run failed"; return 1; }
  port=$(docker port "$cid" 3000/tcp | head -1 | awk -F: '{print $NF}')
  for _ in $(seq 1 50); do
    if curl -fs -o /dev/null "http://127.0.0.1:$port/"; then return 0; fi
    sleep 0.2
  done
  bad "container answers on / within 10 s" "$(docker logs "$cid" 2>&1 | tail -5)"
  return 1
}

url() { printf 'http://127.0.0.1:%s%s' "$port" "$1"; }
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
# header <name> <curl args...>: value of one response header from a GET.
header() {
  local name=$1
  shift
  curl -s -D - -o /dev/null "$@" | tr -d '\r' | awk -F': ' -v want="$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')" \
    'tolower($1) == want { print $2; exit }'
}

echo "== serving (no theme set)"
if start; then
  body=$(curl -fs "$(url /)")
  expect_contains "GET / serves the app shell" 'id="root"' "$body"
  expect_eq "GET /index.html is revalidated" "no-cache" "$(header Cache-Control "$(url /index.html)")"
  expect_eq "GET /config.js is never cached" "no-store" "$(header Cache-Control "$(url /config.js)")"
  expect_contains "GET /config.js is JavaScript" "javascript" "$(header Content-Type "$(url /config.js)")"

  bundle=$(printf '%s' "$body" | grep -o '/static/js/main\.[A-Za-z0-9]*\.js' | head -1)
  if [ -n "$bundle" ]; then
    expect_eq "the hashed bundle is served" "200" "$(status "$(url "$bundle")")"
    expect_eq "the hashed bundle is cached for a year" "public, max-age=31536000, immutable" "$(header Cache-Control "$(url "$bundle")")"
    expect_eq "the bundle is gzipped for browsers that accept it" "gzip" "$(header Content-Encoding -H 'Accept-Encoding: gzip' "$(url "$bundle")")"
  else
    bad "index.html references a /static/js/main.*.js bundle" "$body"
  fi

  expect_eq "a missing static file is a 404, not the app shell" "404" "$(status "$(url /static/js/missing.js)")"
  expect_eq "an unknown path falls back to the app shell (as the dev server does)" "200" "$(status "$(url /some/where)")"
  expect_eq "the nginx version is not advertised" "nginx" "$(header Server "$(url /)")"

  if [ "$(docker inspect --format '{{json .Config.Healthcheck}}' "$image")" = "null" ]; then
    bad "the image defines a HEALTHCHECK" "none found"
  else
    ok "the image defines a HEALTHCHECK"
    health=starting
    for _ in $(seq 1 45); do
      health=$(docker inspect --format '{{.State.Health.Status}}' "$cid")
      [ "$health" = "healthy" ] && break
      sleep 1
    done
    expect_eq "the container becomes healthy" "healthy" "$health"
  fi
fi

# theme_case <description> <expected theme in config.js> [docker run args...]
config_for() { printf 'window.__CLUSTER_CONFIG__ = { theme: "%s" };' "$1"; }
theme_case() {
  local description=$1 expected=$2
  shift 2
  if start "$@"; then
    expect_eq "$description" "$(config_for "$expected")" "$(curl -fs "$(url /config.js)")"
  fi
}

echo "== runtime theme (REACT_APP_CLUSTER_THEME)"
theme_case "unset -> empty theme (app default)" ""
theme_case "empty (what Docker Compose passes when unset) -> empty" "" -e REACT_APP_CLUSTER_THEME=
theme_case "blue" "blue" -e REACT_APP_CLUSTER_THEME=blue
theme_case "green" "green" -e REACT_APP_CLUSTER_THEME=green
theme_case "mixed case is passed on (the app lower-cases it)" "BLUE" -e REACT_APP_CLUSTER_THEME=BLUE
theme_case "an unknown name is passed on (the app falls back to its default)" "orange" -e REACT_APP_CLUSTER_THEME=orange
theme_case "a space inside is rejected" "" -e "REACT_APP_CLUSTER_THEME=bl ue"
theme_case "a trailing space is rejected" "" -e "REACT_APP_CLUSTER_THEME=blue "
theme_case "a trailing newline is rejected" "" -e $'REACT_APP_CLUSTER_THEME=blue\n'
theme_case "a script-breaking value is rejected" "" -e 'REACT_APP_CLUSTER_THEME=x";alert(1);//'
theme_case "a closing script tag is rejected" "" -e 'REACT_APP_CLUSTER_THEME=</script><script>alert(1)</script>'
# shellcheck disable=SC1003 # the value really does end in one backslash
theme_case "a backslash is rejected" "" -e 'REACT_APP_CLUSTER_THEME=blue\'
theme_case "a non-ASCII letter is rejected" "" -e 'REACT_APP_CLUSTER_THEME=bluë'

stop
echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
