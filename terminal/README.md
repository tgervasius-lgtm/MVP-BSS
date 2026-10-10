# BSS terminal — laptop bench

This is the #245 software preparation for #132. It uses real signed HTTP requests to a
disposable BSS backend and PostgreSQL database. All people, cards and secrets are synthetic.
The terminal panel is 800x480; simulator controls are below it. No GPIO/reader is connected.

## Requirements

- Python 3.11+ with SQLite; Node/npm matching root/backend `package.json`.
- Explicit **disposable local PostgreSQL** with a fixture account permitted to create
  databases/roles. Never point `BSS_TEST_DATABASE_URL` at production or customer data.
- Locked frontend/backend npm dependencies. No pip dependencies.

Check `python3 --version` (Windows: `py -3 --version`) and
`python3 -c "import sqlite3; print(sqlite3.sqlite_version)"` before starting.
From repository root, install the checked-in dependencies and build the frontend:

```sh
npm ci --ignore-scripts
npm --prefix backend ci --ignore-scripts
npm --prefix backend rebuild esbuild --foreground-scripts
npm run build
```

## Start a real local bench

Set `BSS_TEST_DATABASE_URL` to the explicitly chosen disposable PostgreSQL instance.
Use a local private environment variable; never paste the value into an issue or commit.
Then, from repository root:

```sh
cd backend
node --import tsx scripts/terminal-bench.ts
```

The launcher creates its own uniquely named temporary database and a runtime role with
the checked-in grants, seeds two workers/cards, pairs one terminal through the existing
service and starts Fastify at `http://127.0.0.1:4180`. It prints the private session path
and the exact command for a **second shell at repository root**:

```sh
python3 -m terminal --session "bss-terminal-bench-SESSION_ID"
```

On Windows replace `python3` with `py -3`. Open `http://127.0.0.1:8765`.
Keep the backend shell running while restarting the Python process to test queue recovery.
The bench admin credentials are in `PRIVATE_SESSION/admin-login.json`; use them only at
the local BSS page (`http://127.0.0.1:4180`) to inspect attendance and terminal history.
Do not share this file, config, state directory, or screenshots containing credentials.

Use the exact session name printed by the launcher. The CLI accepts only its private
`bss-terminal-bench-*` session directly under the local user temp directory, with fixed
`config.json` and `state` names; arbitrary paths and symbolic links are rejected.
POSIX config permissions must be 0600 and session/queue directories 0700. The program sets a
private umask. On Windows keep the fixture in your private local user temp directory;
Windows ACL qualification is still required before any real employee/device data.

## Manual acceptance

1. Enable **Simuliraj pouzdan sat testnog uređaja**. Select worker and Dolazak, then
   **Prisloni testnu karticu**. Local storage confirmation precedes background sync.
2. Select Odlazak and tap. Inspect both events and the worker's attendance in BSS.
3. Disable synchronization; capture another worker's event. Queue depth increases.
   Stop/restart only Python with the same session name; pending evidence remains.
4. Re-enable synchronization and allow retry backoff (at most about 61 seconds).
   No extra attendance is created when the same event is resent after a lost response.
   The automated PostgreSQL probe explicitly tests that response-loss boundary.
5. Disable the simulated trusted clock and capture a different action. BSS must show
   `reconciliation_required`; a local stored message does not mean attendance approval.
6. If storage fails or the clock moves backwards during capture, do not infer success.
   Inspect the retained `interrupted` count before making another attendance attempt.

The simulator's network switch pauses new sends; a request already in flight can finish.
It does not emulate Ethernet RF, DHCP, DNS, packet loss or physical link switching.
The browser clock is display-only. Event times come from Python; real trusted-time
qualification remains open. Current OpenAPI supports check-in/check-out only; no new
break-event type or local attendance/payroll calculation is introduced.

## Automated checks

```sh
python3 -m unittest discover -s terminal/tests -p 'test_*.py' -v
npm --prefix backend run lint
npm --prefix backend run test:unit
npm --prefix backend run test:integration
npx playwright test --config=terminal/playwright.config.cjs --reporter=line
```

PostgreSQL tests require `BSS_TEST_DATABASE_URL`; set `BSS_REQUIRE_POSTGRES_TESTS=true`
when evidence is mandatory. Missing PostgreSQL is UNAVAILABLE, not PASS.
For Node-launched Python on Windows set `BSS_PYTHON` to the **Python executable path**
(not a command string such as `py -3`). The standalone UI fixture used by Playwright
is intentionally separate from real backend integration; its API is unavailable.

## Stop/recover and next physical step

Stop Python before the backend. Ctrl+C in the backend shell removes only that launcher's
owned temporary database/role. Local evidence/config remains in the private temp session;
it is disposable synthetic test data and not a permanent backup. A new backend session
pairs a new terminal with a new queue. Do not reuse an old config against a new fixture.
Never erase a pending queue to make synchronization appear healthy.

For Pi preparation install the approved OS/Python/SQLite and copy this reviewed code.
The core can run without a reader, but this slice accepts only loopback test provisioning.
Before actual end-to-end hardware use, complete RC522/SPI and feedback adapters, managed
device provisioning, test API connectivity, clock health, private persistent storage,
kiosk/autostart/watchdog and a reviewed service configuration. Physical power-loss,
read range, touch, thermal and 9C evidence are not supplied by laptop tests.

Owner update, 2026-10-04: all accepted P0 components have arrived according to Tomislav.
This supersedes the missing Pi/PSU/RTC entries in the 2026-08-31 handoff. Receipt is
owner-reported; assembly, incoming inspection and measurements remain unverified.
