-- Additive correction: do not rewrite the already-tested 016 checksum.
-- Admission expires on the DB clock; the parser receives only its remaining
-- budget, while a dedicated backend session holds advisory key (237,1701).
CREATE FUNCTION bss_import_parser_budget(p_token uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE org uuid; budget integer;
BEGIN
  org:=public.bss_current_organization_id();
  IF org IS NULL OR current_setting('bss.actor_role',true) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Import Admin context required' USING ERRCODE='42501';
  END IF;
  SELECT greatest(0,floor(extract(epoch FROM (lease_expires_at-clock_timestamp()))*1000))::integer
    INTO budget FROM public.worker_import_runtime
    WHERE singleton AND lease_token=p_token AND lease_organization_id=org
      AND lease_expires_at>clock_timestamp() FOR UPDATE;
  RETURN coalesce(budget,0);
END $$;
REVOKE ALL ON FUNCTION bss_import_parser_budget(uuid) FROM PUBLIC;
COMMENT ON FUNCTION bss_import_parser_budget(uuid) IS
  'Private Admin/tenant/token fence and remaining admission milliseconds; no runtime grants.';
