ALTER TABLE attendance_days
  DROP CONSTRAINT attendance_day_current_calculation_same_tenant,
  DROP COLUMN current_calculation_id;

DROP TRIGGER attendance_calculations_immutable ON attendance_calculations;
DROP TABLE attendance_calculations;

DROP INDEX attendance_events_day_source_idx;
ALTER TABLE attendance_events
  DROP CONSTRAINT attendance_event_interpretation_complete,
  DROP CONSTRAINT attendance_event_timezone_same_tenant,
  DROP CONSTRAINT attendance_event_day_same_tenant,
  DROP COLUMN resolved_utc_offset_seconds,
  DROP COLUMN resolved_local_at,
  DROP COLUMN timezone_name,
  DROP COLUMN timezone_version_id,
  DROP COLUMN attendance_day_id;

ALTER TABLE attendance_days
  DROP COLUMN configuration_snapshot,
  DROP COLUMN calculation_version;

DROP TRIGGER workers_track_shift_assignment ON workers;
DROP TRIGGER shifts_track_configuration ON shifts;
DROP TRIGGER organizations_track_timezone ON organizations;
DROP FUNCTION bss_track_worker_shift_assignment();
DROP FUNCTION bss_track_shift_configuration();
DROP FUNCTION bss_track_organization_timezone();

DROP TABLE worker_shift_assignments;
DROP TABLE shift_configuration_versions;
DROP TABLE organization_timezone_versions;
