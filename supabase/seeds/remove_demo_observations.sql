-- Run only when the synthetic preview should be removed.
-- Targets the stable demo IDs created by 20260927_demo_observations.sql.
BEGIN;
DELETE FROM public."HydrologyRecord"
WHERE "datasetId" IN ('demo-dataset-ganga-level','demo-dataset-chambal-level')
  AND id LIKE 'demo-observation-%';
DELETE FROM public."Dataset"
WHERE id IN ('demo-dataset-ganga-level','demo-dataset-chambal-level');
DELETE FROM public."MonitoringStation"
WHERE id IN ('demo-ganga-a','demo-ganga-b','demo-chambal-a','demo-chambal-b')
  AND NOT EXISTS (SELECT 1 FROM public."HydrologyRecord" h WHERE h."stationId"=public."MonitoringStation".id);
DELETE FROM public."HydrologyParameter"
WHERE id='demo-parameter-water-level'
  AND NOT EXISTS (SELECT 1 FROM public."HydrologyRecord" h WHERE h."parameterId"=public."HydrologyParameter".id);
COMMIT;
