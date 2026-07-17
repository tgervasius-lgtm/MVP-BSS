CREATE INDEX terminal_request_nonces_expiry_idx
  ON terminal_request_nonces (organization_id, expires_at);
CREATE INDEX auth_sessions_revoked_idx
  ON auth_sessions (organization_id, revoked_at)
  WHERE revoked_at IS NOT NULL;
CREATE INDEX report_exports_expiry_idx
  ON report_exports (organization_id, expires_at)
  WHERE content IS NOT NULL;

CREATE INDEX attendance_days_timeline_idx
  ON attendance_days (organization_id, work_date DESC, id DESC);
CREATE INDEX leave_requests_timeline_idx
  ON leave_requests (organization_id, created_at DESC, id DESC);
CREATE INDEX correction_requests_timeline_idx
  ON correction_requests (organization_id, created_at DESC, id DESC);
CREATE INDEX audit_events_timeline_idx
  ON audit_events (organization_id, occurred_at DESC, id DESC);

-- Normalize safe legacy identity data before adding stricter invariants. Ambiguous
-- duplicates are never guessed or silently deleted: the migration fails with an
-- actionable error so an operator can reconcile them first.
UPDATE users SET worker_id = NULL WHERE role <> 'worker' AND worker_id IS NOT NULL;
UPDATE user_invitations SET worker_id = NULL WHERE role <> 'worker' AND worker_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users GROUP BY lower(btrim(email)) HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate normalized user e-mail must be reconciled before migration 008' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (
    SELECT 1 FROM workers WHERE email IS NOT NULL AND btrim(email) <> ''
    GROUP BY organization_id, lower(btrim(email)) HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate normalized worker e-mail must be reconciled before migration 008' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (
    SELECT 1 FROM user_invitations WHERE accepted_at IS NULL AND revoked_at IS NULL
    GROUP BY organization_id, lower(btrim(email)) HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate pending invitation e-mail must be reconciled before migration 008' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (
    SELECT 1 FROM rfid_cards WHERE status = 'active'
    GROUP BY organization_id, worker_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple active RFID cards for one worker must be reconciled before migration 008' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (
    SELECT 1 FROM users WHERE worker_id IS NOT NULL
    GROUP BY organization_id, worker_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple user accounts linked to one worker must be reconciled before migration 008' USING ERRCODE = '23505';
  END IF;
END;
$$;

UPDATE users SET email = lower(btrim(email)) WHERE email IS DISTINCT FROM lower(btrim(email));
UPDATE user_invitations SET email = lower(btrim(email)) WHERE email IS DISTINCT FROM lower(btrim(email));
UPDATE workers SET email = CASE WHEN btrim(email) = '' THEN NULL ELSE lower(btrim(email)) END
WHERE email IS NOT NULL AND email IS DISTINCT FROM CASE WHEN btrim(email) = '' THEN NULL ELSE lower(btrim(email)) END;

CREATE UNIQUE INDEX rfid_cards_active_worker_unique
  ON rfid_cards (organization_id, worker_id)
  WHERE status = 'active';
CREATE UNIQUE INDEX workers_email_unique
  ON workers (organization_id, lower(email))
  WHERE email IS NOT NULL;
CREATE UNIQUE INDEX users_worker_unique
  ON users (organization_id, worker_id)
  WHERE worker_id IS NOT NULL;

ALTER TABLE terminals
  ADD CONSTRAINT terminals_name_not_blank CHECK (length(btrim(name)) >= 2),
  ADD CONSTRAINT terminals_location_not_blank CHECK (length(btrim(location)) >= 2);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_check,
  ADD CONSTRAINT users_email_not_blank CHECK (length(btrim(email)) >= 3),
  ADD CONSTRAINT users_worker_role_consistency
    CHECK ((role = 'worker') = (worker_id IS NOT NULL));

ALTER TABLE workers
  ADD CONSTRAINT workers_email_not_blank CHECK (email IS NULL OR length(btrim(email)) >= 3);

ALTER TABLE user_invitations
  ADD CONSTRAINT invitations_email_not_blank CHECK (length(btrim(email)) >= 3),
  ADD CONSTRAINT invitations_worker_role_consistency
    CHECK ((role = 'worker') = (worker_id IS NOT NULL));

ALTER TABLE attendance_days
  ADD CONSTRAINT attendance_days_time_order
    CHECK (check_out IS NULL OR (check_in IS NOT NULL AND check_out > check_in AND check_out <= check_in + interval '16 hours')),
  ADD CONSTRAINT attendance_days_minute_bounds
    CHECK (break_minutes <= 960 AND worked_minutes <= 960 AND planned_minutes <= 960);

ALTER TABLE shifts
  ADD CONSTRAINT shifts_duration_bounds CHECK (
    (CASE
      WHEN end_time > start_time THEN EXTRACT(EPOCH FROM (end_time - start_time))
      ELSE EXTRACT(EPOCH FROM (end_time - start_time)) + 86400
    END) > break_minutes * 60
    AND (CASE
      WHEN end_time > start_time THEN EXTRACT(EPOCH FROM (end_time - start_time))
      ELSE EXTRACT(EPOCH FROM (end_time - start_time)) + 86400
    END) <= 57600
  );

ALTER TABLE attendance_events
  ADD CONSTRAINT attendance_events_clock_offset_bounds
    CHECK (device_clock_offset_seconds BETWEEN -86400 AND 86400);

ALTER TABLE terminals
  ADD CONSTRAINT terminals_clock_offset_bounds
    CHECK (clock_offset_seconds BETWEEN -86400 AND 86400);

ALTER TABLE terminal_credentials
  ADD CONSTRAINT terminal_credentials_validity_order
    CHECK (valid_to IS NULL OR valid_to >= valid_from);
