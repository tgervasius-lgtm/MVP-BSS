import type { ActorContext, EntityStatus, Page, Role, SessionContext } from "../domain/types.js";

export type AuthTokens = Readonly<{ accessToken: string; refreshToken: string }>;
export type AuthResult = Readonly<{ context: SessionContext; actor: ActorContext; tokens: AuthTokens }>;
export type RequestMetadata = Readonly<{ requestId: string; ip?: string; userAgent?: string }>;

export interface AuthService {
  login(email: string, password: string, metadata: RequestMetadata): Promise<AuthResult>;
  resolveAccessToken(token: string): Promise<{ context: SessionContext; actor: ActorContext }>;
  rotate(refreshToken: string, metadata: RequestMetadata): Promise<AuthTokens>;
  logout(actor: ActorContext, requestId: string): Promise<void>;
}

export type OrganizationView = {
  id: string;
  name: string;
  taxIdentifier?: string;
  timezone: string;
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
export type HolidayView = { id: string; date: string; name: string; revision: string };
export type RfidCardView = {
  id: string;
  maskedUid: string;
  workerId: string;
  status: EntityStatus;
  validFrom: string;
  validTo: string | null;
  revision: string;
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
  getOrganization(actor: ActorContext): Promise<OrganizationView>;
  updateOrganization(actor: ActorContext, patch: Partial<Pick<OrganizationView, "name" | "taxIdentifier" | "timezone">>, revision: string, requestId: string): Promise<OrganizationView>;
  listDepartments(actor: ActorContext): Promise<DepartmentView[]>;
  createDepartment(actor: ActorContext, name: string, requestId: string): Promise<DepartmentView>;
  listHolidays(actor: ActorContext, year: number): Promise<HolidayView[]>;
  replaceHolidays(actor: ActorContext, year: number, holidays: Array<{ date: string; name: string }>, revision: string, requestId: string): Promise<HolidayView[]>;
  listUsers(actor: ActorContext, cursor: string | undefined, limit: number): Promise<Page<UserView>>;
  inviteUser(actor: ActorContext, input: { email: string; role: Role; workerId?: string | null; departmentIds?: string[] }, requestId: string): Promise<UserView>;
  updateUser(actor: ActorContext, userId: string, patch: { role?: Role; status?: EntityStatus; departmentIds?: string[] }, revision: string, requestId: string): Promise<UserView>;
  listWorkers(actor: ActorContext, filters: { cursor?: string; limit: number; departmentId?: string; status?: EntityStatus; search?: string }): Promise<Page<WorkerView>>;
  createWorker(actor: ActorContext, input: WorkerWrite, requestId: string): Promise<WorkerView>;
  getWorker(actor: ActorContext, workerId: string): Promise<WorkerView>;
  updateWorker(actor: ActorContext, workerId: string, input: WorkerWrite, revision: string, requestId: string): Promise<WorkerView>;
  deactivateWorker(actor: ActorContext, workerId: string, revision: string, requestId: string): Promise<WorkerView>;
  listShifts(actor: ActorContext): Promise<ShiftView[]>;
  createShift(actor: ActorContext, input: ShiftWrite, requestId: string): Promise<ShiftView>;
  updateShift(actor: ActorContext, shiftId: string, input: ShiftWrite, revision: string, requestId: string): Promise<ShiftView>;
  blockRfidCard(actor: ActorContext, cardId: string, requestId: string): Promise<RfidCardView>;
}
