LOCK TABLE public.annual_leave_exception_grants, bss_internal.grants IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.annual_leave_exception_grants) THEN
    RAISE EXCEPTION 'Annual leave exception grant history requires forward recovery';
  END IF;
END $$;
ALTER TABLE bss_internal.grants DROP CONSTRAINT grants_action_check;
ALTER TABLE bss_internal.grants ADD CONSTRAINT grants_action_check
  CHECK (action IN ('PROVISION_TENANT','VERIFY_ONBOARDING','APPROVE_GO_LIVE'));
DROP TABLE public.annual_leave_exception_grants;
