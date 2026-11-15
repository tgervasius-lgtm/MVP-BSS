DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM annual_leave_reservations) THEN
    RAISE EXCEPTION 'Preserve annual leave reservation history; reviewed forward recovery required';
  END IF;
END $$;

DROP TABLE annual_leave_reservations;
DROP INDEX leave_reservation_submission_unique;
ALTER TABLE leave_requests
  DROP CONSTRAINT leave_reservation_submission_complete,
  DROP CONSTRAINT leave_reservation_submitter_same_tenant,
  DROP COLUMN reservation_submission_hash,
  DROP COLUMN reservation_submission_key,
  DROP COLUMN reservation_submitted_by;
