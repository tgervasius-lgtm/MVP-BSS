function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function buildOperationalMetrics({ profile = {}, summary = {}, presentCount } = {}) {
  const employees = boundedInteger(profile.employees, 68, 5, 1000);
  const locations = boundedInteger(profile.locations, 1, 1, 8);
  const shifts = boundedInteger(profile.shifts, 2, 1, 4);
  const planned = boundedInteger(summary.planned, Math.max(1, Math.round(employees * 0.76)), 1, employees);
  const present = boundedInteger(presentCount, Math.max(0, planned - 1), 0, planned);
  const attendanceGap = Math.max(0, planned - present);
  const expectedAbsences = Math.max(1, Math.round(planned * 0.04));
  const absent = Math.min(attendanceGap, expectedAbsences);
  const late = Math.max(0, attendanceGap - absent);

  const teamSize = Math.max(1, Math.min(employees, 40, Math.round(employees * 0.35)));
  const teamLate = teamSize >= 8 ? 1 : 0;
  const teamSick = teamSize >= 4 ? 1 : 0;
  const teamPresent = Math.max(0, teamSize - teamLate - teamSick);

  const monthlyHours = employees * 128;
  const nightRatio = [0, 0, 0.03573, 0.071, 0.095][shifts];
  const overtimeRatio = 0.012 + ((shifts - 1) * 0.00546);
  const nightHours = Math.round(monthlyHours * nightRatio);
  const overtimeHours = Math.round(monthlyHours * overtimeRatio);
  const regularHours = Math.max(0, monthlyHours - nightHours - overtimeHours);

  return Object.freeze({
    employees,
    locations,
    shifts,
    planned,
    present,
    late,
    absent,
    teamSize,
    teamPresent,
    teamLate,
    teamSick,
    monthlyHours,
    regularHours,
    nightHours,
    overtimeHours
  });
}
