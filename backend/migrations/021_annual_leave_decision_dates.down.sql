LOCK TABLE annual_leave_decision_dates IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  -- FORCE RLS can hide rows from a role that only inherits ownership.
  -- The migration_owner_read policy guarantees full visibility for the exact owner.
  IF current_user <> pg_get_userbyid((SELECT relowner FROM pg_class
    WHERE oid = 'public.annual_leave_decision_dates'::regclass)) THEN
    RAISE EXCEPTION 'Exact annual leave decision table owner required for rollback'
      USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM annual_leave_decision_dates) THEN
    RAISE EXCEPTION 'Preserve confirmed annual leave dates; reviewed forward recovery required';
  END IF;
END $$;
DROP TABLE annual_leave_decision_dates;
