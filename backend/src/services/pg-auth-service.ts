import { createHash, randomBytes } from "node:crypto";
import type pg from "pg";
import type { AppConfig } from "../config.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext, EntityStatus, Role, SessionContext } from "../domain/types.js";
import { withTenant } from "../db/tenant.js";
import { hashPassword, verifyPassword } from "../security/passwords.js";
import { createOpaqueToken, hashToken } from "../security/tokens.js";
import type { AuthResult, AuthService, AuthTokens, RequestMetadata } from "./contracts.js";

type IdentityRow = {
  invitation_id?: string;
  session_id?: string;
  user_id: string;
  organization_id: string;
  email: string;
  password_hash?: string | null;
  role: Role;
  status: EntityStatus;
  worker_id: string | null;
  user_revision: string | number;
  organization_name: string;
  tax_identifier: string | null;
  timezone: string;
  organization_revision: string | number;
  department_ids: string[];
  expires_at?: Date;
  accepted_at?: Date | null;
  revoked_at?: Date | null;
};

type RefreshRow = {
  session_id: string;
  organization_id: string;
  user_id: string;
  refresh_expires_at: Date;
  revoked_at: Date | null;
  revoke_reason: string | null;
};

const dummyPasswordHash = hashPassword(randomBytes(32).toString("base64url"));

function metadataHash(value: string | undefined): Buffer | null {
  return value ? createHash("sha256").update(value).digest() : null;
}

function contextFromRow(row: IdentityRow): SessionContext {
  const user = {
    id: row.user_id,
    email: row.email,
    role: row.role,
    status: row.status,
    workerId: row.worker_id,
    departmentIds: row.department_ids ?? [],
    revision: String(row.user_revision)
  };
  const organization: SessionContext["organization"] = {
    id: row.organization_id,
    name: row.organization_name,
    timezone: row.timezone,
    revision: String(row.organization_revision)
  };
  if (row.tax_identifier) organization.taxIdentifier = row.tax_identifier;
  return {
    user,
    organization,
    effectiveScope: {
      role: row.role,
      departmentIds: row.department_ids ?? [],
      selfWorkerId: row.worker_id
    }
  };
}

function actorFromRow(row: IdentityRow, sessionId: string): ActorContext {
  return {
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    departmentIds: row.department_ids ?? [],
    selfWorkerId: row.worker_id,
    sessionId
  };
}

export class PgAuthService implements AuthService {
  constructor(
    private readonly pool: pg.Pool,
    private readonly config: Pick<AppConfig, "accessTokenTtlSeconds" | "refreshTokenTtlSeconds">
  ) {}

  async login(email: string, password: string, metadata: RequestMetadata): Promise<AuthResult> {
    const result = await this.pool.query<IdentityRow>("SELECT * FROM bss_auth_lookup($1)", [email.trim().toLowerCase()]);
    const candidate = result.rows.length === 1 ? result.rows[0] : undefined;
    const hashToCheck = candidate?.password_hash ?? (await dummyPasswordHash);
    const validPassword = await verifyPassword(hashToCheck, password);
    if (!candidate || !validPassword || candidate.status !== "active") {
      throw new AppError("UNAUTHENTICATED", "E-mail ili lozinka nisu ispravni.");
    }

    const tokens = this.newTokens();
    const sessionId = await withTenant(
      this.pool,
      { organizationId: candidate.organization_id, userId: candidate.user_id, role: candidate.role },
      metadata.requestId,
      async (client) => {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO auth_sessions (
             organization_id, user_id, access_token_hash, refresh_token_hash,
             access_expires_at, refresh_expires_at, ip_hash, user_agent_hash
           ) VALUES ($1, $2, $3, $4, clock_timestamp() + ($5 * interval '1 second'),
                     clock_timestamp() + ($6 * interval '1 second'), $7, $8)
           RETURNING id`,
          [
            candidate.organization_id,
            candidate.user_id,
            hashToken(tokens.accessToken),
            hashToken(tokens.refreshToken),
            this.config.accessTokenTtlSeconds,
            this.config.refreshTokenTtlSeconds,
            metadataHash(metadata.ip),
            metadataHash(metadata.userAgent)
          ]
        );
        await client.query("UPDATE users SET last_login_at = clock_timestamp() WHERE id = $1", [candidate.user_id]);
        await client.query(
          `INSERT INTO audit_events (
             organization_id, actor_type, actor_id, actor_role, action,
             entity_type, entity_id, request_id, metadata
           ) VALUES ($1, 'user', $2, $3, 'auth.login', 'session', $4, $5, '{}'::jsonb)`,
          [candidate.organization_id, candidate.user_id, candidate.role, inserted.rows[0]?.id, metadata.requestId]
        );
        const id = inserted.rows[0]?.id;
        if (!id) throw new Error("Session insert returned no id");
        return id;
      }
    );

    return {
      context: contextFromRow(candidate),
      actor: actorFromRow(candidate, sessionId),
      tokens
    };
  }

  async acceptInvitation(token: string, password: string, metadata: RequestMetadata): Promise<AuthResult> {
    const lookup = await this.pool.query<IdentityRow>("SELECT * FROM bss_invitation_lookup($1)", [hashToken(token)]);
    const invitation = lookup.rows[0];
    if (
      !invitation?.invitation_id ||
      invitation.accepted_at ||
      invitation.revoked_at ||
      !invitation.expires_at ||
      new Date(invitation.expires_at).getTime() <= Date.now()
    ) {
      throw new AppError("UNAUTHENTICATED", "Pozivnica nije valjana ili je istekla.");
    }

    const passwordHash = await hashPassword(password);
    const tokens = this.newTokens();
    const activeIdentity: IdentityRow = { ...invitation, status: "active", user_revision: Number(invitation.user_revision) + 1 };
    const sessionId = await withTenant(
      this.pool,
      { organizationId: invitation.organization_id, userId: invitation.user_id, role: invitation.role },
      metadata.requestId,
      async (client) => {
        const accepted = await client.query(
          `UPDATE user_invitations SET accepted_at = clock_timestamp()
           WHERE id = $1 AND token_hash = $2 AND accepted_at IS NULL AND revoked_at IS NULL
             AND expires_at > clock_timestamp()`,
          [invitation.invitation_id, hashToken(token)]
        );
        if (accepted.rowCount !== 1) throw new AppError("UNAUTHENTICATED", "Pozivnica je već iskorištena.");
        await client.query(
          `UPDATE users SET password_hash = $2, status = 'active', password_changed_at = clock_timestamp(),
             revision = revision + 1 WHERE id = $1`,
          [invitation.user_id, passwordHash]
        );
        await client.query(
          `UPDATE user_invitations SET revoked_at = clock_timestamp()
           WHERE lower(email) = lower($1) AND id <> $2 AND accepted_at IS NULL AND revoked_at IS NULL`,
          [invitation.email, invitation.invitation_id]
        );
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO auth_sessions (
             organization_id, user_id, access_token_hash, refresh_token_hash,
             access_expires_at, refresh_expires_at, ip_hash, user_agent_hash
           ) VALUES ($1, $2, $3, $4, clock_timestamp() + ($5 * interval '1 second'),
                     clock_timestamp() + ($6 * interval '1 second'), $7, $8)
           RETURNING id`,
          [
            invitation.organization_id,
            invitation.user_id,
            hashToken(tokens.accessToken),
            hashToken(tokens.refreshToken),
            this.config.accessTokenTtlSeconds,
            this.config.refreshTokenTtlSeconds,
            metadataHash(metadata.ip),
            metadataHash(metadata.userAgent)
          ]
        );
        const id = inserted.rows[0]?.id;
        if (!id) throw new Error("Invitation session insert returned no id");
        await client.query(
          `INSERT INTO audit_events (
             organization_id, actor_type, actor_id, actor_role, action,
             entity_type, entity_id, request_id, metadata
           ) VALUES ($1, 'user', $2, $3, 'invitation.accept', 'user', $2, $4, '{}'::jsonb)`,
          [invitation.organization_id, invitation.user_id, invitation.role, metadata.requestId]
        );
        return id;
      }
    );

    return {
      context: contextFromRow(activeIdentity),
      actor: actorFromRow(activeIdentity, sessionId),
      tokens
    };
  }

  async resolveAccessToken(token: string): Promise<{ context: SessionContext; actor: ActorContext }> {
    const result = await this.pool.query<IdentityRow>("SELECT * FROM bss_session_lookup($1)", [hashToken(token)]);
    const row = result.rows[0];
    if (!row?.session_id) throw new AppError("UNAUTHENTICATED", "Sesija nedostaje ili je istekla.");
    return { context: contextFromRow(row), actor: actorFromRow(row, row.session_id) };
  }

  async rotate(refreshToken: string, metadata: RequestMetadata): Promise<AuthTokens> {
    const lookup = await this.pool.query<RefreshRow>("SELECT * FROM bss_refresh_lookup($1)", [hashToken(refreshToken)]);
    const current = lookup.rows[0];
    if (!current) throw new AppError("UNAUTHENTICATED", "Refresh sesija nije valjana.");

    const now = Date.now();
    if (current.revoked_at || new Date(current.refresh_expires_at).getTime() <= now) {
      if (current.revoked_at && current.revoke_reason === "rotated") {
        await withTenant(
          this.pool,
          { organizationId: current.organization_id, userId: current.user_id, role: "worker" },
          metadata.requestId,
          async (client) => {
            await client.query(
              `UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, clock_timestamp()),
                 revoke_reason = 'refresh_reuse_detected'
               WHERE user_id = $1 AND revoked_at IS NULL`,
              [current.user_id]
            );
          }
        );
      }
      throw new AppError("UNAUTHENTICATED", "Refresh sesija je istekla ili opozvana.");
    }

    const next = this.newTokens();
    await withTenant(
      this.pool,
      { organizationId: current.organization_id, userId: current.user_id, role: "worker" },
      metadata.requestId,
      async (client) => {
        const revoked = await client.query(
          `UPDATE auth_sessions SET revoked_at = clock_timestamp(), revoke_reason = 'rotated'
           WHERE id = $1 AND revoked_at IS NULL`,
          [current.session_id]
        );
        if (revoked.rowCount !== 1) throw new AppError("UNAUTHENTICATED", "Refresh sesija je već iskorištena.");
        await client.query(
          `INSERT INTO auth_sessions (
             organization_id, user_id, access_token_hash, refresh_token_hash,
             access_expires_at, refresh_expires_at, rotated_from_id, ip_hash, user_agent_hash
           ) VALUES ($1, $2, $3, $4, clock_timestamp() + ($5 * interval '1 second'),
                     clock_timestamp() + ($6 * interval '1 second'), $7, $8, $9)`,
          [
            current.organization_id,
            current.user_id,
            hashToken(next.accessToken),
            hashToken(next.refreshToken),
            this.config.accessTokenTtlSeconds,
            this.config.refreshTokenTtlSeconds,
            current.session_id,
            metadataHash(metadata.ip),
            metadataHash(metadata.userAgent)
          ]
        );
      }
    );
    return next;
  }

  async logout(actor: ActorContext, requestId: string): Promise<void> {
    await withTenant(this.pool, actor, requestId, async (client) => {
      await client.query(
        `UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, clock_timestamp()),
           revoke_reason = COALESCE(revoke_reason, 'logout') WHERE id = $1`,
        [actor.sessionId]
      );
      await client.query(
        `INSERT INTO audit_events (
           organization_id, actor_type, actor_id, actor_role, action,
           entity_type, entity_id, request_id, metadata
         ) VALUES ($1, 'user', $2, $3, 'auth.logout', 'session', $4, $5, '{}'::jsonb)`,
        [actor.organizationId, actor.userId, actor.role, actor.sessionId, requestId]
      );
    });
  }

  private newTokens(): AuthTokens {
    return { accessToken: createOpaqueToken(), refreshToken: createOpaqueToken() };
  }
}
