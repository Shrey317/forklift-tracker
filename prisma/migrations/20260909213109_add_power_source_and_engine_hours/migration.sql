-- CreateEnum
CREATE TYPE "PowerSource" AS ENUM ('DIESEL', 'LPG', 'ELECTRIC');

-- AlterEnum
ALTER TYPE "TrackingMode" ADD VALUE 'ENGINE_HOURS';

-- DropForeignKey
ALTER TABLE "fuel_logs" DROP CONSTRAINT "fuel_logs_shift_id_fkey";

-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_ended_by_id_fkey";

-- AlterTable
ALTER TABLE "forklifts" ADD COLUMN     "power_source" "PowerSource" NOT NULL DEFAULT 'DIESEL';

-- CreateIndex
CREATE INDEX "fuel_logs_is_deleted_refuel_date_time_idx" ON "fuel_logs"("is_deleted", "refuel_date_time");

-- CreateIndex
CREATE INDEX "shifts_start_time_idx" ON "shifts"("start_time");

-- CreateIndex
CREATE INDEX "shifts_is_deleted_status_idx" ON "shifts"("is_deleted", "status");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_ended_by_id_fkey" FOREIGN KEY ("ended_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
