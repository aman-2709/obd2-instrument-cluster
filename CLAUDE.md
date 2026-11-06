# OBD2 Instrument Cluster

A .NET 8 backend (ELM327 over a serial port, WebSocket on `/ws`) and a React + TypeScript cluster UI, shipped as container images. Start with `README.md`. The architecture, the WebSocket message contract and the coding conventions are in `.github/copilot-instructions.md`.

## Releasing

- A release is a git tag `vX.Y.Z`; pushing it makes the release workflow publish the images. Tag and release only after an explicit OK: published image tags cannot be taken back.
- The examples pin the current version as `OBD_VERSION=3.1.0`. Bump them at each release; `git grep '3\.1\.0'` finds them (`README.md`, `QUICKSTART.md`, `.github/copilot-instructions.md`, `docker-compose.prod.yml` including its error message, `deploy-pi.sh`, `scripts/prod-compose-smoke.sh`). Add a row to the versions table in `README.md`.

## Working in this repo

- Line endings: `README.md`, `QUICKSTART.md` and `docker-compose*.yml` are CRLF. `.github/workflows/ci.yml` is mixed (six LF-only lines), and the Edit tool rewrites the whole file as CRLF: change it at byte level and check that `git diff` shows no line you did not mean to touch. New files are LF.
- There is no local `node_modules`. Run the frontend tests in the dev container: `docker exec -e CI=true react_frontend npx react-scripts test --watchAll=false`.
- The dev stack (`react_frontend`, `obd_backend`, `elm327Emulator`) may be running on the machine; do not stop it. Anything that needs those container names or ports 3000 and 8000, for example `scripts/prod-compose-smoke.sh`, runs in an isolated Docker-in-Docker daemon: `docker run -d --privileged -e DOCKER_TLS_CERTDIR= docker:dind`.
- When comparing screenshots of the production image with the dev server, allow a tolerance: the production CSS minifier rewrites colour spellings (`transparent` becomes `#0000`), which changes about 12,000 pixels of a 1920x720 frame by at most 11/255.

## Pull requests

- Merge with a merge commit, delete the branch, then verify CI on `main`.
- `gh pr edit` and `gh pr merge` fail here (GraphQL, Projects classic). Use the REST API: `gh api -X PATCH repos/aman-2709/obd2-instrument-cluster/pulls/N -F body=@file` and `gh api -X PUT repos/aman-2709/obd2-instrument-cluster/pulls/N/merge -f merge_method=merge`. Pass `--repo aman-2709/obd2-instrument-cluster` right after a push, because the new branch takes a moment to show up.
- Research notes about target hardware or a specific board stay outside the repo: never in tracked files, commit messages or PR text. Grep the diff, the commit messages and the PR body for your own list of terms before pushing; the terms are not listed here on purpose.
