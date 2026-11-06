#!/bin/sh
# Runs before nginx starts (the official nginx image executes everything in /docker-entrypoint.d).
#
# Publishes REACT_APP_CLUSTER_THEME to the app as /config.js, so the colour can still be chosen
# when the container starts: docker run -e REACT_APP_CLUSTER_THEME=blue ...
#
# The value ends up inside a JavaScript string, so only letters are accepted. Anything else
# (spaces, quotes, backslashes, newlines, ...) becomes "", which the app reads as "use the default".
# Unknown names such as "orange" are passed on; the app falls back to its default for those.
set -eu

case "${REACT_APP_CLUSTER_THEME:-}" in
  *[!A-Za-z]*) theme='' ;;
  *) theme="${REACT_APP_CLUSTER_THEME:-}" ;;
esac

printf 'window.__CLUSTER_CONFIG__ = { theme: "%s" };\n' "$theme" > /usr/share/nginx/html/config.js
