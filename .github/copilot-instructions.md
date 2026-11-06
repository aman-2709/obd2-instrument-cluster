# Copilot Instructions for OBD2 Instrument Cluster

## Project Overview

This repository contains a real-time OBD2 vehicle dashboard application with:

- Backend: .NET 8 ASP.NET Core app in `backend/` that communicates with an ELM327 device and exposes a WebSocket endpoint.
- Frontend: React + TypeScript app in `frontend/` that renders the Mustang-style dashboard UI.
- Deployment assets: Docker and Docker Compose files at repo root, plus Raspberry Pi deployment docs/scripts.
- Emulator tooling: Python-based OBD emulator utilities in `emulator/`.

## Repository Structure

- `backend/`
- `backend/src/Program.cs`: app startup, WebSocket endpoint, OBD connection lifecycle.
- `backend/src/Services/`: OBD query logic and WebSocket helpers.
- `backend/src/Commands/`: AT command definitions and parsing helpers.
- `backend/src/Communication/`: ELM327 serial command sequencing and timeout logic.
- `backend/src/Configuration/`: OBD mode/PID configuration and parser wiring.
- `frontend/`
- `frontend/src/components/`: dashboard and gauge UI components.
- `frontend/src/hooks/useWebSocket.ts`: WebSocket connection and client data flow.
- `frontend/src/types/`: shared frontend TypeScript types.
- `frontend/Dockerfile`: two targets from one install step. `dev` is the Create React App dev server with hot reload (what `docker-compose.yml` builds). `prod` is the production build served by nginx; it is the last stage, so a plain `docker build` (release and deploy workflows) produces it.
- `frontend/nginx.conf`, `frontend/docker-entrypoint.d/`: nginx config and the start-up script of the production image. The script writes `/config.js` from `REACT_APP_CLUSTER_THEME` when the container starts (letters only; anything else means the default theme). `frontend/public/config.js` is the default that `npm start` serves.
- `emulator/`: local emulator scripts for development without a vehicle.
- `scripts/`, `frontend/scripts/`: smoke tests that start real containers (`prod-compose-smoke.sh`, `image-smoke.sh`, shared helpers in `scripts/lib/smoke.sh`). CI runs both; the usage is in each script's header.
- `docs/`: deployment and operations documentation.

## WebSocket Message Contract

Every message from the backend to the frontend is a JSON object. All PID values are **strings** (never numbers).

| Field | Always present | Example value | Notes |
|---|---|---|---|
| `timestamp` | Yes | `"2024-01-01T12:00:00Z"` | ISO 8601 UTC |
| `SpeedUnit` | Yes | `"km/h"` or `"mph"` | Read by frontend to choose display unit |
| `RPM` | When enabled | `"3200"` | PIDs off by default: EngineLoad, IntakeTemp, MAF |
| `Speed` | When enabled | `"85"` | |
| `Throttle` | When enabled | `"45.1"` | |
| `CoolantTemp` | When enabled | `"90"` | Frontend also accepts `'Coolant Temp'` (legacy key) |

Enabled PIDs are controlled via `IsEnabled` in `backend/src/Configuration/ObdPidConfiguration.cs`. Backend never reads WebSocket messages from the client (send-only).

## Coding Conventions

### Backend (C# / .NET)

- Target framework is `net8.0`.
- Use clear separation by responsibility:
- Protocol/AT logic in `Commands` and `Communication`.
- PID/configuration mapping in `Configuration`.
- Runtime business logic in `Services`.
- Follow existing C# naming patterns:
- `PascalCase` for public types/methods/properties.
- Private fields with leading underscore (example: `_atCommandManager`).
- Keep methods focused and defensive around serial I/O and parsing.
- Preserve current JSON contract keys consumed by frontend (for example `SpeedUnit` and PID names).
- Prefer non-blocking patterns where practical, but respect existing serial-port locking/throttling behavior.

#### Serial Port / Timing Constraints

Violating these will cause intermittent OBD failures:
- All serial I/O must be wrapped in `lock (_serialLock)` (static lock in `AtCommandManager`).
- Minimum 100 ms between commands — enforced by `EnsureCommandInterval()` in `AtCommandManager`.
- OBD query timeout: 500 ms. AT command timeout: 1000 ms.
- Response is complete when the `>` prompt character is received (not fixed byte count).
- WebSocket init uses `_initializationLock` (in `Program.cs`) so only one client triggers serial setup.

### Frontend (React + TypeScript)

- Use function components and hooks (no class components).
- Keep types explicit for component props and hook returns.
- Place reusable UI in `components/`, connection/state logic in `hooks/`, and shared type contracts in `types/`.
- Match existing naming and casing conventions:
- Components/files in `PascalCase`.
- Hooks in `camelCase` with `use` prefix.
- Keep dashboard behavior compatible with backend payload shape.

## Test Framework and Testing Guidance

- Frontend tests use Jest via Create React App (`react-scripts test`) with React Testing Library:
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- Existing test setup files include `frontend/src/App.test.tsx` and `frontend/src/setupTests.ts`.
- Backend currently has no dedicated separate test project; CI runs `dotnet test` against `backend/ObdDashboard.csproj` as part of pipeline validation.
- When adding backend tests, prefer adding a dedicated .NET test project and keep tests deterministic (mock serial I/O where possible).

## Build and Run

### Local Backend

From repo root:

```bash
dotnet build backend/ObdDashboard.csproj
dotnet run --project backend/ObdDashboard.csproj
```

The backend listens on `http://0.0.0.0:8000` and exposes WebSocket endpoint `/ws`.

### Local Frontend

```bash
cd frontend
npm ci
npm start
```

Frontend dev server runs on `http://localhost:3000`.

### Run Tests

Frontend:

```bash
cd frontend
npm test -- --watchAll=false
```

Backend/solution validation:

```bash
dotnet test backend/ObdDashboard.csproj --configuration Release
```

### Docker Compose

From repo root, the development stack (dev server with hot reload, plus the emulator: Compose merges `docker-compose.override.yml` into `docker-compose.yml` automatically):

```bash
docker compose up --build -d
docker compose down
```

The production file runs released images and is used **on its own**. Merged with `docker-compose.yml` it would pull in the dev server and the source bind mounts. `OBD_VERSION` is required (there is no `latest` image), and every `docker compose -f docker-compose.prod.yml` command fails without it, including `ps` and `config`:

```bash
OBD_VERSION=3.1.0 docker compose -f docker-compose.prod.yml up -d
```

## Copilot Agent Guidance

- Prefer minimal, focused changes; do not refactor unrelated areas.
- Respect existing service boundaries between backend communication/config/services and frontend components/hooks/types.
- Keep compatibility with current WebSocket message schema unless explicitly asked to change it.
- If changing PID names, payload keys, or units, update both backend producers and frontend consumers in the same change.
- For emulator-related changes, document any new startup steps in `README.md` or `QUICKSTART.md`.
- For task-specific delegation, use the custom agents in `.github/agents/` and prompt templates in [.github/agents/QUICKSTART.md](.github/agents/QUICKSTART.md).

### OBD_PORT Values by Environment

| Context | Value |
|---|---|
| Local dev (emulator) | `/virtual/usb1` (default in code) |
| Raspberry Pi USB adapter | `/dev/ttyUSB0` |
| Raspberry Pi GPIO UART | `/dev/serial0` or `/dev/ttyAMA0` |

The backend reads the `OBD_PORT` environment variable, and each compose file handles it differently:

- `docker-compose.yml` hard-codes `OBD_PORT=/dev/ttyUSB0`; edit the file to change it.
- `docker-compose.override.yml` (merged in automatically by a plain `docker compose up`) sets `/virtual/usb1` for the emulator. Exporting `OBD_PORT` has no effect on either of these two files.
- `docker-compose.prod.yml` reads `OBD_PORT` from the environment and defaults to `/dev/ttyUSB0`.

The backend container is `privileged`, so it sees host devices and the compose files need no `devices:` entry.

### Known Incomplete Features

Do not build on these without first implementing the missing half:
- **Speed unit toggle**: Frontend sends `'toggle_speed_unit'` string over WebSocket, but backend never reads from the socket — it is send-only. The unit is sent with each telemetry message.
- **Health endpoint**: the backend has no `/health` route (its only route is `/ws`; `GET /` returns 404). `docker-compose.prod.yml` no longer calls one: its backend health check only confirms that port 8000 accepts connections. Do not add checks that call `/health`. `docs/raspberry-pi-deployment.md` and the `deploy-pi.yml` and `deploy-local.yml` workflows still call one.