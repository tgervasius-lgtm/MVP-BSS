-- Inactive H2 runtime primitives. No runtime grants, roles or external scheduler.
CREATE INDEX worker_import_global_expiry_idx ON worker_import_sessions(expires_at)
  WHERE state IN ('PARSING','NEEDS_MAPPING','READY','INVALID');
CREATE INDEX worker_import_global_parse_expiry_idx ON worker_import_sessions(parse_expires_at)
  WHERE state='PARSING';
CREATE TABLE worker_import_runtime (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  lease_token uuid, lease_organization_id uuid, lease_expires_at timestamptz,
  cleaned_at timestamptz,
  CHECK ((lease_token IS NULL AND lease_organization_id IS NULL AND lease_expires_at IS NULL)
    OR (lease_token IS NOT NULL AND lease_organization_id IS NOT NULL AND lease_expires_at IS NOT NULL))
);
INSERT INTO worker_import_runtime(singleton) VALUES(true);
CREATE TABLE worker_import_attempts (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  operation text NOT NULL CHECK(operation IN ('create','commit')),
  attempts timestamptz[] NOT NULL CHECK(cardinality(attempts) BETWEEN 1 AND 10),
  last_attempt_at timestamptz NOT NULL,
  PRIMARY KEY(organization_id,operation)
);
ALTER TABLE worker_import_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_import_runtime FORCE ROW LEVEL SECURITY;
ALTER TABLE worker_import_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_import_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY admin_tenant_isolation ON worker_import_attempts
  USING(organization_id=bss_current_organization_id() AND current_setting('bss.actor_role',true)='admin')
  WITH CHECK(organization_id=bss_current_organization_id() AND current_setting('bss.actor_role',true)='admin');
-- Definer-owned, narrow functions need cross-tenant cleanup, not a BYPASSRLS app.
-- The policy is assigned only to the migration/function owner, never PUBLIC.
DO $$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['worker_import_runtime','worker_import_attempts',
    'worker_import_sessions','worker_import_staging'] LOOP
    EXECUTE format('CREATE POLICY import_maintenance_owner ON %I TO %I USING(true) WITH CHECK(true)',relation,current_user);
  END LOOP;
  EXECUTE format('CREATE POLICY import_cleanup_audit ON audit_events FOR INSERT TO %I
    WITH CHECK(actor_type=''system'' AND actor_id IS NULL AND actor_role IS NULL
      AND action IN (''worker_import.expired'',''worker_import.failed'')
      AND entity_type=''worker_import'')',current_user);
END $$;

CREATE FUNCTION bss_import_healthy() RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
  SELECT COALESCE((SELECT cleaned_at > clock_timestamp()-interval '5 minutes'
    FROM public.worker_import_runtime WHERE singleton),false)
    AND NOT EXISTS(SELECT 1 FROM public.worker_import_sessions
      WHERE state IN ('PARSING','NEEDS_MAPPING','READY','INVALID')
        AND LEAST(expires_at,COALESCE(parse_expires_at,expires_at)) <= clock_timestamp()-interval '5 minutes');
$$;

CREATE FUNCTION bss_import_admit(p_operation text,p_token uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE org uuid; recent timestamptz[]; instant timestamptz; acquired uuid;
BEGIN
  org:=public.bss_current_organization_id();
  IF org IS NULL OR current_setting('bss.actor_role',true) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Import Admin context required' USING ERRCODE='42501';
  END IF;
  IF p_operation NOT IN ('create','commit') OR p_operation IS NULL OR p_token IS NULL THEN
    RAISE EXCEPTION 'Invalid import admission' USING ERRCODE='22023';
  END IF;
  -- Serialize each tenant/operation independently, including first-ever attempt.
  PERFORM pg_advisory_xact_lock(hashtextextended(org::text||':'||p_operation,23716));
  instant:=clock_timestamp();
  SELECT COALESCE(array_agg(v ORDER BY v),'{}'::timestamptz[]) INTO recent
    FROM public.worker_import_attempts a CROSS JOIN LATERAL unnest(a.attempts) v
    WHERE a.organization_id=org AND a.operation=p_operation AND v > instant-interval '1 minute';
  IF cardinality(recent)>=10 THEN RETURN 'RATE_LIMITED'; END IF;
  INSERT INTO public.worker_import_attempts(organization_id,operation,attempts,last_attempt_at)
    VALUES(org,p_operation,array_append(recent,instant),instant)
    ON CONFLICT(organization_id,operation) DO UPDATE SET attempts=EXCLUDED.attempts,last_attempt_at=EXCLUDED.last_attempt_at;
  -- Refused health/busy requests still consume a durable attempt.
  IF NOT public.bss_import_healthy() THEN RETURN 'UNAVAILABLE'; END IF;
  IF p_operation='commit' THEN RETURN 'ADMITTED'; END IF;
  UPDATE public.worker_import_runtime SET lease_token=p_token,lease_organization_id=org,
    lease_expires_at=clock_timestamp()+interval '20 seconds'
    WHERE singleton AND (lease_token IS NULL OR lease_expires_at<=clock_timestamp())
    RETURNING lease_token INTO acquired;
  IF acquired IS NULL THEN RETURN 'BUSY'; END IF;
  RETURN 'ADMITTED';
END $$;

CREATE FUNCTION bss_import_lease(p_token uuid,p_action text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE org uuid; found_token uuid;
BEGIN
  org:=public.bss_current_organization_id();
  IF org IS NULL OR current_setting('bss.actor_role',true) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Import Admin context required' USING ERRCODE='42501';
  END IF;
  IF p_action='fence' THEN
    SELECT lease_token INTO found_token FROM public.worker_import_runtime
      WHERE singleton AND lease_token=p_token AND lease_organization_id=org
        AND lease_expires_at>clock_timestamp() FOR UPDATE;
  ELSIF p_action='release' THEN
    UPDATE public.worker_import_runtime SET lease_token=NULL,lease_organization_id=NULL,lease_expires_at=NULL
      WHERE singleton AND lease_token=p_token AND lease_organization_id=org RETURNING p_token INTO found_token;
  ELSE RAISE EXCEPTION 'Invalid lease action' USING ERRCODE='22023';
  END IF;
  RETURN found_token IS NOT NULL;
END $$;

CREATE FUNCTION bss_import_cleanup() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE changed integer;
BEGIN
  -- Bounded atomic batches; do not wait behind a live commit or another janitor.
  PERFORM 1 FROM public.worker_import_runtime WHERE singleton FOR UPDATE;
  WITH due AS MATERIALIZED (
    SELECT id FROM public.worker_import_sessions WHERE state IN ('PARSING','NEEDS_MAPPING','READY','INVALID')
      AND (expires_at<=clock_timestamp() OR parse_expires_at<=clock_timestamp())
      ORDER BY LEAST(expires_at,COALESCE(parse_expires_at,expires_at)),id LIMIT 100 FOR UPDATE SKIP LOCKED
  ), ended AS (
    UPDATE public.worker_import_sessions s SET
      state=CASE WHEN expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE 'FAILED' END,
      revision=revision+1,terminal_at=clock_timestamp(),preview_checksum=NULL,parse_lease=NULL,parse_expires_at=NULL
      FROM due WHERE s.id=due.id RETURNING s.id,s.organization_id,s.state,s.total
  ), purged AS (
    DELETE FROM public.worker_import_staging s USING ended WHERE s.session_id=ended.id
  )
  INSERT INTO public.audit_events(organization_id,actor_type,actor_id,actor_role,action,entity_type,entity_id,
    after_json,request_id,metadata)
    SELECT organization_id,'system',NULL,NULL,'worker_import.'||lower(state),'worker_import',id,
      jsonb_build_object('total',total),'import-cleanup','{}'::jsonb FROM ended;
  GET DIAGNOSTICS changed=ROW_COUNT;
  DELETE FROM public.worker_import_sessions WHERE id IN (
    SELECT id FROM public.worker_import_sessions
      WHERE state IN ('FAILED','CANCELLED','EXPIRED') AND terminal_at<=clock_timestamp()-interval '30 days'
      ORDER BY terminal_at,id LIMIT 100 FOR UPDATE SKIP LOCKED);
  DELETE FROM public.worker_import_attempts WHERE (organization_id,operation) IN (
    SELECT organization_id,operation FROM public.worker_import_attempts
      WHERE last_attempt_at<=clock_timestamp()-interval '1 minute' LIMIT 100 FOR UPDATE SKIP LOCKED);
  UPDATE public.worker_import_runtime SET cleaned_at=clock_timestamp() WHERE singleton;
  RETURN changed;
END $$;
REVOKE ALL ON worker_import_runtime,worker_import_attempts FROM PUBLIC;
REVOKE ALL ON FUNCTION bss_import_healthy(),bss_import_admit(text,uuid),
  bss_import_lease(uuid,text),bss_import_cleanup() FROM PUBLIC;
COMMENT ON TABLE worker_import_runtime IS 'Private deployment-wide admission fence and cleanup heartbeat; no uploaded values.';
