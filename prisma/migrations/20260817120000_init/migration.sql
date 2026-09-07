-- ============================================================================
-- Prisma-equivalent DDL, generated from prisma/schema.prisma
-- (hand-authored in this sandbox because binaries.prisma.sh is unreachable —
-- `prisma migrate dev` will generate an identical file the moment this runs
-- anywhere with normal internet access)
-- ============================================================================

-- Enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'FUEL_SUPERVISOR');
CREATE TYPE "TrackingMode" AS ENUM ('MILEAGE');
CREATE TYPE "ForkliftStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE');
CREATE TYPE "ShiftStatus" AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'COMPLETED');
CREATE TYPE "ShiftEndType" AS ENUM ('NORMAL', 'FORCE_CLOSED');
CREATE TYPE "AuditAction" AS ENUM (
  'FORKLIFT_CREATED', 'FORKLIFT_EDITED', 'FORKLIFT_STATUS_CHANGED', 'FORKLIFT_ACTIVATED', 'FORKLIFT_DEACTIVATED',
  'SHIFT_CREATED', 'SHIFT_ENDED', 'SHIFT_EDITED', 'SHIFT_DELETED', 'SHIFT_FORCE_CLOSED',
  'FUEL_LOG_CREATED', 'FUEL_LOG_EDITED', 'FUEL_LOG_DELETED',
  'MAINTENANCE_LOG_CREATED', 'MAINTENANCE_LOG_EDITED', 'MAINTENANCE_LOG_DELETED'
);
CREATE TYPE "AuditTargetType" AS ENUM ('FORKLIFT', 'SHIFT', 'FUEL_LOG', 'MAINTENANCE_LOG');

-- users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- audit_log_entries
CREATE TABLE "audit_log_entries" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" "Role" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "target_type" "AuditTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "before_value" JSONB,
    "after_value" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_log_entries_target_type_target_id_idx" ON "audit_log_entries"("target_type", "target_id");
CREATE INDEX "audit_log_entries_created_at_idx" ON "audit_log_entries"("created_at");
CREATE INDEX "audit_log_entries_actor_user_id_created_at_idx" ON "audit_log_entries"("actor_user_id", "created_at");
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- login_attempts
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "login_attempts_username_attempted_at_idx" ON "login_attempts"("username", "attempted_at");
CREATE INDEX "login_attempts_ip_address_attempted_at_idx" ON "login_attempts"("ip_address", "attempted_at");

-- login_throttles
CREATE TABLE "login_throttles" (
    "key" TEXT NOT NULL,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "login_throttles_pkey" PRIMARY KEY ("key")
);

-- forklifts
CREATE SEQUENCE "forklifts_sequence_number_seq" START 1;
CREATE TABLE "forklifts" (
    "id" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL DEFAULT nextval('forklifts_sequence_number_seq'),
    "display_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "tracking_mode" "TrackingMode" NOT NULL DEFAULT 'MILEAGE',
    "status" "ForkliftStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "forklifts_pkey" PRIMARY KEY ("id")
);
ALTER SEQUENCE "forklifts_sequence_number_seq" OWNED BY "forklifts"."sequence_number";
CREATE UNIQUE INDEX "forklifts_display_id_key" ON "forklifts"("display_id");
CREATE UNIQUE INDEX "forklifts_qr_token_key" ON "forklifts"("qr_token");
CREATE INDEX "forklifts_status_is_active_idx" ON "forklifts"("status", "is_active");
ALTER TABLE "forklifts" ADD CONSTRAINT "forklifts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- shifts
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "forklift_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "ended_by_id" TEXT,
    "end_type" "ShiftEndType",
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "status" "ShiftStatus" NOT NULL DEFAULT 'ACTIVE',
    "starting_reading" DECIMAL(10,1) NOT NULL,
    "ending_reading" DECIMAL(10,1),
    "total_hours_worked" DECIMAL(6,2),
    "total_reading_delta" DECIMAL(10,1),
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "shifts_forklift_id_status_idx" ON "shifts"("forklift_id", "status");
CREATE INDEX "shifts_end_time_idx" ON "shifts"("end_time");
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_forklift_id_fkey" FOREIGN KEY ("forklift_id") REFERENCES "forklifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_ended_by_id_fkey" FOREIGN KEY ("ended_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- fuel_logs
CREATE TABLE "fuel_logs" (
    "id" TEXT NOT NULL,
    "forklift_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "shift_id" TEXT,
    "fuel_amount_liters" DECIMAL(8,2) NOT NULL,
    "fuel_cost_zar" DECIMAL(10,2),
    "reading_at_refuel" DECIMAL(10,1) NOT NULL,
    "refuel_date_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fuel_logs_forklift_id_idx" ON "fuel_logs"("forklift_id");
CREATE INDEX "fuel_logs_refuel_date_time_idx" ON "fuel_logs"("refuel_date_time");
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_forklift_id_fkey" FOREIGN KEY ("forklift_id") REFERENCES "forklifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- maintenance_logs
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "forklift_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "cost_zar" DECIMAL(10,2),
    "created_by_id" TEXT NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "maintenance_logs_forklift_id_status_idx" ON "maintenance_logs"("forklift_id", "status");
CREATE INDEX "maintenance_logs_date_idx" ON "maintenance_logs"("date");
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_forklift_id_fkey" FOREIGN KEY ("forklift_id") REFERENCES "forklifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Locked Decision #25 — single-active-shift invariant, enforced at the
-- database level, not just the application transaction (Section 18, 27)
-- ============================================================================
CREATE UNIQUE INDEX shifts_one_active_per_forklift
  ON shifts (forklift_id)
  WHERE status = 'ACTIVE' AND is_deleted = false;

-- ============================================================================
-- Locked Decision #37 + standing integrity checks (Section 18)
-- ============================================================================
ALTER TABLE shifts ADD CONSTRAINT shift_status_fields_check
  CHECK (
    (status = 'ACTIVE' AND end_time IS NULL AND ending_reading IS NULL
      AND total_hours_worked IS NULL AND total_reading_delta IS NULL)
    OR
    (status = 'COMPLETED' AND end_time IS NOT NULL AND ending_reading IS NOT NULL
      AND total_hours_worked IS NOT NULL AND total_reading_delta IS NOT NULL)
  );

ALTER TABLE shifts ADD CONSTRAINT shift_readings_check
  CHECK (starting_reading >= 0 AND (ending_reading IS NULL OR ending_reading >= starting_reading));
ALTER TABLE shifts ADD CONSTRAINT shift_totals_check
  CHECK (
    (total_hours_worked IS NULL OR total_hours_worked >= 0)
    AND (total_reading_delta IS NULL OR total_reading_delta >= 0)
  );

ALTER TABLE fuel_logs ADD CONSTRAINT fuel_log_amount_check CHECK (fuel_amount_liters > 0);
ALTER TABLE fuel_logs ADD CONSTRAINT fuel_log_reading_check CHECK (reading_at_refuel >= 0);
ALTER TABLE fuel_logs ADD CONSTRAINT fuel_log_cost_check CHECK (fuel_cost_zar IS NULL OR fuel_cost_zar >= 0);

ALTER TABLE maintenance_logs ADD CONSTRAINT maintenance_log_cost_check CHECK (cost_zar IS NULL OR cost_zar >= 0);

-- ============================================================================
-- app_runtime privileges. Least-privilege by table: audit_log_entries is
-- insert/select only (immutable — MUST NOT #12); the four core business
-- tables (never hard-deleted, Locked Decision #16) get no DELETE grant
-- either, extending the same "make it impossible at the DB level, not just
-- policy in app code" pattern Section 18 already applies to the audit log.
-- sessions/login_attempts/login_throttles are legitimately prunable
-- (session cleanup, 90-day retention, Section 21) so those keep DELETE.
-- ============================================================================
GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON users, forklifts, shifts, fuel_logs, maintenance_logs TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions, login_attempts, login_throttles TO app_runtime;
GRANT SELECT, INSERT ON audit_log_entries TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

REVOKE UPDATE, DELETE ON audit_log_entries FROM app_runtime;
