-- Enable PostGIS (required for geometry columns below)
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RESEARCHER', 'VIEWER');

-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'PARSED', 'VALIDATING', 'VALIDATED', 'IMPORTING', 'IMPORTED', 'PARTIAL', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "River" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "origin" TEXT,
    "lengthKm" DOUBLE PRECISION,
    "basinAreaKm2" DOUBLE PRECISION,
    "metadata" JSONB,
    "geom" geometry(LineString, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "River_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "geom" geometry(MultiPolygon, 4326),

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "geom" geometry(MultiPolygon, 4326),

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiverStretch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riverId" TEXT NOT NULL,
    "stateId" TEXT,
    "districtId" TEXT,
    "fromKm" DOUBLE PRECISION,
    "toKm" DOUBLE PRECISION,
    "description" TEXT,
    "geom" geometry(LineString, 4326),

    CONSTRAINT "RiverStretch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "riverId" TEXT NOT NULL,
    "stateId" TEXT,
    "districtId" TEXT,
    "riverStretchId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "elevationM" DOUBLE PRECISION,
    "establishedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "geom" geometry(Point, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sourceId" TEXT,
    "riverId" TEXT,
    "dataType" TEXT,
    "methodology" TEXT,
    "units" TEXT,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "status" "DatasetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HydrologyParameter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "description" TEXT,

    CONSTRAINT "HydrologyParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HydrologyRecord" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT,
    "importId" TEXT,
    "parameterId" TEXT,
    "riverId" TEXT NOT NULL,
    "stateId" TEXT,
    "districtId" TEXT,
    "riverStretchId" TEXT,
    "stationId" TEXT,
    "dataType" TEXT NOT NULL,
    "dataSubType" TEXT,
    "season" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION,
    "flag" TEXT,
    "unit" TEXT,
    "sourceRowId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HydrologyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GisLayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "style" JSONB,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GisLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "columnMapping" JSONB,
    "totalRows" INTEGER,
    "validRows" INTEGER,
    "invalidRows" INTEGER,
    "duplicateRows" INTEGER,
    "missingValues" INTEGER,
    "summary" JSONB,
    "datasetId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "field" TEXT,
    "raw" JSONB,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'error',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "datasetId" TEXT,
    "importId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "filters" JSONB,
    "format" TEXT NOT NULL,
    "storageKey" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "River_name_key" ON "River"("name");

-- CreateIndex
CREATE UNIQUE INDEX "River_slug_key" ON "River"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "State_name_key" ON "State"("name");

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");

-- CreateIndex
CREATE INDEX "District_stateId_idx" ON "District"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "District_name_stateId_key" ON "District"("name", "stateId");

-- CreateIndex
CREATE INDEX "RiverStretch_stateId_idx" ON "RiverStretch"("stateId");

-- CreateIndex
CREATE INDEX "RiverStretch_districtId_idx" ON "RiverStretch"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "RiverStretch_riverId_name_key" ON "RiverStretch"("riverId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringStation_code_key" ON "MonitoringStation"("code");

-- CreateIndex
CREATE INDEX "MonitoringStation_riverId_idx" ON "MonitoringStation"("riverId");

-- CreateIndex
CREATE INDEX "MonitoringStation_stateId_idx" ON "MonitoringStation"("stateId");

-- CreateIndex
CREATE INDEX "MonitoringStation_districtId_idx" ON "MonitoringStation"("districtId");

-- CreateIndex
CREATE INDEX "MonitoringStation_riverStretchId_idx" ON "MonitoringStation"("riverStretchId");

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_slug_key" ON "Dataset"("slug");

-- CreateIndex
CREATE INDEX "Dataset_riverId_idx" ON "Dataset"("riverId");

-- CreateIndex
CREATE INDEX "Dataset_status_idx" ON "Dataset"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HydrologyParameter_code_key" ON "HydrologyParameter"("code");

-- CreateIndex
CREATE INDEX "HydrologyRecord_riverId_observedAt_idx" ON "HydrologyRecord"("riverId", "observedAt");

-- CreateIndex
CREATE INDEX "HydrologyRecord_stationId_observedAt_idx" ON "HydrologyRecord"("stationId", "observedAt");

-- CreateIndex
CREATE INDEX "HydrologyRecord_stateId_idx" ON "HydrologyRecord"("stateId");

-- CreateIndex
CREATE INDEX "HydrologyRecord_districtId_idx" ON "HydrologyRecord"("districtId");

-- CreateIndex
CREATE INDEX "HydrologyRecord_dataType_idx" ON "HydrologyRecord"("dataType");

-- CreateIndex
CREATE INDEX "HydrologyRecord_season_idx" ON "HydrologyRecord"("season");

-- CreateIndex
CREATE INDEX "HydrologyRecord_parameterId_idx" ON "HydrologyRecord"("parameterId");

-- CreateIndex
CREATE INDEX "HydrologyRecord_datasetId_idx" ON "HydrologyRecord"("datasetId");

-- CreateIndex
CREATE INDEX "Import_status_idx" ON "Import"("status");

-- CreateIndex
CREATE INDEX "ImportError_importId_idx" ON "ImportError"("importId");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiverStretch" ADD CONSTRAINT "RiverStretch_riverId_fkey" FOREIGN KEY ("riverId") REFERENCES "River"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiverStretch" ADD CONSTRAINT "RiverStretch_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiverStretch" ADD CONSTRAINT "RiverStretch_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringStation" ADD CONSTRAINT "MonitoringStation_riverId_fkey" FOREIGN KEY ("riverId") REFERENCES "River"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringStation" ADD CONSTRAINT "MonitoringStation_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringStation" ADD CONSTRAINT "MonitoringStation_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringStation" ADD CONSTRAINT "MonitoringStation_riverStretchId_fkey" FOREIGN KEY ("riverStretchId") REFERENCES "RiverStretch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_riverId_fkey" FOREIGN KEY ("riverId") REFERENCES "River"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HydrologyRecord" ADD CONSTRAINT "HydrologyRecord_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HydrologyRecord" ADD CONSTRAINT "HydrologyRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HydrologyRecord" ADD CONSTRAINT "HydrologyRecord_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "HydrologyParameter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HydrologyRecord" ADD CONSTRAINT "HydrologyRecord_riverId_fkey" FOREIGN KEY ("riverId") REFERENCES "River"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HydrologyRecord" ADD CONSTRAINT "HydrologyRecord_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HydrologyRecord" ADD CONSTRAINT "HydrologyRecord_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HydrologyRecord" ADD CONSTRAINT "HydrologyRecord_riverStretchId_fkey" FOREIGN KEY ("riverStretchId") REFERENCES "RiverStretch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HydrologyRecord" ADD CONSTRAINT "HydrologyRecord_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "MonitoringStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportError" ADD CONSTRAINT "ImportError_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
