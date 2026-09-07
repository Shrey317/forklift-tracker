#!/usr/bin/env bash
# Sets up a local Postgres database for development, with the same
# two-role separation the production migration (prisma/migrations/
# 20260817120000_init/migration.sql) actually depends on:
#   - forklift_migrator: owns the database, runs migrations (DIRECT_URL)
#   - app_runtime: the restricted role the app connects as (DATABASE_URL)
# This separation is what makes the audit-log immutability grant
# (REVOKE UPDATE, DELETE ON audit_log_entries FROM app_runtime) mean
# anything — if the app connected as the same role that owns the schema,
# that REVOKE would have nothing to bite on.
#
# Requires: a local PostgreSQL server already running and reachable, and
# a role you can connect as with CREATEROLE/CREATEDB (commonly the
# `postgres` superuser).
#
# Usage: ./scripts/setup-local-db.sh

set -euo pipefail

DB_NAME="forklift_tracker"
MIGRATOR_PW=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)
RUNTIME_PW=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)

psql -U postgres <<SQL
CREATE ROLE forklift_migrator WITH LOGIN PASSWORD '${MIGRATOR_PW}' CREATEDB;
CREATE ROLE app_runtime WITH LOGIN PASSWORD '${RUNTIME_PW}';
CREATE DATABASE ${DB_NAME} OWNER forklift_migrator;
GRANT CONNECT ON DATABASE ${DB_NAME} TO app_runtime;
SQL

# The rest of app_runtime's privileges (SELECT/INSERT/UPDATE on the
# business tables, INSERT-only on audit_log_entries, etc.) are granted by
# the migration itself when you apply it — this script only creates the
# roles and the empty database.

cat <<EOF

Local database ready. Add these to your .env:

DATABASE_URL="postgresql://app_runtime:${RUNTIME_PW}@localhost:5432/${DB_NAME}"
DIRECT_URL="postgresql://forklift_migrator:${MIGRATOR_PW}@localhost:5432/${DB_NAME}"

Then apply the schema:
  pnpm exec prisma migrate deploy
  (or, once you're iterating locally: pnpm db:migrate:dev)

EOF
