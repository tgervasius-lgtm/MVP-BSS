CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL CHECK (length(btrim(name)) >= 2),
  tax_identifier varchar(32),
  timezone varchar(64) NOT NULL DEFAULT 'Europe/Zagreb',
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX organizations_tax_identifier_unique
  ON organizations (tax_identifier)
  WHERE tax_identifier IS NOT NULL;

CREATE FUNCTION bss_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_touch_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION bss_touch_updated_at();
