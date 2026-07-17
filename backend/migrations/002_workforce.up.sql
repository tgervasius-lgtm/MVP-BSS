CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name varchar(120) NOT NULL CHECK (length(btrim(name)) >= 2),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id)
);

CREATE UNIQUE INDEX departments_name_unique
  ON departments (organization_id, lower(name));

CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name varchar(100) NOT NULL CHECK (length(btrim(name)) >= 2),
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes integer NOT NULL CHECK (break_minutes BETWEEN 0 AND 960),
  tolerance_minutes integer NOT NULL CHECK (tolerance_minutes BETWEEN 0 AND 240),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id)
);

CREATE UNIQUE INDEX shifts_name_unique ON shifts (organization_id, lower(name));

CREATE TABLE workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  code varchar(40) NOT NULL CHECK (length(btrim(code)) >= 1),
  name varchar(160) NOT NULL CHECK (length(btrim(name)) >= 2),
  email varchar(320),
  department_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  annual_leave_allowance integer NOT NULL DEFAULT 20 CHECK (annual_leave_allowance BETWEEN 0 AND 366),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CONSTRAINT workers_department_same_tenant
    FOREIGN KEY (organization_id, department_id)
    REFERENCES departments(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT workers_shift_same_tenant
    FOREIGN KEY (organization_id, shift_id)
    REFERENCES shifts(organization_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX workers_code_unique ON workers (organization_id, lower(code));
CREATE INDEX workers_department_idx ON workers (organization_id, department_id, status);
CREATE INDEX workers_shift_idx ON workers (organization_id, shift_id, status);

CREATE TABLE holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  holiday_date date NOT NULL,
  name varchar(120) NOT NULL CHECK (length(btrim(name)) >= 2),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, holiday_date)
);

CREATE TABLE rfid_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  worker_id uuid NOT NULL,
  uid_hash bytea NOT NULL,
  masked_uid varchar(32) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  valid_from timestamptz NOT NULL DEFAULT clock_timestamp(),
  valid_to timestamptz,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CONSTRAINT rfid_worker_same_tenant
    FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT,
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE UNIQUE INDEX rfid_cards_active_uid_unique
  ON rfid_cards (organization_id, uid_hash)
  WHERE status = 'active' AND valid_to IS NULL;

CREATE TRIGGER departments_touch_updated_at BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
CREATE TRIGGER shifts_touch_updated_at BEFORE UPDATE ON shifts
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
CREATE TRIGGER workers_touch_updated_at BEFORE UPDATE ON workers
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
CREATE TRIGGER holidays_touch_updated_at BEFORE UPDATE ON holidays
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
CREATE TRIGGER rfid_cards_touch_updated_at BEFORE UPDATE ON rfid_cards
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
