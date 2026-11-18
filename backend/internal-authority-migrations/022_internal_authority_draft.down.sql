-- Preserve private identity, session, confirmation and decision history once populated.
LOCK TABLE bss_internal.people, bss_internal.identities, bss_internal.sessions,
  bss_internal.targets, bss_internal.grants, bss_internal.operations, bss_internal.flows,
  bss_internal.receipts, bss_internal.audit IN ACCESS EXCLUSIVE MODE;
DO $$ DECLARE relation text; populated boolean; BEGIN
  FOREACH relation IN ARRAY ARRAY['people','identities','sessions','targets','grants','operations','flows','receipts','audit'] LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM bss_internal.%I)',relation) INTO populated;
    IF populated THEN RAISE EXCEPTION 'Preserve internal authority history; reviewed forward recovery required'; END IF;
  END LOOP;
END $$;
DROP SCHEMA bss_internal CASCADE;
