DROP TRIGGER workers_track_department_assignment ON workers;
DROP FUNCTION bss_track_worker_department_assignment();

DROP INDEX terminal_sync_events_department_timeline_idx;
DROP INDEX attendance_events_department_occurred_idx;

ALTER TABLE terminal_sync_events
  DROP CONSTRAINT sync_event_department_same_tenant,
  DROP COLUMN effective_department_id;
ALTER TABLE attendance_events
  DROP CONSTRAINT attendance_event_department_same_tenant,
  DROP COLUMN effective_department_id;

DROP TABLE worker_department_assignments;
