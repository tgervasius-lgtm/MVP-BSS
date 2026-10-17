-- Existing production down-migration prohibition also remains in migrate.ts.
-- Do not destroy durable onboarding identities, submitted evidence or decisions.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM onboarding_sessions) OR EXISTS(SELECT 1 FROM onboarding_evidence)
     OR EXISTS(SELECT 1 FROM onboarding_evaluations) THEN
    RAISE EXCEPTION 'Preserve onboarding evidence; reviewed forward recovery required';
  END IF;
END $$;
DROP TABLE onboarding_evaluations;
DROP TABLE onboarding_evidence;
DROP TABLE onboarding_sessions;
DROP FUNCTION bss_bound_onboarding_evidence();
DROP FUNCTION bss_protect_onboarding_session();
