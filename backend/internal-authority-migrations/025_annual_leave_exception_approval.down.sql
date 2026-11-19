LOCK TABLE public.annual_leave_decision_dates IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF current_user <> pg_get_userbyid((SELECT relowner FROM pg_class
    WHERE oid = 'public.annual_leave_decision_dates'::regclass)) THEN
    RAISE EXCEPTION 'Exact annual leave decision table owner required for rollback' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.annual_leave_decision_dates WHERE absence_type <> 'annual_leave') THEN
    RAISE EXCEPTION 'Preserve approved mixed leave dates and reconcile historical balances before rollback';
  END IF;
END $$;
ALTER TABLE public.annual_leave_decision_dates DROP CONSTRAINT annual_leave_decision_dates_absence_type_check;
ALTER TABLE public.annual_leave_decision_dates ADD CONSTRAINT annual_leave_decision_dates_absence_type_check
  CHECK (absence_type = 'annual_leave');
