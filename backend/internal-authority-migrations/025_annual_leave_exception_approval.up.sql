-- Explicit opt-in after 024 alongside typed readers. Standard runtime grants stay withheld.
ALTER TABLE public.annual_leave_decision_dates DROP CONSTRAINT annual_leave_decision_dates_absence_type_check;
ALTER TABLE public.annual_leave_decision_dates ADD CONSTRAINT annual_leave_decision_dates_absence_type_check
  CHECK (absence_type = 'annual_leave' OR (approved_revision IS NOT NULL AND absence_type IN ('paid_leave', 'unpaid_leave', 'free_day')));
