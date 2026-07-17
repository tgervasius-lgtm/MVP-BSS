import type { ActorContext, EntityStatus, Page, Role, SessionContext } from "../domain/types.js";

export type AuthTokens = Readonly<{ accessToken: string; refreshToken: string }>;
export type AuthResult = Readonly<{ context: SessionContext; actor: ActorContext; tokens: AuthTokens }>;
export type RequestMetadata = Readonly<{ requestId: string; ip?: string; userAgent?: string }>;

export interface AuthService {
  login(email: string, password: string, metadata: RequestMetadata): Promise<AuthResult>;
  acceptInvitation(token: string, password: string, metadata: RequestMetadata): Promise<AuthResult>;
  resolveAccessToken(token: string): Promise<{ context: SessionContext; actor: ActorContext }>;
  rotate(refreshToken: string, metadata: RequestMetadata): Promise<AuthTokens>;
  logout(actor: ActorContext, requestId: string): Promise<void>;
}

export type OrganizationView = {
  id: string;
  name: string;
  taxIdentifier?: string;
  timezone: string;
  approvedLeaveVisibility: "team" | "department" | "organization";
  revision: string;
};

export type DepartmentView = { id: string; name: string; status: EntityStatus; revision: string };
export type ShiftView = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  toleranceMinutes: number;
  assignedWorkerCount: number;
  revision: string;
};
export type WorkerView = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  departmentId: string;
  shiftId: string;
  status: EntityStatus;
  annualLeaveAllowance: number;
  revision: string;
};
export type UserView = {
  id: string;
  email: string;
  role: Role;
  status: EntityStatus;
  workerId: string | null;
  departmentIds: string[];
  revision: string;
};
export type UserInvitationView = UserView & {
  invitationUrl: string;
  expiresAt: string;
};
export type HolidayView = { id: string; date: string; name: string; revision: string };
export type HolidayCalendarView = { items: HolidayView[]; revision: string };
export type RfidCardView = {
  id: string;
  maskedUid: string;
  workerId: string;
  status: EntityStatus;
  validFrom: string;
  validTo: string | null;
  revision: string;
};
export type LeaveBalanceView = {
  workerId: string;
  year: number;
  allowanceDays: number;
  carriedOverDays: number;
  approvedDays: number;
  plannedDays: number;
  remainingDays: number;
  availableDays: number;
  revision: string;
};
export type DashboardSummaryView = {
  date: string;
  role: Role;
  kpis: Array<{
    id: "present" | "absent_today" | "review_required" | "pending_decision" | "worked_minutes" | "balance_minutes" | "available_leave";
    value: number;
    targetScreen: "attendance" | "requests" | "corrections" | "reports" | "mytime" | "vacations";
    filters: Record<string, string>;
  }>;
  datasetVersion: string;
};
export type ReportType = "monthly_summary" | "attendance_journal" | "exceptions" | "approved_absences" | "correction_log";
export type ReportPreviewWrite = {
  reportType: ReportType;
  periodFrom: string;
  periodTo: string;
  departmentId?: string | null;
  workerId?: string | null;
  attendanceStatus?: "active" | "complete" | "late" | "incomplete" | "corrected" | null;
  limit?: number;
};
export type ReportPreviewView = {
  reportType: ReportType;
  filters: ReportPreviewWrite;
  columns: Array<{ key: string; label: string; dataType: "text" | "date" | "datetime" | "integer" | "minutes" | "status" }>;
  rows: Array<Record<string, string | number | null>>;
  totals: { rowCount: number; workedMinutes: number; plannedMinutes: number; balanceMinutes: number };
  datasetVersion: string;
  truncated: boolean;
};
export type TerminalSyncEventView = {
  id: string;
  terminalId: string;
  deviceEventId: string;
  sequence: number;
  workerId: string | null;
  occurredAt: string;
  receivedAt: string;
  eventType: "check_in" | "check_out";
  status: "queued" | "synced" | "duplicate" | "rejected";
  rejectionCode: string | null;
};
export type AttendanceStatus = "active" | "complete" | "late" | "incomplete" | "corrected";
export type AttendanceDayView = {
  id: string;
  workerId: string;
  workDate: string;
  shift: { id: string; name: string; startTime: string; endTime: string; breakMinutes: number };
  checkIn: string | null;
  checkOut: string | null;
  breakMinutes: number;
  workedMinutes: number;
  plannedMinutes: number;
  balanceMinutes: number;
  status: AttendanceStatus;
  source: "terminal" | "approved_correction";
  revision: string;
};
export type AttendancePageView = Page<AttendanceDayView> & {
  totals: {
    rowCount: number;
    completedCount: number;
    activeCount: number;
    reviewCount: number;
    workedMinutes: number;
    plannedMinutes: number;
    balanceMinutes: number;
  };
  datasetVersion: string;
};
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveType = "annual_leave" | "paid_leave" | "unpaid_leave" | "free_day";
export type LeaveRequestView = {
  id: string;
  workerId: string;
  typeCode: LeaveType;
  startDate: string;
  endDate: string;
  workingDays: number;
  note: string;
  status: RequestStatus;
  submittedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
  revision: string;
};
export type LeaveRequestWrite = { typeCode: LeaveType; startDate: string; endDate: string; note?: string };
export type ApprovedLeaveCalendarView = {
  visibility: OrganizationView["approvedLeaveVisibility"];
  items: Array<{ id: string; employeeName: string; startDate: string; endDate: string }>;
  datasetVersion: string;
};
export type AttendanceTimeValues = { checkIn: string | null; checkOut: string | null };
export type CorrectionRequestView = {
  id: string;
  attendanceDayId: string;
  workerId: string;
  oldValues: AttendanceTimeValues;
  newValues: AttendanceTimeValues;
  reason: string;
  status: RequestStatus;
  submittedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
  revision: string;
};
export type CorrectionRequestWrite = {
  attendanceDayId: string;
  newCheckIn: string;
  newCheckOut: string;
  reason: string;
};
export type CorrectionDecisionView = {
  request: CorrectionRequestView;
  attendanceDay: AttendanceDayView;
  auditEventId: string;
};
export type ReportFormat = "csv" | "xlsx" | "pdf";
export type ReportExportWrite = Omit<ReportPreviewWrite, "limit"> & { format: ReportFormat };
export type ReportExportView = {
  id: string;
  reportType: ReportType;
  format: ReportFormat;
  status: "queued" | "processing" | "ready" | "failed" | "expired";
  filters: ReportExportWrite;
  rowCount: number | null;
  officialMinutes: number | null;
  checksumSha256: string | null;
  datasetVersion: string;
  templateVersion: string;
  createdAt: string;
  readyAt: string | null;
  downloadUrl: string | null;
  downloadExpiresAt: string | null;
};
export type ReportArtifact = { content: Buffer; mimeType: string; fileName: string; checksumSha256: string };
export type AuditEventView = {
  id: string;
  actorType: "user" | "terminal" | "system";
  actorId: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  requestId: string;
};
export type TerminalView = {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline" | "revoked";
  lastSeenAt: string | null;
  queueDepth: number;
  clockOffsetSeconds: number;
  revision: string;
};
export type TerminalPairWrite = { activationCode: string; name: string; location: string };
export type TerminalPairView = { terminal: TerminalView; deviceCredential: string };
export type TerminalEventWrite = {
  deviceEventId: string;
  sequence: number;
  occurredAt: string;
  eventType: "check_in" | "check_out";
  cardUidHash: string;
  deviceClockOffsetSeconds?: number;
};
export type TerminalEventBatchWrite = { batchId: string; sentAt: string; events: TerminalEventWrite[] };
export type TerminalEventBatchView = {
  batchId: string;
  receivedAt: string;
  results: Array<{ deviceEventId: string; status: TerminalSyncEventView["status"]; code: string | null }>;
};
export type TerminalHeartbeatWrite = {
  sentAt: string;
  sequence: number;
  queueDepth: number;
  softwareVersion: string;
  deviceClockOffsetSeconds?: number;
};
export type DeviceRequestProof = {
  terminalId: string;
  timestamp: string;
  nonce: string;
  signature: string;
  method: string;
  path: string;
  rawBody: Buffer;
};

export type WorkerWrite = {
  code: string;
  name: string;
  email?: string | null;
  departmentId: string;
  shiftId: string;
  annualLeaveAllowance: number;
};
export type ShiftWrite = {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  toleranceMinutes: number;
};

export interface PhaseAService {
  getDashboardSummary(actor: ActorContext, date: string): Promise<DashboardSummaryView>;
  getOrganization(actor: ActorContext): Promise<OrganizationView>;
  updateOrganization(actor: ActorContext, patch: Partial<Pick<OrganizationView, "name" | "taxIdentifier" | "timezone" | "approvedLeaveVisibility">>, revision: string, requestId: string): Promise<OrganizationView>;
  listDepartments(actor: ActorContext): Promise<DepartmentView[]>;
  createDepartment(actor: ActorContext, name: string, requestId: string): Promise<DepartmentView>;
  updateDepartment(actor: ActorContext, departmentId: string, patch: { name?: string; status?: EntityStatus }, revision: string, requestId: string): Promise<DepartmentView>;
  listHolidays(actor: ActorContext, year: number): Promise<HolidayCalendarView>;
  replaceHolidays(actor: ActorContext, year: number, holidays: Array<{ date: string; name: string }>, revision: string, requestId: string): Promise<HolidayCalendarView>;
  listUsers(actor: ActorContext, cursor: string | undefined, limit: number): Promise<Page<UserView>>;
  inviteUser(actor: ActorContext, input: { email: string; role: Role; workerId?: string | null; departmentIds?: string[] }, requestId: string): Promise<UserInvitationView>;
  updateUser(actor: ActorContext, userId: string, patch: { role?: Role; status?: EntityStatus; departmentIds?: string[] }, revision: string, requestId: string): Promise<UserView>;
  listWorkers(actor: ActorContext, filters: { cursor?: string; limit: number; departmentId?: string; status?: EntityStatus; search?: string }): Promise<Page<WorkerView>>;
  createWorker(actor: ActorContext, input: WorkerWrite, requestId: string): Promise<WorkerView>;
  getWorker(actor: ActorContext, workerId: string): Promise<WorkerView>;
  updateWorker(actor: ActorContext, workerId: string, input: WorkerWrite, revision: string, requestId: string): Promise<WorkerView>;
  deactivateWorker(actor: ActorContext, workerId: string, revision: string, requestId: string): Promise<WorkerView>;
  activateWorker(actor: ActorContext, workerId: string, revision: string, requestId: string): Promise<WorkerView>;
  listShifts(actor: ActorContext): Promise<ShiftView[]>;
  createShift(actor: ActorContext, input: ShiftWrite, requestId: string): Promise<ShiftView>;
  updateShift(actor: ActorContext, shiftId: string, input: ShiftWrite, revision: string, requestId: string): Promise<ShiftView>;
  listWorkerRfidCards(actor: ActorContext, workerId: string): Promise<RfidCardView[]>;
  assignWorkerRfidCard(actor: ActorContext, workerId: string, input: { uid: string; validFrom?: string }, requestId: string): Promise<RfidCardView>;
  blockRfidCard(actor: ActorContext, cardId: string, requestId: string): Promise<RfidCardView>;
  listLeaveBalances(actor: ActorContext, filters: { year: number; cursor?: string; limit: number; departmentId?: string; workerId?: string }): Promise<Page<LeaveBalanceView> & { datasetVersion: string }>;
  createReportPreview(actor: ActorContext, input: ReportPreviewWrite): Promise<ReportPreviewView>;
  listTerminalSyncEvents(actor: ActorContext, terminalId: string, filters: { from: string; to: string; eventStatus?: TerminalSyncEventView["status"]; cursor?: string; limit: number }): Promise<Page<TerminalSyncEventView>>;
}

export interface MvpService extends PhaseAService {
  listApprovedLeaveCalendar(actor: ActorContext, filters: { from: string; to: string }): Promise<ApprovedLeaveCalendarView>;
  listAttendance(actor: ActorContext, filters: { from: string; to: string; departmentId?: string; workerId?: string; attendanceStatus?: AttendanceStatus; cursor?: string; limit: number }): Promise<AttendancePageView>;
  getWorkerAttendance(actor: ActorContext, workerId: string, filters: { from: string; to: string }): Promise<AttendancePageView>;
  listLeaveRequests(actor: ActorContext, filters: { from: string; to: string; departmentId?: string; leaveStatus?: RequestStatus; cursor?: string; limit: number }): Promise<Page<LeaveRequestView>>;
  createLeaveRequest(actor: ActorContext, input: LeaveRequestWrite, requestId: string): Promise<LeaveRequestView>;
  approveLeaveRequest(actor: ActorContext, requestIdValue: string, revision: string, note: string | undefined, requestId: string): Promise<LeaveRequestView>;
  rejectLeaveRequest(actor: ActorContext, requestIdValue: string, revision: string, note: string, requestId: string): Promise<LeaveRequestView>;
  cancelOwnLeaveRequest(actor: ActorContext, requestIdValue: string, revision: string, requestId: string): Promise<LeaveRequestView>;
  listCorrectionRequests(actor: ActorContext, filters: { from: string; to: string; correctionStatus?: RequestStatus; cursor?: string; limit: number }): Promise<Page<CorrectionRequestView>>;
  createCorrectionRequest(actor: ActorContext, input: CorrectionRequestWrite, requestId: string): Promise<CorrectionRequestView>;
  approveCorrectionRequest(actor: ActorContext, requestIdValue: string, revision: string, note: string | undefined, requestId: string): Promise<CorrectionDecisionView>;
  rejectCorrectionRequest(actor: ActorContext, requestIdValue: string, revision: string, note: string, requestId: string): Promise<CorrectionRequestView>;
  cancelOwnCorrectionRequest(actor: ActorContext, requestIdValue: string, revision: string, requestId: string): Promise<CorrectionRequestView>;
  listReportExports(actor: ActorContext, cursor: string | undefined, limit: number): Promise<Page<ReportExportView>>;
  createReportExport(actor: ActorContext, input: ReportExportWrite, requestId: string): Promise<ReportExportView>;
  getReportExport(actor: ActorContext, exportId: string): Promise<ReportExportView>;
  downloadReportExport(actor: ActorContext, exportId: string): Promise<ReportArtifact>;
  listAuditEvents(actor: ActorContext, filters: { from: string; to: string; module?: string; entityId?: string; cursor?: string; limit: number }): Promise<Page<AuditEventView>>;
  listTerminals(actor: ActorContext): Promise<TerminalView[]>;
  pairTerminal(actor: ActorContext, input: TerminalPairWrite, requestId: string): Promise<TerminalPairView>;
  revokeTerminal(actor: ActorContext, terminalId: string, revision: string, requestId: string): Promise<TerminalView>;
  ingestTerminalEventBatch(proof: DeviceRequestProof, input: TerminalEventBatchWrite, requestId: string): Promise<TerminalEventBatchView>;
  terminalHeartbeat(proof: DeviceRequestProof, input: TerminalHeartbeatWrite, requestId: string): Promise<void>;
}
