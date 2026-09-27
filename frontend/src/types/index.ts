export type Role = 'ADMIN' | 'RESEARCHER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt?: string;
}

export interface RiverSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  origin: string | null;
  lengthKm: number | null;
  basinAreaKm2: number | null;
  stationCount: number;
  stretchCount: number;
  recordCount: number;
  datasetCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  parameters: string[];
}

export interface Attribute {
  key: string;
  label: string;
  enabled: boolean;
}

export interface RiverDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  origin: string | null;
  lengthKm: number | null;
  basinAreaKm2: number | null;
  stations: Station[];
  stretches: Stretch[];
  datasets: DatasetSummary[];
  attributes: Attribute[];
  stats: { recordCount: number; dateFrom: string | null; dateTo: string | null };
}

export interface Station {
  id: string;
  name: string;
  code: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  stateId: string | null;
  districtId: string | null;
  riverId?: string;
}

export interface Stretch {
  id: string;
  name: string;
  stateId: string | null;
  districtId: string | null;
}

export interface DatasetSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  dataType: string | null;
  units: string | null;
  methodology: string | null;
  source: { id: string; name: string; type: string; url: string | null } | null;
  river: { id: string; name: string; slug: string } | null;
  createdBy: { id: string; name: string } | null;
  recordCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeoOption {
  id: string;
  name: string;
  code?: string | null;
  stateId?: string | null;
  districtId?: string | null;
  riverId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  active?: boolean;
}

export interface FilterOptions {
  states: GeoOption[];
  districts: GeoOption[];
  stretches: GeoOption[];
  stations: GeoOption[];
  dataTypes: string[];
  dataSubTypes: string[];
  seasons: string[];
  parameters: { id: string; code: string; name: string; unit: string | null }[];
  years: number[];
  months: number[];
  dateBounds: { from: string | null; to: string | null };
}

export interface HydrologyRecordRow {
  id: string;
  observedAt: string;
  value: number | null;
  flag: string | null;
  unit: string | null;
  dataType: string;
  dataSubType: string | null;
  season: string | null;
  stationName: string | null;
  stationCode: string | null;
  riverName: string;
  stateName: string | null;
  districtName: string | null;
  parameterName: string | null;
  datasetName: string | null;
}

export interface SummaryStats {
  totalRecords: number;
  nonNullRecords: number;
  missingRecords: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  stationCount: number;
  unit: string | null;
  hasValues: boolean;
  mixedUnits?: boolean;
}

export interface TimeseriesPoint {
  t: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface TimeseriesResult {
  granularity: 'day' | 'month' | 'year';
  unit: string | null;
  mixedUnits?: boolean;
  points: TimeseriesPoint[];
}

export interface CompareSeries {
  name: string;
  points: { t: string; value: number | null }[];
}

export interface BucketStat {
  period: string;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
  count: number;
}

export interface AnnualResult {
  unit: string | null;
  mixedUnits: boolean;
  series: { year: number; mean: number | null; median: number | null; min: number | null; max: number | null; std: number | null; count: number }[];
}

export interface MonthlyResult {
  unit: string | null;
  mixedUnits: boolean;
  series: { month: number; mean: number | null; median: number | null; min: number | null; max: number | null; std: number | null; count: number }[];
}

export interface SeasonalResult {
  unit: string | null;
  mixedUnits: boolean;
  series: { season: string; mean: number | null; median: number | null; min: number | null; max: number | null; std: number | null; count: number }[];
}

export interface DistributionResult {
  unit: string | null;
  mixedUnits: boolean;
  histogram: { bin: number; from: number; to: number; count: number }[];
  stats: {
    count: number;
    min: number | null;
    max: number | null;
    mean: number | null;
    std: number | null;
    p25: number | null;
    median: number | null;
    p75: number | null;
  } | null;
}

export interface ExtremeRow {
  id: string;
  observedAt: string;
  value: number | null;
  unit: string | null;
  season: string | null;
  dataType: string;
  stationId: string | null;
  stationName: string | null;
  riverName: string;
}

export interface ExtremesResult {
  unit: string | null;
  mixedUnits: boolean;
  highest: ExtremeRow[];
  lowest: ExtremeRow[];
  exceedances: {
    aboveCount: number;
    belowCount: number;
    above: ExtremeRow[];
    below: ExtremeRow[];
  } | null;
}

export interface HeatmapResult {
  unit: string | null;
  mixedUnits: boolean;
  years: number[];
  months: number[];
  matrix: (number | null)[][];
}

export interface ScatterResult {
  unit: string | null;
  mixedUnits: boolean;
  points: { observedAt: string; value: number | null; stationName: string | null }[];
}

export interface StationDetail {
  id: string;
  name: string;
  code: string | null;
  latitude: number | null;
  longitude: number | null;
  elevationM: number | null;
  active: boolean;
  river: { id: string; name: string; slug: string };
  state: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  riverStretch: { id: string; name: string } | null;
  metadata: unknown;
  observationCount: number;
  dataFrom: string | null;
  dataTo: string | null;
  dataTypes: string[];
}

export interface SavedVisualization {
  id: string;
  name: string;
  kind: string;
  filters: Record<string, unknown> | null;
  format: string;
  storageKey: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
}

export interface CompareResult {
  mode: 'station' | 'year' | 'season' | 'period';
  unit: string | null;
  mixedUnits?: boolean;
  note?: string;
  series: CompareSeries[];
}

export interface ImportRow {
  id: string;
  fileName: string;
  status: string;
  totalRows: number | null;
  validRows: number | null;
  invalidRows: number | null;
  duplicateRows: number | null;
  missingValues: number | null;
  createdAt: string;
  createdBy?: { id: string; name: string; email: string } | null;
  dataset?: { id: string; name: string } | null;
  summary?: unknown;
  columnMapping?: Record<string, string> | null;
}

export interface ImportDetail extends ImportRow {
  errors?: { id: string; rowNumber: number; message: string; severity: string }[];
}

export interface RowError {
  rowNumber: number;
  field: string | null;
  code: string;
  message: string;
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  missingValues: number;
  fieldErrors: { field: string; count: number }[];
  errorCodes: { code: string; count: number }[];
  preview: Record<string, unknown>[];
  errorSamples: RowError[];
}

export interface SubmissionRow {
  id: string;
  title: string;
  description: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user?: { id: string; name: string; email: string };
  dataset?: { id: string; name: string } | null;
  import?: { id: string; fileName: string; status: string; totalRows: number | null; validRows: number | null } | null;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}
