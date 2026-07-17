export const ROLES = ["admin", "manager", "worker", "accountant"] as const;
export type Role = (typeof ROLES)[number];

export type EntityStatus = "active" | "blocked";

export type ActorContext = Readonly<{
  organizationId: string;
  userId: string;
  role: Role;
  departmentIds: readonly string[];
  selfWorkerId: string | null;
  sessionId: string;
}>;

export type SessionContext = Readonly<{
  user: {
    id: string;
    email: string;
    role: Role;
    status: EntityStatus;
    workerId: string | null;
    departmentIds: string[];
    revision: string;
  };
  organization: {
    id: string;
    name: string;
    taxIdentifier?: string;
    timezone: string;
    revision: string;
  };
  effectiveScope: {
    role: Role;
    departmentIds: string[];
    selfWorkerId: string | null;
  };
}>;

export type Page<T> = Readonly<{
  items: T[];
  page: { nextCursor: string | null; total: number | null };
}>;
