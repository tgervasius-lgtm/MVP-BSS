LOCK TABLE public.annual_leave_exception_proposals, public.annual_leave_exception_confirmations IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid IN ('public.annual_leave_exception_proposals'::regclass, 'public.annual_leave_exception_confirmations'::regclass)
      AND current_user <> pg_get_userbyid(relowner)
  ) THEN
    RAISE EXCEPTION 'Only the exact migration owner may roll back exception proposal storage' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.annual_leave_exception_proposals)
    OR EXISTS (SELECT 1 FROM public.annual_leave_exception_confirmations) THEN
    RAISE EXCEPTION 'Exception proposal history exists. Reconcile request revisions and preserve history before rollback';
  END IF;
END $$;

DROP TABLE public.annual_leave_exception_confirmations, public.annual_leave_exception_proposals;
