-- DRAFT ONLY. Pre-create a dedicated LOGIN role through an approved admin process.
-- This file never changes role attributes or removes somebody else's permissions.
\set ON_ERROR_STOP on
\set ON_ERROR_ROLLBACK off
\if :{?internal_role}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Missing internal_role'; END $$;
\endif
BEGIN;
SELECT set_config('bss.internal_bootstrap_role', :'internal_role', true);
DO $$
DECLARE
  actor oid;
  target record;
  col record;
  permission text;
  table_allowed boolean;
  column_allowed boolean;
  update_columns text[];
  expected text[] := ARRAY['people','identities','sessions','targets','grants','operations','flows','receipts','audit'];
BEGIN
  SELECT oid INTO actor FROM pg_roles WHERE rolname=current_setting('bss.internal_bootstrap_role');
  IF actor IS NULL OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE oid=actor AND rolcanlogin
      AND NOT (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) THEN
    RAISE EXCEPTION 'Internal runtime needs pre-approved safe LOGIN attributes' USING ERRCODE='42501';
  END IF;
  -- Reject both inheritance and SET ROLE paths, including membership into this role.
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member=actor OR roleid=actor) THEN
    RAISE EXCEPTION 'Internal runtime must have no role memberships' USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_database WHERE datname=current_database() AND datdba=actor)
      OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner=actor)
      OR EXISTS (SELECT 1 FROM pg_class WHERE relowner=actor)
      OR EXISTS (SELECT 1 FROM pg_proc WHERE proowner=actor)
      OR EXISTS (SELECT 1 FROM pg_type WHERE typowner=actor) THEN
    RAISE EXCEPTION 'Internal runtime must not own database objects' USING ERRCODE='42501';
  END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='bss_internal' AND c.relname=ANY(expected) AND c.relkind='r') <> 9 THEN
    RAISE EXCEPTION 'Complete internal draft schema is required';
  END IF;
  -- The caller must be the approved object owner (or inherit that ownership), not the runtime.
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='bss_internal' AND c.relname=ANY(expected) AND NOT pg_has_role(current_user,c.relowner,'USAGE'))
      OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='bss_internal' AND NOT pg_has_role(current_user,nspowner,'USAGE')) THEN
    RAISE EXCEPTION 'Apply internal grants through the approved registry owner' USING ERRCODE='42501';
  END IF;
  IF has_schema_privilege(actor,'bss_internal','CREATE')
      OR has_schema_privilege(actor,'bss_internal','USAGE WITH GRANT OPTION') THEN
    RAISE EXCEPTION 'Unexpected internal schema privileges' USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='bss_internal' AND p.prosecdef AND has_function_privilege(actor,p.oid,'EXECUTE'))
      OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='bss_internal' AND CASE WHEN c.relkind='S' THEN has_sequence_privilege(actor,c.oid,'USAGE,SELECT,UPDATE') ELSE false END) THEN
    RAISE EXCEPTION 'Unexpected internal function or sequence privileges' USING ERRCODE='42501';
  END IF;
  FOR target IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='bss_internal' AND c.relkind IN ('r','p','v','m','f') LOOP
    update_columns := CASE
      WHEN target.relname IN ('people','identities','sessions','targets','grants') THEN ARRAY['lock_marker']
      WHEN target.relname='operations' THEN ARRAY['proof_authenticated_at','proof_expires_at','used']
      WHEN target.relname='flows' THEN ARRAY['used','verifier_ciphertext','verifier_iv','verifier_tag']
      ELSE ARRAY[]::text[] END;
    FOREACH permission IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      table_allowed := (permission='SELECT' AND target.relname=ANY(expected) AND target.relname<>'audit')
        OR (permission='INSERT' AND target.relname IN ('sessions','operations','flows','receipts','audit'));
      IF (NOT table_allowed AND has_table_privilege(actor,target.oid,permission))
          OR has_table_privilege(actor,target.oid,permission||' WITH GRANT OPTION') THEN
        RAISE EXCEPTION 'Unexpected internal table privileges: %.%', target.relname,permission USING ERRCODE='42501';
      END IF;
    END LOOP;
    FOR col IN SELECT attnum,attname FROM pg_attribute WHERE attrelid=target.oid AND attnum>0 AND NOT attisdropped LOOP
      FOREACH permission IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
        column_allowed := (permission='SELECT' AND target.relname=ANY(expected) AND target.relname<>'audit')
          OR (permission='INSERT' AND target.relname IN ('sessions','operations','flows','receipts','audit'))
          OR (permission='UPDATE' AND col.attname=ANY(update_columns));
        IF (NOT column_allowed AND has_column_privilege(actor,target.oid,col.attnum,permission))
            OR has_column_privilege(actor,target.oid,col.attnum,permission||' WITH GRANT OPTION') THEN
          RAISE EXCEPTION 'Unexpected internal column privileges: %.% %', target.relname,col.attname,permission USING ERRCODE='42501';
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA bss_internal TO :"internal_role";
GRANT SELECT ON bss_internal.people,bss_internal.identities,bss_internal.sessions,
  bss_internal.targets,bss_internal.grants,bss_internal.operations,bss_internal.flows,
  bss_internal.receipts TO :"internal_role";
GRANT INSERT ON bss_internal.sessions,bss_internal.operations,bss_internal.flows,
  bss_internal.receipts,bss_internal.audit TO :"internal_role";
GRANT UPDATE(lock_marker) ON bss_internal.people,bss_internal.identities,bss_internal.sessions,
  bss_internal.targets,bss_internal.grants TO :"internal_role";
GRANT UPDATE(proof_authenticated_at,proof_expires_at,used)
  ON bss_internal.operations TO :"internal_role";
GRANT UPDATE(used,verifier_ciphertext,verifier_iv,verifier_tag)
  ON bss_internal.flows TO :"internal_role";
-- GRANT can warn rather than error for insufficient grant options. Check completeness before commit.
DO $$
DECLARE actor oid; target text; col text;
BEGIN
  SELECT oid INTO actor FROM pg_roles WHERE rolname=current_setting('bss.internal_bootstrap_role');
  IF NOT has_schema_privilege(actor,'bss_internal','USAGE') THEN RAISE EXCEPTION 'Incomplete internal schema grant'; END IF;
  FOREACH target IN ARRAY ARRAY['people','identities','sessions','targets','grants','operations','flows','receipts'] LOOP
    IF NOT has_table_privilege(actor,'bss_internal.'||target,'SELECT') THEN RAISE EXCEPTION 'Incomplete internal SELECT grant'; END IF;
  END LOOP;
  FOREACH target IN ARRAY ARRAY['sessions','operations','flows','receipts','audit'] LOOP
    IF NOT has_table_privilege(actor,'bss_internal.'||target,'INSERT') THEN RAISE EXCEPTION 'Incomplete internal INSERT grant'; END IF;
  END LOOP;
  FOREACH target IN ARRAY ARRAY['people','identities','sessions','targets','grants'] LOOP
    IF NOT has_column_privilege(actor,'bss_internal.'||target,'lock_marker','UPDATE') THEN RAISE EXCEPTION 'Incomplete internal lock grant'; END IF;
  END LOOP;
  FOREACH col IN ARRAY ARRAY['proof_authenticated_at','proof_expires_at','used'] LOOP
    IF NOT has_column_privilege(actor,'bss_internal.operations',col,'UPDATE') THEN RAISE EXCEPTION 'Incomplete internal proof grant'; END IF;
  END LOOP;
  FOREACH col IN ARRAY ARRAY['used','verifier_ciphertext','verifier_iv','verifier_tag'] LOOP
    IF NOT has_column_privilege(actor,'bss_internal.flows',col,'UPDATE') THEN RAISE EXCEPTION 'Incomplete internal flow grant'; END IF;
  END LOOP;
END $$;
COMMIT;
