import { AppError } from "../../src/domain/errors.js";
import type { ActorContext, EntityStatus, Page, Role, SessionContext } from "../../src/domain/types.js";
import type {
  AuthResult,
  AuthService,
  AuthTokens,
  DepartmentView,
  HolidayView,
  OrganizationView,
  PhaseAService,
  RequestMetadata,
  RfidCardView,
  ShiftView,
  ShiftWrite,
  UserView,
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
  card: "00000000-0000-4000-8000-000000000007"
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
}

const organization: OrganizationView = {
  id: IDS.organization,
  name: "BSS Test",
  timezone: "Europe/Zagreb",
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

export class FakePhaseAService implements PhaseAService {
  async getOrganization(_actor: ActorContext): Promise<OrganizationView> { return organization; }
  async updateOrganization(_actor: ActorContext, patch: Partial<Pick<OrganizationView, "name" | "taxIdentifier" | "timezone">>, _revision: string, _requestId: string): Promise<OrganizationView> { return { ...organization, ...patch, revision: "2" }; }
  async listDepartments(_actor: ActorContext): Promise<DepartmentView[]> { return [{ id: IDS.department, name: "Operativa", status: "active", revision: "1" }]; }
  async createDepartment(_actor: ActorContext, name: string, _requestId: string): Promise<DepartmentView> { return { id: IDS.department, name, status: "active", revision: "1" }; }
  async listHolidays(_actor: ActorContext, _year: number): Promise<HolidayView[]> { return []; }
  async replaceHolidays(_actor: ActorContext, _year: number, holidays: Array<{ date: string; name: string }>, _revision: string, _requestId: string): Promise<HolidayView[]> { return holidays.map((item, index) => ({ id: `${IDS.department.slice(0, -1)}${index}`, ...item, revision: "1" })); }
  async listUsers(_actor: ActorContext, _cursor: string | undefined, _limit: number): Promise<Page<UserView>> { return { items: [], page: { nextCursor: null, total: 0 } }; }
  async inviteUser(_actor: ActorContext, input: { email: string; role: Role; workerId?: string | null; departmentIds?: string[] }, _requestId: string): Promise<UserView> { return { id: IDS.user, email: input.email, role: input.role, status: "blocked", workerId: input.workerId ?? null, departmentIds: input.departmentIds ?? [], revision: "1" }; }
  async updateUser(_actor: ActorContext, _userId: string, patch: { role?: Role; status?: EntityStatus; departmentIds?: string[] }, _revision: string, _requestId: string): Promise<UserView> { return { id: IDS.user, email: "admin@example.test", role: patch.role ?? "admin", status: patch.status ?? "active", workerId: null, departmentIds: patch.departmentIds ?? [], revision: "2" }; }
  async listWorkers(_actor: ActorContext, _filters: { cursor?: string; limit: number; departmentId?: string; status?: EntityStatus; search?: string }): Promise<Page<WorkerView>> { return { items: [worker], page: { nextCursor: null, total: 1 } }; }
  async createWorker(_actor: ActorContext, input: WorkerWrite, _requestId: string): Promise<WorkerView> { return { ...worker, ...input }; }
  async getWorker(_actor: ActorContext, _workerId: string): Promise<WorkerView> { return worker; }
  async updateWorker(_actor: ActorContext, _workerId: string, input: WorkerWrite, _revision: string, _requestId: string): Promise<WorkerView> { return { ...worker, ...input, revision: "2" }; }
  async deactivateWorker(_actor: ActorContext, _workerId: string, _revision: string, _requestId: string): Promise<WorkerView> { return { ...worker, status: "blocked", revision: "2" }; }
  async listShifts(_actor: ActorContext): Promise<ShiftView[]> { return [shift]; }
  async createShift(_actor: ActorContext, input: ShiftWrite, _requestId: string): Promise<ShiftView> { return { ...shift, ...input, assignedWorkerCount: 0 }; }
  async updateShift(_actor: ActorContext, _shiftId: string, input: ShiftWrite, _revision: string, _requestId: string): Promise<ShiftView> { return { ...shift, ...input, revision: "2" }; }
  async blockRfidCard(_actor: ActorContext, cardId: string, _requestId: string): Promise<RfidCardView> { return { id: cardId, maskedUid: "****1234", workerId: IDS.worker, status: "blocked", validFrom: new Date(0).toISOString(), validTo: new Date().toISOString(), revision: "2" }; }
}
