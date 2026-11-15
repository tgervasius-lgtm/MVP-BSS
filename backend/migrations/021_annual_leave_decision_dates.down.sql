LOCK TABLE annual_leave_decision_dates IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM annual_leave_decision_dates) THEN
    RAISE EXCEPTION 'Preserve confirmed annual leave dates; reviewed forward recovery required';
  END IF;
END $$;
DROP TABLE annual_leave_decision_dates;
