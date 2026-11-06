# shellcheck shell=bash
# Shared helpers for the smoke-test scripts. Source it; do not run it.
#
# Each check prints one line and is counted. End the calling script with `smoke_finish`, which
# prints the totals and returns non-zero if any check failed.

pass=0
fail=0

ok() { pass=$((pass + 1)); printf '  ok    %s\n' "$1"; }
bad() { fail=$((fail + 1)); printf '  FAIL  %s\n          %s\n' "$1" "${2:-}"; }

expect_eq() { # description expected actual
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected [$2], got [$3]"; fi
}
expect_contains() { # description needle haystack
  case "$3" in *"$2"*) ok "$1" ;; *) bad "$1" "expected to contain [$2], got [$3]" ;; esac
}

smoke_finish() {
  echo
  echo "$pass passed, $fail failed"
  [ "$fail" -eq 0 ]
}
