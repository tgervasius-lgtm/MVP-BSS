CREATE TABLE terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name varchar(120) NOT NULL,
  location varchar(160) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'revoked')),
  last_seen_at timestamptz,
  queue_depth integer NOT NULL DEFAULT 0 CHECK (queue_depth >= 0),
  clock_offset_seconds integer NOT NULL DEFAULT 0,
  software_version varchar(64),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id)
);

CREATE TABLE terminal_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  terminal_id uuid NOT NULL,
  credential_hash bytea NOT NULL UNIQUE,
  valid_from timestamptz NOT NULL DEFAULT clock_timestamp(),
  valid_to timestamptz,
  revoked_at timestamptz,
  CONSTRAINT credential_terminal_same_tenant
    FOREIGN KEY (organization_id, terminal_id)
    REFERENCES terminals(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  terminal_id uuid NOT NULL,
  worker_id uuid,
  rfid_card_id uuid,
  device_event_id uuid NOT NULL,
  sequence bigint NOT NULL CHECK (sequence > 0),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  event_type varchar(16) NOT NULL CHECK (event_type IN ('check_in', 'check_out')),
  card_uid_hash bytea NOT NULL,
  device_clock_offset_seconds integer NOT NULL DEFAULT 0,
  processing_status varchar(16) NOT NULL CHECK (processing_status IN ('queued', 'accepted', 'rejected')),
  rejection_code varchar(64),
  UNIQUE (organization_id, id),
  UNIQUE (terminal_id, device_event_id),
  CONSTRAINT attendance_event_terminal_same_tenant
    FOREIGN KEY (organization_id, terminal_id)
    REFERENCES terminals(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT attendance_event_worker_same_tenant
    FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT attendance_event_card_same_tenant
    FOREIGN KEY (organization_id, rfid_card_id)
    REFERENCES rfid_cards(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE attendance_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  worker_id uuid NOT NULL,
  work_date date NOT NULL,
  shift_snapshot jsonb NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  break_minutes integer NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  worked_minutes integer NOT NULL DEFAULT 0 CHECK (worked_minutes >= 0),
  planned_minutes integer NOT NULL DEFAULT 0 CHECK (planned_minutes >= 0),
  status varchar(20) NOT NULL CHECK (status IN ('active', 'complete', 'late', 'incomplete', 'corrected')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, worker_id, work_date),
  CONSTRAINT attendance_day_worker_same_tenant
    FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  worker_id uuid NOT NULL,
  leave_type varchar(24) NOT NULL CHECK (leave_type IN ('annual', 'unpaid', 'other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  working_days integer NOT NULL CHECK (working_days >= 0),
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  note text,
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CONSTRAINT leave_worker_same_tenant FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT leave_decider_same_tenant FOREIGN KEY (organization_id, decided_by)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  CHECK (end_date >= start_date)
);

CREATE INDEX leave_requests_worker_dates_idx
  ON leave_requests (organization_id, worker_id, start_date, end_date);

CREATE TABLE correction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  attendance_day_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  before_values jsonb NOT NULL,
  requested_values jsonb NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) >= 3),
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by uuid,
  decision_note text,
  decided_at timestamptz,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CONSTRAINT correction_day_same_tenant FOREIGN KEY (organization_id, attendance_day_id)
    REFERENCES attendance_days(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT correction_requester_same_tenant FOREIGN KEY (organization_id, requested_by)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT correction_decider_same_tenant FOREIGN KEY (organization_id, decided_by)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE attendance_month_locks (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  year integer NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  locked_by uuid NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  dataset_version uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (organization_id, year, month),
  CONSTRAINT month_lock_actor_same_tenant FOREIGN KEY (organization_id, locked_by)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE report_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL,
  filters jsonb NOT NULL,
  format varchar(8) NOT NULL CHECK (format IN ('csv', 'xlsx')),
  status varchar(16) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  dataset_version uuid NOT NULL,
  template_version varchar(40) NOT NULL,
  row_count integer CHECK (row_count >= 0),
  total_minutes bigint,
  storage_key text,
  checksum_sha256 varchar(64),
  expires_at timestamptz,
  failure_code varchar(64),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  UNIQUE (organization_id, id),
  CONSTRAINT report_creator_same_tenant FOREIGN KEY (organization_id, created_by)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  actor_type varchar(16) NOT NULL CHECK (actor_type IN ('user', 'terminal', 'system')),
  actor_id uuid,
  actor_role varchar(20),
  action varchar(80) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  request_id varchar(128) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, id)
);

CREATE INDEX audit_events_lookup_idx
  ON audit_events (organization_id, occurred_at DESC, entity_type, entity_id);

CREATE TRIGGER terminals_touch_updated_at BEFORE UPDATE ON terminals
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
CREATE TRIGGER attendance_days_touch_updated_at BEFORE UPDATE ON attendance_days
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
CREATE TRIGGER leave_requests_touch_updated_at BEFORE UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
CREATE TRIGGER correction_requests_touch_updated_at BEFORE UPDATE ON correction_requests
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
