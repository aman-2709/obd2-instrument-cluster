# OBD2 Instrument Cluster Agent Quickstart

Use these custom agents for focused tasks. Pick the agent that matches the work area, then paste one of the example prompts.

## Contract Guardian
Use for backend/frontend telemetry contract changes.

Example prompts:
- Update the websocket payload to include fuel level percentage and keep all frontend consumers compatible.
- We are renaming RPMUnit to EngineRpmUnit. Apply all required backend and frontend updates safely.
- Audit current payload keys versus frontend types and report any schema drift.

## OBD Protocol Engineer
Use for AT commands, PID mapping, parser logic, and ELM327 behavior.

Example prompts:
- Add support for PID 0x5E and wire parser output into the existing configuration flow.
- Fix handling for malformed ELM327 responses that include extra spacing and prompt characters.
- Review mode and PID parsing for edge cases and harden error handling.

## Backend Runtime Reliability
Use for reconnect loops, cancellation, timeouts, and backend runtime resilience.

Example prompts:
- Investigate websocket disconnect storms and implement a safe reconnect/backoff strategy.
- Add cancellation-safe shutdown behavior so serial operations do not hang app stop.
- Find and fix concurrency risks around polling and websocket broadcast paths.

## Dashboard UX and Gauge Logic
Use for frontend gauge rendering logic and responsive dashboard behavior.

Example prompts:
- Smooth RPM needle transitions without introducing lag in fast throttle changes.
- Fix mobile layout clipping in the Mustang dashboard at 390px width.
- Improve speed arc behavior at edge values while preserving existing style.

## Frontend Test Author
Use for Jest + React Testing Library coverage.

Example prompts:
- Add tests for websocket reconnect state transitions in the dashboard.
- Add regression tests for missing telemetry fields so UI degrades safely.
- Improve coverage for gauge rendering at min, max, and null values.

## Emulator and Dev Simulation
Use for emulator scripts and simulated telemetry behavior.

Example prompts:
- Make emulator output include realistic warm-up coolant behavior over time.
- Reproduce intermittent malformed frames to validate parser resilience.
- Align emulator payload cadence with backend polling expectations.

## Deployment and Edge Ops
Use for Docker, Compose, nginx, and Raspberry Pi deployment operations.

Example prompts:
- Update compose config for production health checks and safer restart policy.
- Fix nginx websocket proxy settings for stable ws upgrades.
- Review Raspberry Pi deployment steps and harden startup reliability.

## Repo Reviewer
Use for findings-first code review and pre-merge risk checks.

Example prompts:
- Review this branch against main and list high-to-low severity findings first.
- Perform a pre-merge review focused on regressions and missing tests.
- Audit changed files for schema drift and operational risk.

## Team Usage Tips
- Prefer one agent per task to keep scope clear.
- Include expected outcome and constraints in your prompt.
- Ask for explicit validation steps when changes affect runtime behavior.
