// All callers alias the parent request as l and bind the date bounds as $1 and $2.
// Covered reads require a separately reviewed runtime role; default composition does not enable them.
export function approvedLeaveRangesSql(coveredDates: boolean): string {
  if (!coveredDates) {
    return "SELECT l.id, l.start_date, l.end_date, l.working_days";
  }

  return `SELECT l.id, l.start_date, l.end_date, l.working_days
    WHERE l.reservation_submission_key IS NULL
    UNION ALL
    SELECT md5(l.id::text || ':' || to_char(min(d.absence_date), 'YYYY-MM-DD'))::uuid,
      GREATEST(min(d.absence_date), $1::date),
      LEAST(max(d.absence_date), $2::date),
      (LEAST(max(d.absence_date), $2::date) - GREATEST(min(d.absence_date), $1::date) + 1)::integer
    FROM (
      SELECT absence_date, absence_date - (row_number() OVER (ORDER BY absence_date))::integer AS group_start
      FROM annual_leave_decision_dates
      WHERE organization_id = l.organization_id AND request_id = l.id AND approved_revision IS NOT NULL
    ) d
    WHERE l.reservation_submission_key IS NOT NULL
    GROUP BY d.group_start
    HAVING min(d.absence_date) <= $2::date AND max(d.absence_date) >= $1::date`;
}

export function leaveBalanceWorkingDaysSql(coveredDates: boolean): string {
  const legacy = `SELECT COUNT(*)::integer
    FROM generate_series(
      GREATEST(l.start_date, make_date($1, 1, 1))::timestamp,
      LEAST(l.end_date, make_date($1, 12, 31))::timestamp,
      interval '1 day'
    ) AS day(value)
    WHERE EXTRACT(ISODOW FROM day.value) < 6
      AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = day.value::date)`;
  if (!coveredDates) return `SELECT (${legacy}) AS working_days`;

  return `SELECT CASE
    WHEN l.reservation_submission_key IS NULL THEN (${legacy})
    WHEN l.status = 'pending' THEN COALESCE((
      SELECT reserved_days FROM annual_leave_reservations
      WHERE organization_id = l.organization_id AND request_id = l.id AND calendar_year = $1
    ), 0)
    WHEN l.status = 'approved' THEN (
      SELECT COUNT(*)::integer FROM annual_leave_decision_dates
      WHERE organization_id = l.organization_id AND request_id = l.id AND approved_revision IS NOT NULL
        AND absence_date BETWEEN make_date($1, 1, 1) AND make_date($1, 12, 31)
    )
    ELSE 0
  END AS working_days`;
}
