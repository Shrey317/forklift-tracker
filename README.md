# forklift-tracker

Production forklift fleet tracking — single warehouse, ~25 forklifts, three fixed accounts. Built against the project's full specification (v3.3), following the week-by-week plan in that document's Section 32.

## Status: Weeks 1–3 complete, Week 4 CI/CD + ops in progress

**Week 4 additions this round:**

- **Health check** (`GET /api/health`) — real, working code: confirms the app can actually query the database (`SELECT 1`), not just that a connection object exists.
- **Error monitoring seam** (`src/lib/monitoring.ts`) — Section 38 explicitly names the provider choice as a business decision this spec shouldn't invent, so this builds the integration point (structured logging today, a one-file swap to a real SDK later) and, more importantly, the sanitization contract that keeps passwords/tokens/secrets out of whatever gets captured. Tested directly, including a real bug this caught: an unserializable context value (a circular reference) was silently losing the *entire* error report, not just the bad field — fixed to fall back to reporting the error without its context instead of losing it.
- **Request correlation IDs** — `proxy.ts` now attaches `x-request-id` to every request, including API routes, so a person can report an ID and a developer can trace it through logs.
- **Security headers** (Section 41) — split across two files out of necessity, not preference: the CSP needs a fresh nonce per request (so Next.js's own hydration scripts work without weakening `script-src` to `unsafe-inline`), which a static config file can't provide — that piece lives in `proxy.ts`. Everything else (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, path-scoped `Permissions-Policy` for camera access, `X-Frame-Options`) lives in `next.config.ts`. Caught and fixed a real bug of my own before it shipped: an early draft applied `Cache-Control: private, no-store` globally, which would have also hit Next.js's own immutable static asset chunks — rescoped to actual application routes only.
- **CI/CD pipeline** (`.github/workflows/ci.yml`) and a **scheduled cleanup workflow** (`.github/workflows/scheduled-cleanup.yml`, Section 21's 90-day `LoginAttempt` retention).
- **Playwright e2e tests** (`tests/e2e/`) — login for all three roles, permission boundaries via both the UI and direct API calls, the scan-to-search fallback, and the concurrent shift-start race.
- **`OPERATIONS.md`** — deployment, migrations, rollback, backup/restore, and an explicit tracking table for every business decision Sections 38/40 refuse to invent (monitoring provider, backup retention, RPO/RTO, production region, audit-log retention, MFA).

**What's genuinely unverified, and why** — this is a meaningfully different confidence level than everything built earlier, worth being explicit about:

- **The CSP header** — Section 41 itself warns "test the deployed application against the real policy before trusting it." This is the one header that interacts with exactly how Next.js hydrates, how `qr-scanner` loads its worker, and how the app actually renders in a browser — none of which exist in this sandbox.
- **The CI/CD YAML** — reasoned through carefully against Section 37's exact requirements, but never actually run against a real GitHub repo, real secrets, or a real Vercel project.
- **The Playwright e2e tests** — there is no browser in this sandbox at all, so these were authored against Playwright's documented API and never executed even once. This is a step below everything else in this build, which was checked against something real wherever the sandbox allowed it.
- **A real interpretive call worth flagging**: the CI workflow's test job runs `db:seed` against its own disposable Postgres container, even though Section 21/37 say seeding is "never part of the automated pipeline." Read narrowly — that rule is about not letting deployment automation touch *production* credentials, not about seeding a database that's destroyed the moment the job ends, and Section 28 requires e2e tests to cover login for all three roles, which is impossible without seeded accounts. The `deploy` job never runs `db:seed`, which is where the rule is actually load-bearing.

**Not yet built**: `/admin/report` (needs PDF generation).

**Week 3 Admin UI:**

- Full `/admin/*` section — sidebar layout, dashboard (7 stat cards), forklift fleet management (list/search/create/detail/QR label/deactivate-reactivate), shift oversight (edit/delete/force-close), fuel-log oversight (edit/delete), maintenance (create/edit/delete), and the read-only audit log with expandable before/after diffs.
- `ui.shadcn.com`'s registry isn't reachable from this sandbox either (confirmed by testing — same class of limitation as Prisma's binary CDN). Built a small hand-crafted component set instead (`Button`, `Field`, `Table`, `Skeleton`, a native-`<dialog>`-based `ConfirmDialog`, a toast system) matching the same visual language and Section 25's accessibility requirements, rather than the literal shadcn/ui output. Functionally equivalent; swap for the real CLI output in any normal environment if wanted.
- Every admin list/edit action enforces its own role check server-side — the sidebar and page-level UI never being shown to a non-Admin isn't what stops them (Section 28: hiding a button is never sufficient authorization).

**Week 3 (Admin oversight & data) backend:**

- **Shift & fuel-log edit/delete** — the resolved design for editing a *historical* reading: each edit is checked bidirectionally against its own fixed position in the forklift's full reading timeline (shift starts, shift ends, and fuel logs, ordered by their own fixed timestamps), not just checked against what came before it the way a new record is. Verified against real Postgres across 6 scenarios, including the two NULL-bound edge cases (editing the very first or very last record in the timeline) and a soft-deleted record correctly dropping out of its neighbors' bounds.
- **Shift deletion correctly blocks an ACTIVE shift** (MUST NOT #22) — a soft-deleted active shift would still be occupying the forklift physically while the partial unique index stopped seeing it, silently allowing a second shift to start.
- **Maintenance CRUD** — admin-only per Locked Decision #7, no forklift-status automation (Business Rule 6).
- **Dashboard** — all 7 metrics, including the most/least-used ranking's exact tie-break rule (lowest displayId, same direction for both most AND least), verified against a real dataset with a clear winner, a genuine tie, a forklift with zero qualifying shifts, an active shift, and a soft-deleted shift with an outlier value — all handled correctly.

**Not yet built**: `/admin/report` (needs PDF generation — Week 4), CI/CD, error monitoring, health check, automated backups, security headers, the production readiness gate.

**Week 2 (Core field flows) — complete:**

- **Shift start/end/force-close** — status + open-shift + monotonic-reading checks inside one locked transaction (Section 27); the DB-level race (partial unique index) is caught and translated to a clean `SHIFT_ALREADY_ACTIVE`, never surfaced raw.
- **Fuel-log creation** — auto-links to the forklift's open shift (Business Rule 10), same monotonic check under the same forklift row lock.
- **Server-side calculations** via `decimal.js`, not raw JS floats — see "What was actually verified" below for why that's load-bearing, not stylistic.
- **Date-range handling** (`src/lib/date-range.ts`) implementing Locked Decision #30's exact half-open UTC interval, shared by every list/report endpoint taking `from`/`to`.
- **Full field-flow UI**: `/login`, `/scan` (camera + always-visible manual search), `/forklift/[code]` landing page with role-conditional actions, and the start-shift/end-shift/fuel forms — each with server-side role checks independent of the landing page's conditional rendering (Section 28: hiding a button is never sufficient authorization on its own).

Not yet built: maintenance, dashboard, reports, Admin oversight pages, CI/CD, monitoring, backups. Weeks 3–4 per Section 32.

**Week 1 (Foundation), built and verified:**

- **Schema & migrations** — `prisma/schema.prisma` matches the spec exactly, including one addition: the `AuditAction` enum now includes `SHIFT_CREATED`, `SHIFT_ENDED`, `FUEL_LOG_CREATED`, and `FORKLIFT_ACTIVATED`, which the original spec's schema was missing even though the spec's own Locked Decision #18 requires them (Admin has direct power to start/end shifts and add fuel records, and reactivation is a real endpoint — the audit vocabulary needs to cover every action it can actually take).
- **The safety-critical database constraints** — the partial unique index (one active shift per forklift), all the check constraints, and the audit-log immutability grant — are applied and were verified against a real, running Postgres instance, not just written down. See "What was actually verified" below.
- **Auth** — password hashing (scrypt), database-backed sessions, atomic login rate-limiting, `requireRole()`, `proxy.ts`, CSRF checking, login/logout routes, seed script, password rotation script.
- **Forklift CRUD + QR generation** — create, list (search/status/pagination), QR lookup, edit, deactivate/reactivate, QR code PNG rendering.

Not yet built: shift start/end, fuel recording, maintenance, dashboard, reports, any actual UI pages, CI/CD, monitoring, backups. That's Weeks 2–4 per Section 32.

## One environment limitation (not a real-world one)

`prisma generate` and `prisma migrate dev` need to download a schema-engine binary from `binaries.prisma.sh`. The sandbox this was built in only allowlists npm/PyPI/crates/GitHub domains, so that download fails there. Everything in this repo was built around that limitation rather than pretending it doesn't exist:

- The initial migration (`prisma/migrations/20260817120000_init/migration.sql`) was hand-authored to match exactly what `prisma migrate dev` would generate from the schema, and applied directly with `psql`.
- The generated Prisma client (`src/generated/prisma/`) doesn't exist yet in this repo — it's gitignored, like any generated output.
- The shift/fuel service layer's business logic was verified against real Postgres via raw `pg` queries mirroring the exact SQL the services run (`tests/integration/shift-fuel-flow.test.ts`), since the services themselves need the generated client to execute.
- The camera scanner (`src/components/forms/camera-scanner.tsx`) could not be tested at all in this sandbox — no browser, no camera hardware. Built carefully against `qr-scanner`'s documented API, but treat it as the single highest-priority thing to verify on a real phone before relying on it.

**The fix is one command, and only needs to run once, anywhere with normal internet access:**

```bash
pnpm exec prisma generate
```

After that, `pnpm build` / `pnpm dev` work normally. If you want `prisma migrate dev` to take over from here (e.g. to generate Week 2's migrations), it can — Prisma will recognize the existing schema; you don't need to keep hand-authoring migrations once you're not in a network-restricted sandbox.

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up a local Postgres database.** `scripts/setup-local-db.sh` creates the two-role separation this project actually depends on — a `forklift_migrator` role that owns the schema, and a restricted `app_runtime` role the app connects as. That separation is what makes the audit-log immutability grant mean anything (Section 18): if the app connected as the same role that owns the schema, `REVOKE UPDATE, DELETE ON audit_log_entries` would have nothing to bite on.
   ```bash
   ./scripts/setup-local-db.sh
   ```
   Copy the `DATABASE_URL`/`DIRECT_URL` it prints into `.env` (copy `.env.example` first).

3. **Apply the schema:**
   ```bash
   pnpm exec prisma migrate deploy
   ```

4. **Generate the Prisma client** (the one step this sandbox couldn't do):
   ```bash
   pnpm exec prisma generate
   ```

5. **Set the three seed passwords** in `.env` — `ADMIN_PASSWORD`, `SUPERVISOR_PASSWORD`, `FUEL_SUPERVISOR_PASSWORD`, each 16+ random characters — and seed:
   ```bash
   pnpm db:seed
   ```

6. **Run it:**
   ```bash
   pnpm dev
   ```

## What was actually verified (and how)

Since the generated client couldn't exist in the build sandbox, verification leaned on testing the database layer directly and the pure logic separately, rather than skipping verification:

- **The audit log is genuinely immutable at the database level** — tested by connecting as `app_runtime` and attempting `UPDATE`/`DELETE` against `audit_log_entries` directly; both are rejected with `permission denied`, not just disallowed by application code.
- **The single-active-shift constraint holds under real conflict** — inserted two `ACTIVE` shifts on the same forklift; the second is rejected by the partial unique index, exactly matching the Section 33 acceptance criterion ("two rapid, near-simultaneous shift-start attempts... result in exactly one success").
- **Every check constraint rejects bad data for real** — an `ACTIVE` shift carrying completion fields, an ending reading below the starting reading, zero-liter fuel, negative maintenance cost — all tested by attempting the insert and confirming rejection.
- **displayId allocation is race-free under real concurrency** — 25 simultaneous connections (a `pg.Pool`, not a single serialized connection) calling `nextval()` at once; zero collisions (`tests/integration/display-id.test.ts`).
- **The `FORKLIFT_HAS_ACTIVE_SHIFT` check's underlying query** — confirmed it finds an open shift while one exists and finds nothing the moment that shift completes.
- **The shift/fuel monotonic-reading rule** (`tests/integration/shift-fuel-flow.test.ts`) — a fuel log auto-links to an open shift and saves unlinked otherwise; ending a shift below a reading its own linked fuel log recorded is caught; a new shift starting below the forklift's prior high-water mark is caught; starting exactly *at* the high-water mark is correctly accepted (`>=`, not `>`).
- **The bidirectional edit-time reading bounds** (`tests/integration/reading-edit-bounds.test.ts`, 6 tests) — editing a reading in the middle of a forklift's timeline (shift starts, shift ends, and fuel logs interleaved by their own timestamps) is checked against both its nearest predecessor and nearest successor, not just "before." Covers an interior shift-end edit, an interior fuel-log edit, an interior shift-start edit, both NULL-bound edge cases (the very first and very last record in the timeline), and a soft-deleted record correctly dropping out of its neighbors' bounds.
- **The dashboard's most/least-used ranking** (`tests/unit/dashboard-ranking.test.ts`, 6 tests, against a dataset first hand-verified with real SQL) — a clear winner, a genuine tie broken by lowest displayId *in both directions* (not "furthest from the tie" for one of them), a forklift with zero qualifying shifts correctly absent from the ranking entirely, an active shift's reading correctly excluded, and a soft-deleted shift's outlier value correctly excluded.
- **Server-side calculations never touch raw JS float math** (`tests/unit/calculations.test.ts`) — includes a regression test proving the exact float-precision failure this avoids (`100.3 - 100.2` is `0.09999999999999432` in raw JS, `0.1` through `decimal.js`) — exactly the kind of per-shift error that compounds when summed across a report.
- **Date-range boundaries** (`tests/unit/date-range.test.ts`, 12 tests) — the Africa/Johannesburg-to-UTC conversion, including month/year/leap-day rollovers, exactly where hand-rolled date arithmetic tends to break.
- **Password hashing** (`tests/unit/password.test.ts`, 9 tests) — including a regression test for a real bug this process caught: `Buffer.from(x, 'hex')` in Node doesn't throw on invalid hex, it silently returns an empty buffer, and `timingSafeEqual(empty, empty)` is `true`. Without explicit hex/length validation, a corrupted stored password hash would have authenticated successfully against *any* password. Fixed; the test stays so it can't silently regress.
- **QR generation** (`tests/unit/qr.test.ts`, 7 tests) — token entropy/uniqueness/URL-safety, deep-link construction, and that the rendered PNG is a real, valid image.
- **Scanned-QR content parsing** (`tests/unit/qr-parse.test.ts`, 7 tests) — extracting a forklift code from a deep-link URL, rejecting malformed/unrelated scans.

`pnpm typecheck` and `pnpm lint` are both clean. The only typecheck errors present are the expected "cannot find module .../generated/prisma/client" ones, which resolve the moment `prisma generate` runs.

## Two bugs this round that neither typecheck nor lint caught

Worth naming, since "clean typecheck and lint" isn't the same claim as "no bugs" — both were caught by re-reading the diff against how React actually behaves, not by tooling:

- Mapping array items to shorthand `<>...</>` fragments without a `key` compiles fine and lints clean, but shorthand fragments can't accept a `key` prop at all — React would still warn at runtime ("Each child in a list should have a unique key prop"). Fixed by using `<Fragment key={...}>` explicitly in the audit-log page's expandable rows.
- The React Compiler's `react-hooks/set-state-in-effect` rule (new in this React/ESLint generation) caught genuine synchronous `setState` calls inside effect bodies in three different list pages — moved to the event handlers that actually trigger a new fetch (search input, pagination, filter change) instead.

## Deviations from the spec, and why

- **`eslint` is pinned to `^9.39.5`, not the spec's `^10.8.1`.** Confirmed by testing: ESLint 10.8.1 crashes against `eslint-config-next@16.3.1` with a `scopeManager` internal API error. Both packages are already at their latest published versions — this isn't a stale pin, it's the ecosystem not having caught up to ESLint 10 yet.
- **`decimal.js` was added as a direct dependency**, not just consumed via `Prisma.Decimal`. The generated client (and its re-exported Decimal class) doesn't exist in this sandbox, so the calculation module (`src/server/services/shifts/calculations.ts`) works with validated decimal strings at its boundary and uses `decimal.js` directly for the arithmetic — which is what `Prisma.Decimal` is built on anyway. This also makes the module directly unit-testable without a database.
- **Interpretive calls where the spec was silent** (each noted in code comments at the relevant spot too):
  - An unauthenticated request and a wrong-role request both resolve to `INVALID_ROLE`/403 — Section 20's error catalog never names a separate code for "no session at all."
  - `db:rotate-password` reads the new password from the same env var used for seeding (e.g. `ADMIN_PASSWORD`) — the spec names the command's flags but not where the new password value comes from.
  - `GET /api/forklifts` gained an `includeInactive` query param, defaulting to `false`. Business Rule 22 excludes deactivated forklifts from lists "by default," but without this, there'd be no way for the Admin fleet page to ever find a deactivated forklift again to reactivate it.
  - `PATCH /api/forklifts/:id`'s `isActive` field and `POST /api/forklifts/:id/deactivate` both route through one shared function (`setForkliftActive`), so Locked Decision #27 (never deactivate with an open shift) holds regardless of which endpoint triggers the transition.
  - **Resolved this round**: the monotonic-reading rule (Business Rule 26) DOES apply to Admin edits of historical readings, checked bidirectionally — an edit can't be lower than what came immediately before it in the forklift's timeline, or higher than what came immediately after. This was an explicit design decision (the spec's own text was genuinely silent on it), not a default I picked unilaterally.
  - `totalReadingDelta` is recomputed whenever EITHER `startingReading` or `endingReading` changes on a completed shift, not just when `endingReading` changes — Business Rule 28's literal text only names the latter, but the former feeds the identical formula (Section 14), so leaving it stale on a starting-reading-only edit would be the same class of bug BR28 is naming, just for the other operand.
  - If `notes` is provided when ending a shift, it replaces the shift's notes rather than appending to them — the spec's API table has one `notes` field, not separate start/end fields, and this matches how every other optional field in this API behaves.
  - Manual search's `pageSize=10` cap (Business Rule 15) is applied by the *caller* (the search UI passes `pageSize=10`), not hardcoded into `GET /api/forklifts` itself — that endpoint uses the same generic 1–100 pagination as every other list endpoint (Business Rule 16), since Section 19 describes it as one endpoint serving both the Admin list view and the field search picker.

## Commands

```bash
pnpm dev              # local dev server
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm test:unit        # vitest run tests/unit (no DB needed)
pnpm test:integration # vitest run tests/integration (needs a real Postgres — see setup-local-db.sh)
pnpm db:seed          # bootstrap the 3 accounts (safe no-op if they already exist)
pnpm db:rotate-password --account=admin --confirm   # rotate one account's password, revoke its sessions
```

## Next

The consolidated PDF report (`/admin/report`, `@react-pdf/renderer`) and the manual "Send Email" workflow — the last piece of application code the spec calls for. After that, this is a matter of actually running the pipeline against a real repo, filling in `OPERATIONS.md`'s business-decision table, and working through Section 36's smoke test and Section 43's readiness gate for real.

See `OPERATIONS.md` for deployment, rollback, and backup/restore procedures.
