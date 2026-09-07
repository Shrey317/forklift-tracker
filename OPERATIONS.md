# Operations

This covers what Section 29 asks the README set to cover — deployment, migrations, backup/restore, and rollback — plus the business decisions Sections 38 and 40 explicitly decline to invent on your behalf. Nothing in this document has been exercised against a real deployment; it's a careful first draft, not a verified runbook. Treat the first real deployment as the actual test of everything here.

## Deployment

Every production deployment goes through `.github/workflows/ci.yml`, never a bare `git push` or Vercel's own auto-deploy:

1. Push to a feature branch, open a PR against `main`.
2. The `test` job runs automatically: typecheck, lint, migrations + seed against a disposable Postgres container, unit/integration/e2e tests, production build. All of it has to pass.
3. Merge to `main` once the PR is approved (branch protection should require this — see "Required setup" below).
4. The `deploy` job runs, gated by the `production` GitHub Environment: pulls Vercel project settings, builds, runs `prisma migrate deploy` against the real `DIRECT_URL`, and — only if that succeeds — promotes the build to production traffic.

A deployment where migrations fail never goes live, and never leaves the app running against a schema it doesn't match (Section 37).

### Required setup (one-time, in the hosting platform's own UI — not expressible in this repo)

- **GitHub**: branch protection on `main` requiring the `test` job to pass and requiring PR review. A `production` Environment with the secrets below, and (recommended) required reviewers on that environment for an extra gate before real deploys.
- **GitHub secrets**: `VERCEL_TOKEN`, `PRODUCTION_DIRECT_URL`, `PRODUCTION_DATABASE_URL`.
- **Vercel**: auto-deploy-on-push to production disabled in the project's Git settings — this repo's CI/CD pipeline is the only path that should ever promote a build to production traffic (Section 29). Preview deployments on PRs can stay on; they never touch production data.

## Migrations

- Every schema change gets its own migration, generated locally with `pnpm db:migrate:dev` against your own database — never batch unrelated changes into one.
- Never edit a migration file that's already been applied anywhere, including your own machine (MUST NOT #19) — fix a mistake with a new migration.
- Production migrations run via `prisma migrate deploy` against `DIRECT_URL`, only from the `deploy` job above, only after the `test` job has already passed.
- Every migration is expand-then-contract (Section 29): add the new column/constraint/index in a way the *currently deployed* code can still run against; deploy the code that uses it; only remove anything old in a later migration once nothing depends on it.
- A schema "rollback" is never an unsafe reverse migration — it's either a code rollback to a version compatible with the current schema, or a new forward migration that fixes the problem.
- Never `prisma db push` against production or a shared database (MUST NOT #20) — it changes the database without creating a migration record at all.

## Rollback

- **Code rollback**: revert the bad commit (or redeploy the previous Vercel deployment directly via `vercel rollback` / the Vercel dashboard) — safe as long as the previous code is compatible with the *current* schema, which the expand-then-contract discipline above is what guarantees.
- **Never** reverse-apply a migration to "undo" a schema change. If a migration itself was the problem, write a new forward migration that corrects it.
- If a deployment's migration step fails, the deploy job stops before promotion — the previous deployment keeps serving production traffic untouched. There is nothing to "roll back" in that case; the bad build never went live.

## Backup & Restore

Automated backups are a Supabase platform feature, configured in the Supabase project's own dashboard, not in this repository. What this repo controls is the restore *verification* process:

1. Confirm the latest automated backup exists and its timestamp is recent, in the Supabase dashboard.
2. Restore it into a **separate, non-production** Supabase project or local Postgres instance — production is never the restore test environment.
3. Verify the restored database against the expected schema (`prisma migrate status` should show all migrations applied) and a set of known sample records.
4. Document the result (date, who ran it, what was verified) — this document is a reasonable place to log that history once it starts happening.

### Parameters the business confirms before launch

These are explicitly *not* this document's decision to make (Sections 38, 40) — each needs a real answer, owner, and date before Section 43's production readiness gate is actually satisfied:

| Parameter | Value | Owner | Decided | Review by |
|---|---|---|---|---|
| Monitoring provider (Section 38) | _unset_ | | | |
| Alert recipient (Section 38) | _unset_ | | | |
| Backup frequency & retention (Section 40 — depends on the Supabase plan tier) | _unset_ | | | |
| RPO / RTO (Section 40) | _unset_ | | | |
| Who owns initiating/verifying a restore (Section 40) | _unset_ | | | |
| Production region (Section 40) | _unset_ | | | |
| Audit-log retention period (Section 40 — never deleted isn't the same as retained forever) | _unset_ | | | |
| Whether Admin requires an IP allowlist or MFA compensating control (Section 21) | _unset_ | | | |

Fill this table in before treating the system as launched — an unfilled row here is a real gap, not a placeholder to ignore.

## Health check & monitoring

- `GET /api/health` — unauthenticated, returns `200` with `{status: "healthy", database: "connected"}` or `503` with `{status: "unhealthy"}`. Point your uptime monitor at this on a real cadence, alerting the recipient named in the table above.
- Error capture goes through `src/lib/monitoring.ts`'s `reportError()` — currently structured JSON to stderr (captured by Vercel's own log drain). Swapping in a real provider once one is chosen (table above) is a one-file change: replace the body of `reportError`, keep the sanitization step exactly as-is (it's what keeps passwords/tokens/secrets out of whatever you send).

## Scheduled maintenance

`.github/workflows/scheduled-cleanup.yml` runs daily, pruning `LoginAttempt` rows older than 90 days and expired `Session` rows (Section 21). It never touches Forklift/Shift/FuelLog/MaintenanceLog/AuditLogEntry — those are never hard-deleted (Locked Decision #16), and audit-log retention specifically is one of the business decisions in the table above, not something a cron job decides.

## Production smoke test

Section 36 defines a 26-step manual smoke test to run once, after the first real production deployment — logging in as each role, confirming permission boundaries live in production (not just in tests), checking the health endpoint, confirming security headers and HTTPS, confirming the latest backup exists, confirming a restore has actually been tested, and confirming the deployed version matches the expected commit. It's reproduced in full in the original specification document (Section 36) — run it against the real deployment before calling this launched, not against `localhost`.
