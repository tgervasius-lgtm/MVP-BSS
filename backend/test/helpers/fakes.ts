import { AppError } from "../../src/domain/errors.js";
import type { ActorContext, EntityStatus, Page, Role, SessionContext } from "../../src/domain/types.js";
import type {
  AuthResult,
  AuthService,
  AuthTokens,
  AttendancePageView,
  AttendanceStatus,
  ApprovedLeaveCalendarView,
  AuditEventView,
  CorrectionDecisionView,
  CorrectionRequestView,
  CorrectionRequestWrite,
  DashboardSummaryView,
  DeviceRequestProof,
  DepartmentView,
  HolidayCalendarView,
  LeaveBalanceView,
  LeaveRequestView,
  LeaveRequestWrite,
  MvpService,
  OrganizationView,
  ReportArtifact,
  ReportExportView,
  ReportExportWrite,
  ReportPreviewView,
  ReportPreviewWrite,
  RequestMetadata,
  RequestStatus,
  RfidCardView,
  ShiftView,
  ShiftWrite,
  TerminalEventBatchView,
  TerminalEventBatchWrite,
  TerminalHeartbeatWrite,
  TerminalPairView,
  TerminalPairWrite,
  TerminalView,
  TerminalSyncEventView,
  UserView,
  UserInvitationView,
  WorkerView,
  WorkerWrite
} from "../../src/services/contracts.js";

export const IDS = Object.freeze({
  organization: "00000000-0000-4000-8000-000000000001",
  user: "00000000-0000-4000-8000-000000000002",
  department: "00000000-0000-4000-8000-000000000003",
  otherDepartment: "00000000-0000-4000-8000-000000000004",
  worker: "00000000-0000-4000-8000-000000000005",
  shift: "00000000-0000-4000-8000-000000000006",
  card: "00000000-0000-4000-8000-000000000007",
  attendance: "00000000-0000-4000-8000-000000000008",
  request: "00000000-0000-4000-8000-000000000009",
  export: "00000000-0000-4000-8000-000000000010",
  terminal: "00000000-0000-4000-8000-000000000011"
});

function session(role: Role): { context: SessionContext; actor: ActorContext } {
  const workerId = role === "worker" ? IDS.worker : null;
  const departmentIds = role === "manager" ? [IDS.department] : [];
  const actor: ActorContext = {
    organizationId: IDS.organization,
    userId: IDS.user,
    role,
    departmentIds,
    selfWorkerId: workerId,
    sessionId: `session-${role}`
  };
  return {
    actor,
    context: {
      user: {
        id: IDS.user,
        email: `${role}@example.test`,
        role,
        status: "active",
        workerId,
        departmentIds,
        revision: "1"
      },
      organization: { id: IDS.organization, name: "BSS Test", timezone: "Europe/Zagreb", revision: "1" },
      effectiveScope: { role, departmentIds, selfWorkerId: workerId }
    }
  };
}

export class FakeAuthService implements AuthService {
  async login(email: string, _password: string, _metadata: RequestMetadata): Promise<AuthResult> {
    const role = email.split("@")[0] as Role;
    const current = session(role);
    return { ...current, tokens: { accessToken: role, refreshToken: `refresh-${role}` } };
  }

  async acceptInvitation(_token: string, _password: string, _metadata: RequestMetadata): Promise<AuthResult> {
    const current = session("worker");
    return { ...current, tokens: { accessToken: "worker", refreshToken: "refresh-worker" } };
  }

  async resolveAccessToken(token: string): Promise<{ context: SessionContext; actor: ActorContext }> {
    if (!(<[string, ...string[]]>["admin", "manager", "worker", "accountant"]).includes(token)) {
      throw new AppError("UNAUTHENTICATED", "Invalid test session");
    }
    return session(token as Role);
  }

  async rotate(_refreshToken: string, _metadata: RequestMetadata): Promise<AuthTokens> {
    return { accessToken: "admin", refreshToken: "refresh-admin-next" };
  }

  async logout(_actor: ActorContext, _requestId: string): Promise<void> {}
  async logoutByRefreshToken(_refreshToken: string, _requestId: string): Promise<void> {}
}

const organization: OrganizationView = {
  id: IDS.organization,
  name: "BSS Test",
  timezone: "Europe/Zagreb",
  approvedLeaveVisibility: "department",
  revision: "1"
};
const worker: WorkerView = {
  id: IDS.worker,
  code: "R-001",
  name: "Testni Radnik",
  email: null,
  departmentId: IDS.department,
  shiftId: IDS.shift,
  status: "active",
  annualLeaveAllowance: 20,
  revision: "1"
};
const shift: ShiftView = {
  id: IDS.shift,
  name: "Jutarnja",
  startTime: "08:00",
  endTime: "16:00",
  breakMinutes: 30,
  toleranceMinutes: 5,
  assignedWorkerCount: 1,
  revision: "1"
};

export class FakePhaseAService implements MvpService {
  async getDashboardSummary(actor: ActorContext, date: string): Promise<DashboardSummaryView> {
    return {
      date,
      role: actor.role,
      kpis: [{ id: "present", value: 1, targetScreen: "attendance", filters: { date, presence: "present" } }],
      datasetVersion: "dashboard-v1"
    };
  }
  async getOrganization(_actor: ActorContext): Promise<OrganizationView> { return organization; }
  async updateOrganization(_actor: ActorContext, patch: Partial<Pick<OrganizationView, "name" | "taxIdentifier" | "timezone">>, _revision: string, _requestId: string): Promise<OrganizationView> { return { ...organization, ...patch, revision: "2" }; }
  async listDepartments(_actor: ActorContext): Promise<DepartmentView[]> { return [{ id: IDS.department, name: "Operativa", status: "active", revision: "1" }]; }
  async createDepartment(_actor: ActorContext, name: string, _requestId: string): Promise<DepartmentView> { return { id: IDS.department, name, status: "active", revision: "1" }; }
  async updateDepartment(_actor: ActorContext, departmentId: string, patch: { name?: string; status?: EntityStatus }, _revision: string, _requestId: string): Promise<DepartmentView> { return { id: departmentId, name: patch.name ?? "Operativa", status: patch.status ?? "active", revision: "2" }; }
  async listHolidays(_actor: ActorContext, _year: number): Promise<HolidayCalendarView> { return { items: [], revision: "0" }; }
  async replaceHolidays(_actor: ActorContext, _year: number, holidays: Array<{ date: string; name: string }>, _revision: string, _requestId: string): Promise<HolidayCalendarView> { return { items: holidays.map((item, index) => ({ id: `${IDS.department.slice(0, -1)}${index}`, ...item, revision: "1" })), revision: "1" }; }
  async listUsers(_actor: ActorContext, _cursor: string | undefined, _limit: number): Promise<Page<UserView>> { return { items: [], page: { nextCursor: null, total: 0 } }; }
  async inviteUser(_actor: ActorContext, input: { email: string; role: Role; workerId?: string | null; departmentIds?: string[] }, _requestId: string): Promise<UserInvitationView> { return { id: IDS.user, email: input.email, role: input.role, status: "blocked", workerId: input.workerId ?? null, departmentIds: input.departmentIds ?? [], revision: "1", invitationUrl: "https://bss.test/#invite=test-token", expiresAt: "2026-07-20T08:00:00.000Z" }; }
  async updateUser(_actor: ActorContext, _userId: string, patch: { role?: Role; status?: EntityStatus; departmentIds?: string[] }, _revision: string, _requestId: string): Promise<UserView> { return { id: IDS.user, email: "admin@example.test", role: patch.role ?? "admin", status: patch.status ?? "active", workerId: null, departmentIds: patch.departmentIds ?? [], revision: "2" }; }
  async listWorkers(_actor: ActorContext, _filters: { cursor?: string; limit: number; departmentId?: string; status?: EntityStatus; search?: string }): Promise<Page<WorkerView>> { return { items: [worker], page: { nextCursor: null, total: 1 } }; }
  async createWorker(_actor: ActorContext, input: WorkerWrite, _requestId: string): Promise<WorkerView> { return { ...worker, ...input }; }
  async getWorker(_actor: ActorContext, _workerId: string): Promise<WorkerView> { return worker; }
  async updateWorker(_actor: ActorContext, _workerId: string, input: WorkerWrite, _revision: string, _requestId: string): Promise<WorkerView> { return { ...worker, ...input, revision: "2" }; }
  async deactivateWorker(_actor: ActorContext, _workerId: string, _revision: string, _requestId: string): Promise<WorkerView> { return { ...worker, status: "blocked", revision: "2" }; }
  async activateWorker(_actor: ActorContext, _workerId: string, _revision: string, _requestId: string): Promise<WorkerView> { return { ...worker, status: "active", revision: "2" }; }
  async listShifts(_actor: ActorContext): Promise<ShiftView[]> { return [shift]; }
  async createShift(_actor: ActorContext, input: ShiftWrite, _requestId: string): Promise<ShiftView> { return { ...shift, ...input, assignedWorkerCount: 0 }; }
  async updateShift(_actor: ActorContext, _shiftId: string, input: ShiftWrite, _revision: string, _requestId: string): Promise<ShiftView> { return { ...shift, ...input, revision: "2" }; }
  async listWorkerRfidCards(_actor: ActorContext, _workerId: string): Promise<RfidCardView[]> { return []; }
  async assignWorkerRfidCard(_actor: ActorContext, workerId: string, _input: { uid: string; validFrom?: string }, _requestId: string): Promise<RfidCardView> { return { id: IDS.card, maskedUid: "****1234", workerId, status: "active", validFrom: new Date(0).toISOString(), validTo: null, revision: "1" }; }
  async blockRfidCard(_actor: ActorContext, cardId: string, _requestId: string): Promise<RfidCardView> { return { id: cardId, maskedUid: "****1234", workerId: IDS.worker, status: "blocked", validFrom: new Date(0).toISOString(), validTo: new Date().toISOString(), revision: "2" }; }
  async listLeaveBalances(_actor: ActorContext, filters: { year: number; cursor?: string; limit: number; departmentId?: string; workerId?: string }): Promise<Page<LeaveBalanceView> & { datasetVersion: string }> { return { items: [{ workerId: IDS.worker, year: filters.year, allowanceDays: 20, carriedOverDays: 0, approvedDays: 5, plannedDays: 2, remainingDays: 15, availableDays: 13, revision: "1" }], page: { nextCursor: null, total: 1 }, datasetVersion: "leave-v1" }; }
  async listApprovedLeaveCalendar(_actor: ActorContext, _filters: { from: string; to: string }): Promise<ApprovedLeaveCalendarView> { return { visibility: "department", items: [{ id: IDS.request, employeeName: "Testni Radnik", startDate: "2026-08-03", endDate: "2026-08-07" }], datasetVersion: "approved-leave-v1" }; }
  async createReportPreview(_actor: ActorContext, input: ReportPreviewWrite): Promise<ReportPreviewView> { return { reportType: input.reportType, filters: { ...input, limit: input.limit ?? 100 }, columns: [{ key: "workerCode", label: "Šifra", dataType: "text" }], rows: [{ workerCode: "R-001" }], totals: { rowCount: 1, workedMinutes: 480, plannedMinutes: 480, balanceMinutes: 0 }, datasetVersion: "report-v1", truncated: false }; }
  async listTerminalSyncEvents(_actor: ActorContext, terminalId: string, _filters: { from: string; to: string; eventStatus?: TerminalSyncEventView["status"]; cursor?: string; limit: number }): Promise<Page<TerminalSyncEventView>> { return { items: [{ id: IDS.card, terminalId, deviceEventId: IDS.worker, sequence: 1, workerId: IDS.worker, occurredAt: new Date(0).toISOString(), receivedAt: new Date(0).toISOString(), eventType: "check_in", status: "synced", rejectionCode: null }], page: { nextCursor: null, total: 1 } }; }
  async listAttendance(_actor: ActorContext, _filters: { from: string; to: string; departmentId?: string; workerId?: string; attendanceStatus?: AttendanceStatus; cursor?: string; limit: number }): Promise<AttendancePageView> {
    return { items: [{ id: IDS.attendance, workerId: IDS.worker, workDate: "2026-07-17", shift: { id: IDS.shift, name: "Jutarnja", startTime: "08:00", endTime: "16:00", breakMinutes: 30 }, checkIn: "2026-07-17T06:00:00.000Z", checkOut: "2026-07-17T14:00:00.000Z", breakMinutes: 30, workedMinutes: 450, plannedMinutes: 450, balanceMinutes: 0, status: "complete", source: "terminal", revision: "1" }], totals: { rowCount: 1, completedCount: 1, activeCount: 0, reviewCount: 0, workedMinutes: 450, plannedMinutes: 450, balanceMinutes: 0 }, page: { nextCursor: null, total: 1 }, datasetVersion: "attendance-v1" };
  }
  async getWorkerAttendance(actor: ActorContext, workerId: string, filters: { from: string; to: string; cursor?: string; limit: number }): Promise<AttendancePageView> { return this.listAttendance(actor, { ...filters, workerId }); }
  async listLeaveRequests(_actor: ActorContext, _filters: { from: string; to: string; departmentId?: string; leaveStatus?: RequestStatus; cursor?: string; limit: number }): Promise<Page<LeaveRequestView>> { return { items: [this.leaveRequest()], page: { nextCursor: null, total: 1 } }; }
  async createLeaveRequest(_actor: ActorContext, input: LeaveRequestWrite, _requestId: string): Promise<LeaveRequestView> { return { ...this.leaveRequest(), ...input }; }
  async approveLeaveRequest(_actor: ActorContext, _id: string, _revision: string, note: string | undefined, _requestId: string): Promise<LeaveRequestView> { return { ...this.leaveRequest(), status: "approved", decisionNote: note ?? null, revision: "2" }; }
  async rejectLeaveRequest(_actor: ActorContext, _id: string, _revision: string, note: string, _requestId: string): Promise<LeaveRequestView> { return { ...this.leaveRequest(), status: "rejected", decisionNote: note, revision: "2" }; }
  async cancelOwnLeaveRequest(_actor: ActorContext, _id: string, _revision: string, _requestId: string): Promise<LeaveRequestView> { return { ...this.leaveRequest(), status: "cancelled", revision: "2" }; }
  async listCorrectionRequests(_actor: ActorContext, _filters: { from: string; to: string; correctionStatus?: RequestStatus; cursor?: string; limit: number }): Promise<Page<CorrectionRequestView>> { return { items: [this.correctionRequest()], page: { nextCursor: null, total: 1 } }; }
  async createCorrectionRequest(_actor: ActorContext, input: CorrectionRequestWrite, _requestId: string): Promise<CorrectionRequestView> { return { ...this.correctionRequest(), attendanceDayId: input.attendanceDayId, newValues: { checkIn: input.newCheckIn, checkOut: input.newCheckOut }, reason: input.reason }; }
  async approveCorrectionRequest(actor: ActorContext, _id: string, _revision: string, _note: string | undefined, _requestId: string): Promise<CorrectionDecisionView> { return { request: { ...this.correctionRequest(), status: "approved", revision: "2" }, attendanceDay: (await this.listAttendance(actor, { from: "2026-07-01", to: "2026-07-31", limit: 1 })).items[0]!, auditEventId: IDS.card }; }
  async rejectCorrectionRequest(_actor: ActorContext, _id: string, _revision: string, note: string, _requestId: string): Promise<CorrectionRequestView> { return { ...this.correctionRequest(), status: "rejected", decisionNote: note, revision: "2" }; }
  async cancelOwnCorrectionRequest(_actor: ActorContext, _id: string, _revision: string, _requestId: string): Promise<CorrectionRequestView> { return { ...this.correctionRequest(), status: "cancelled", revision: "2" }; }
  async listReportExports(_actor: ActorContext, _cursor: string | undefined, _limit: number): Promise<Page<ReportExportView>> { return { items: [this.reportExport()], page: { nextCursor: null, total: 1 } }; }
  async createReportExport(_actor: ActorContext, input: ReportExportWrite, _requestId: string): Promise<ReportExportView> { return { ...this.reportExport(), reportType: input.reportType, format: input.format, filters: input }; }
  async getReportExport(_actor: ActorContext, _id: string): Promise<ReportExportView> { return this.reportExport(); }
  async downloadReportExport(_actor: ActorContext, _id: string): Promise<ReportArtifact> { const content = Buffer.from("BSS"); return { content, mimeType: "application/pdf", fileName: "BSS.pdf", checksumSha256: "a".repeat(64) }; }
  async listAuditEvents(_actor: ActorContext, _filters: { from: string; to: string; module?: string; entityId?: string; cursor?: string; limit: number }): Promise<Page<AuditEventView>> { return { items: [{ id: IDS.card, actorType: "user", actorId: IDS.user, action: "worker.update", module: "workers", entityType: "worker", entityId: IDS.worker, before: null, after: { status: "active" }, createdAt: new Date(0).toISOString(), requestId: "request-1" }], page: { nextCursor: null, total: 1 } }; }
  async listTerminals(_actor: ActorContext): Promise<TerminalView[]> { return [this.terminal()]; }
  async pairTerminal(_actor: ActorContext, input: TerminalPairWrite, _requestId: string): Promise<TerminalPairView> { return { terminal: { ...this.terminal(), name: input.name, location: input.location }, deviceCredential: "device-secret" }; }
  async revokeTerminal(_actor: ActorContext, _terminalId: string, _revision: string, _requestId: string): Promise<TerminalView> { return { ...this.terminal(), status: "revoked", revision: "2" }; }
  async ingestTerminalEventBatch(_proof: DeviceRequestProof, input: TerminalEventBatchWrite, _requestId: string): Promise<TerminalEventBatchView> { return { batchId: input.batchId, receivedAt: new Date(0).toISOString(), results: input.events.map((event) => ({ deviceEventId: event.deviceEventId, status: "synced", code: null })) }; }
  async terminalHeartbeat(_proof: DeviceRequestProof, _input: TerminalHeartbeatWrite, _requestId: string): Promise<void> {}

  private leaveRequest(): LeaveRequestView { return { id: IDS.request, workerId: IDS.worker, typeCode: "annual_leave", startDate: "2026-08-03", endDate: "2026-08-07", workingDays: 5, note: "Odmor", status: "pending", submittedAt: new Date(0).toISOString(), decidedAt: null, decidedBy: null, decisionNote: null, revision: "1" }; }
  private correctionRequest(): CorrectionRequestView { return { id: IDS.request, attendanceDayId: IDS.attendance, workerId: IDS.worker, oldValues: { checkIn: "2026-07-17T06:00:00.000Z", checkOut: null }, newValues: { checkIn: "2026-07-17T06:00:00.000Z", checkOut: "2026-07-17T14:00:00.000Z" }, reason: "Zaboravljena odjava", status: "pending", submittedAt: new Date(0).toISOString(), decidedAt: null, decidedBy: null, decisionNote: null, revision: "1" }; }
  private reportExport(): ReportExportView { return { id: IDS.export, reportType: "monthly_summary", format: "xlsx", status: "ready", filters: { reportType: "monthly_summary", format: "xlsx", periodFrom: "2026-07-01", periodTo: "2026-07-31" }, rowCount: 1, officialMinutes: 450, checksumSha256: "a".repeat(64), datasetVersion: "dataset-v1", templateVersion: "bss-report-v1.1", createdAt: new Date(0).toISOString(), readyAt: new Date(0).toISOString(), downloadUrl: `/api/v1/report-exports/${IDS.export}/download`, downloadExpiresAt: new Date(Date.now() + 3600000).toISOString() }; }
  private terminal(): TerminalView { return { id: IDS.terminal, name: "Terminal 01", location: "Ulaz", status: "online", lastSeenAt: new Date().toISOString(), queueDepth: 0, clockOffsetSeconds: 0, revision: "1" }; }
}
