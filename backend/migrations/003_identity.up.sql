CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  email varchar(320) NOT NULL,
  password_hash text,
  role varchar(20) NOT NULL CHECK (role IN ('admin', 'manager', 'worker', 'accountant')),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  worker_id uuid,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  password_changed_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CONSTRAINT users_worker_same_tenant
    FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT,
  CHECK ((role = 'worker' AND worker_id IS NOT NULL) OR role <> 'worker')
);

-- The frozen login contract has no tenant selector. MVP therefore requires one
-- globally unique normalized login email. Multi-organization identities are a v2 concern.
CREATE UNIQUE INDEX users_login_email_unique ON users (lower(email));

CREATE TABLE user_department_scopes (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  department_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (organization_id, user_id, department_id),
  CONSTRAINT user_scope_user_same_tenant
    FOREIGN KEY (organization_id, user_id)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT user_scope_department_same_tenant
    FOREIGN KEY (organization_id, department_id)
    REFERENCES departments(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  email varchar(320) NOT NULL,
  role varchar(20) NOT NULL CHECK (role IN ('admin', 'manager', 'worker', 'accountant')),
  worker_id uuid,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CONSTRAINT invitation_worker_same_tenant
    FOREIGN KEY (organization_id, worker_id)
    REFERENCES workers(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT invitation_actor_same_tenant
    FOREIGN KEY (organization_id, invited_by)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX pending_invitation_email_unique
  ON user_invitations (organization_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  access_token_hash bytea NOT NULL UNIQUE,
  refresh_token_hash bytea NOT NULL UNIQUE,
  access_expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  rotated_from_id uuid REFERENCES auth_sessions(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoke_reason varchar(80),
  ip_hash bytea,
  user_agent_hash bytea,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CONSTRAINT session_user_same_tenant
    FOREIGN KEY (organization_id, user_id)
    REFERENCES users(organization_id, id) ON DELETE RESTRICT,
  CHECK (refresh_expires_at > access_expires_at)
);

CREATE INDEX auth_sessions_user_active_idx
  ON auth_sessions (organization_id, user_id, refresh_expires_at)
  WHERE revoked_at IS NULL;

CREATE TRIGGER users_touch_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
