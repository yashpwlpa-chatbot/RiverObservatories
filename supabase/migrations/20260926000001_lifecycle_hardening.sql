-- Dataset lifecycle enum: legacy ACTIVE maps to PUBLISHED inline in the USING
-- clause below, so the cast never fails on rows still carrying old values.

-- AlterEnum
CREATE TYPE "DatasetStatus_new" AS ENUM ('DRAFT', 'VALIDATED', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'REJECTED');
ALTER TABLE "Dataset" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Dataset" ALTER COLUMN "status" TYPE "DatasetStatus_new" USING (
  CASE WHEN "status"::text = 'ACTIVE' THEN 'PUBLISHED'::"DatasetStatus_new"
       ELSE "status"::text::"DatasetStatus_new" END
);
ALTER TYPE "DatasetStatus" RENAME TO "DatasetStatus_old";
ALTER TYPE "DatasetStatus_new" RENAME TO "DatasetStatus";
DROP TYPE "DatasetStatus_old";
ALTER TABLE "Dataset" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable (file integrity + structured import errors)
ALTER TABLE "Import" ADD COLUMN "checksum" TEXT;
ALTER TABLE "ImportError" ADD COLUMN "code" TEXT;

-- CreateIndex (frequent hydrology query patterns)
CREATE INDEX "HydrologyRecord_observedAt_idx" ON "HydrologyRecord"("observedAt");
CREATE INDEX "HydrologyRecord_riverStretchId_idx" ON "HydrologyRecord"("riverStretchId");

-- PostGIS spatial indexes (used by the map / spatial queries)
CREATE INDEX "River_geom_idx" ON "River" USING GIST (geom);
CREATE INDEX "State_geom_idx" ON "State" USING GIST (geom);
CREATE INDEX "District_geom_idx" ON "District" USING GIST (geom);
CREATE INDEX "RiverStretch_geom_idx" ON "RiverStretch" USING GIST (geom);
CREATE INDEX "MonitoringStation_geom_idx" ON "MonitoringStation" USING GIST (geom);
