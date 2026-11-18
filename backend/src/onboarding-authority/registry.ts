import { createHash, randomBytes, randomUUID } from "node:crypto";
import type pg from "pg";
import { withTransaction, type DatabaseTransaction } from "../db/transaction.js";
import { AppError } from "../domain/errors.js";
import { encryptDeviceCredential, decryptDeviceCredential } from "../security/device-credentials.js";
import { assessInternalAuthority, isInternalAuthorityIntent, type ResolvedAuthorityIntent } from "./policy.js";
import { InternalOidc } from "./oidc.js";

type Session = {
  token_hash: string; csrf_hash: string; person_id: string; issuer: string; subject: string;
  authenticated_at: string; expires_at: string; revoked: boolean; active: boolean;
};
type Target = {
  scope_key: string; scope: ResolvedAuthorityIntent["scope"]; revision: string;
  configuration_hash: string; evidence_hash: string; release_id: string; preparer_ids: string[];
};
type Grant = { id: string; revision: string; valid_from: string; expires_at: string; revoked: boolean };
type Operation = {
  id: string; person_id: string; session_hash: string; grant_id: string; grant_revision: string;
  scope_key: string; target_revision: string; target_hash: string; intent: ResolvedAuthorityIntent;
  payload: Record<string, unknown>; fingerprint: string; proof_authenticated_at: string | null;
  proof_expires_at: string | null; used: boolean;
};
type Flow = {
  state_hash: string; cookie_hash: string; nonce: string; verifier_ciphertext: Buffer;
  verifier_iv: Buffer; verifier_tag: Buffer; started_at: string; expires_at: string;
  session_hash: string | null; operation_id: string | null; used: boolean;
};
export type InternalAuthorityConfig = Readonly<{
  flowEncryptionKey: string; sessionSeconds: number; confirmationSeconds: number;
}>;
export type InternalEffect = (
  transaction: DatabaseTransaction, intent: ResolvedAuthorityIntent, payload: Readonly<Record<string, unknown>>
) => Promise<Record<string, unknown>>;

const now = () => Math.floor(Date.now() / 1_000);
const secret = () => randomBytes(32).toString("base64url");
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
export function internalScopeKey(scope: ResolvedAuthorityIntent["scope"]): string {
  return sha(JSON.stringify([scope.environmentId, scope.profile, scope.kind, scope.targetId]));
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable((value as Record<string, unknown>)[key])]));
  }
  return value;
}
function fingerprint(value: unknown): string {
  return sha(JSON.stringify(stable(value)));
}
function deny(code: "UNAUTHENTICATED" | "FORBIDDEN" | "CONFLICT" | "NOT_FOUND"): never {
  throw new AppError(code, "Interni zahtjev nije dopušten u trenutačnom stanju.");
}
function targetHash(target: Target): string {
  return fingerprint([target.revision, target.configuration_hash, target.evidence_hash, target.release_id, target.preparer_ids]);
}

/** Inactive adapter. Standard server composition never imports or registers it. */
export class PgInternalAuthority {
  constructor(private readonly pool: pg.Pool, private readonly oidc: InternalOidc, private readonly config: InternalAuthorityConfig) {
    if (config.flowEncryptionKey.length < 32 || !Number.isSafeInteger(config.sessionSeconds) ||
        config.sessionSeconds <= 0 || !Number.isSafeInteger(config.confirmationSeconds) ||
        config.confirmationSeconds <= 0 || config.confirmationSeconds > config.sessionSeconds) {
      throw new Error("Explicit internal encryption and positive session/confirmation lifetimes are required");
    }
  }

  private transaction<T>(operation: (db: DatabaseTransaction) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, async db => {
      await db.query("SELECT set_config('bss.internal_runtime','on',true)");
      await db.query("SET LOCAL statement_timeout='10s'");
    }, operation);
  }

  private async session(db: DatabaseTransaction, tokenHash: string): Promise<Session> {
    await db.query("SELECT set_config('bss.internal_session',$1,true)", [tokenHash]);
    const row = (await db.query<Session>(
      `SELECT s.*,p.active FROM bss_internal.sessions s JOIN bss_internal.people p ON p.id=s.person_id
       WHERE s.token_hash=$1 FOR SHARE OF s,p`, [tokenHash]
    )).rows[0];
    if (!row || !row.active || row.revoked || Number(row.expires_at) <= now()) deny("UNAUTHENTICATED");
    await db.query("SELECT set_config('bss.internal_person',$1,true)", [row.person_id]);
    return row;
  }

  private csrf(session: Session, supplied: string): void {
    if (sha(supplied) !== session.csrf_hash) deny("FORBIDDEN");
  }

  private async operation(db: DatabaseTransaction, id: string): Promise<Operation> {
    const row = (await db.query<Operation>("SELECT * FROM bss_internal.operations WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!row) deny("NOT_FOUND");
    return row;
  }

  private async authority(db: DatabaseTransaction, session: Session, intent: ResolvedAuthorityIntent) {
    const key = internalScopeKey(intent.scope);
    await db.query("SELECT set_config('bss.internal_scope',$1,true)", [key]);
    const target = (await db.query<Target>("SELECT *,revision::text FROM bss_internal.targets WHERE scope_key=$1 FOR UPDATE", [key])).rows[0];
    if (!target || fingerprint(target.scope) !== fingerprint(intent.scope)) deny("FORBIDDEN");
    const grant = (await db.query<Grant>(
      `SELECT id,revision::text,valid_from::text,expires_at::text,revoked FROM bss_internal.grants
       WHERE person_id=$1 AND action=$2 AND scope_key=$3 FOR SHARE`, [session.person_id, intent.action, key]
    )).rows[0];
    const principal = { issuer: session.issuer, subject: session.subject, personId: session.person_id };
    const assessed = assessInternalAuthority({
      principal, authenticatedAt: Number(session.authenticated_at), expiresAt: Number(session.expires_at),
      grant: grant ? {
        id: grant.id, revision: grant.revision, principal, action: intent.action, scope: intent.scope,
        validFrom: Number(grant.valid_from), expiresAt: Number(grant.expires_at), revoked: grant.revoked
      } : null
    }, intent, now());
    if (!assessed.permitted) deny("FORBIDDEN");
    return { target, grantId: assessed.grantId, grantRevision: assessed.grantRevision };
  }

  private async flow(db: DatabaseTransaction, operation?: Operation) {
    const state = secret(), cookie = secret(), nonce = secret(), verifier = secret();
    const encrypted = encryptDeviceCredential(this.config.flowEncryptionKey, verifier);
    await db.query("SELECT set_config('bss.internal_flow',$1,true)", [sha(state)]);
    await db.query(
      `INSERT INTO bss_internal.flows(state_hash,cookie_hash,nonce,verifier_ciphertext,verifier_iv,verifier_tag,
         started_at,expires_at,session_hash,operation_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [sha(state), sha(cookie), nonce, encrypted.ciphertext, encrypted.iv, encrypted.authTag,
        now(), now() + this.config.confirmationSeconds, operation?.session_hash ?? null, operation?.id ?? null]
    );
    return { state, flowCookie: cookie, authorizationUrl: this.oidc.authorizationUrl(state, nonce, verifier),
      maxAge: this.config.confirmationSeconds };
  }

  beginLogin() {
    return this.transaction(db => this.flow(db));
  }

  /** Called only by the server-side callback, with its HttpOnly flow cookie. */
  completeLogin(state: string, flowCookie: string, code: string) {
    return this.transaction(async db => {
      await db.query("SELECT set_config('bss.internal_flow',$1,true)", [sha(state)]);
      const flow = (await db.query<Flow>("SELECT * FROM bss_internal.flows WHERE state_hash=$1 FOR UPDATE", [sha(state)])).rows[0];
      if (!flow || flow.used || flow.cookie_hash !== sha(flowCookie) || Number(flow.expires_at) <= now()) deny("UNAUTHENTICATED");
      const verifier = decryptDeviceCredential(this.config.flowEncryptionKey, {
        ciphertext: flow.verifier_ciphertext, iv: flow.verifier_iv, authTag: flow.verifier_tag
      });
      const identity = await this.oidc.exchange(code, verifier, flow.nonce);
      if (!identity.methods.includes(this.oidc.config.passkeyMethod) ||
          identity.authenticatedAt < Number(flow.started_at) ||
          now() - identity.authenticatedAt > this.config.confirmationSeconds) deny("UNAUTHENTICATED");
      const person = (await db.query<{ person_id: string; active: boolean }>(
        `SELECT i.person_id,p.active FROM bss_internal.identities i JOIN bss_internal.people p ON p.id=i.person_id
         WHERE issuer=$1 AND subject=$2 FOR SHARE OF i,p`, [identity.issuer, identity.subject]
      )).rows[0];
      if (!person?.active) deny("FORBIDDEN");
      let result: { sessionToken: string; csrfToken: string } | { operationId: string };
      if (flow.session_hash && flow.operation_id) {
        const session = await this.session(db, flow.session_hash);
        if (session.person_id !== person.person_id || session.issuer !== identity.issuer || session.subject !== identity.subject) {
          deny("UNAUTHENTICATED");
        }
        const op = await this.operation(db, flow.operation_id);
        if (op.session_hash !== session.token_hash || op.used) deny("CONFLICT");
        await db.query("UPDATE bss_internal.operations SET proof_authenticated_at=$2,proof_expires_at=$3 WHERE id=$1",
          [op.id, identity.authenticatedAt, Math.min(identity.expiresAt, identity.authenticatedAt + this.config.confirmationSeconds)]);
        result = { operationId: op.id };
      } else {
        const sessionToken = secret(), csrfToken = secret();
        await db.query("SELECT set_config('bss.internal_session',$1,true)", [sha(sessionToken)]);
        await db.query(
          `INSERT INTO bss_internal.sessions(token_hash,csrf_hash,person_id,issuer,subject,authenticated_at,expires_at)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [sha(sessionToken), sha(csrfToken), person.person_id, identity.issuer, identity.subject,
            identity.authenticatedAt, Math.min(identity.expiresAt, now() + this.config.sessionSeconds)]
        );
        result = { sessionToken, csrfToken };
      }
      await db.query(
        `UPDATE bss_internal.flows SET used=true,verifier_ciphertext=NULL,verifier_iv=NULL,verifier_tag=NULL WHERE state_hash=$1`,
        [sha(state)]
      );
      return result;
    });
  }

  prepare(token: string, csrf: string, requested: ResolvedAuthorityIntent, payload: Record<string, unknown>) {
    if (!isInternalAuthorityIntent(requested) || JSON.stringify(payload).length > 16_384) {
      throw new AppError("VALIDATION_FAILED", "Interni opseg ili sadržaj nisu valjani.");
    }
    return this.transaction(async db => {
      const session = await this.session(db, sha(token));
      this.csrf(session, csrf);
      // Resolve preparation history from the locked target, never a caller's person list.
      const key = internalScopeKey(requested.scope);
      await db.query("SELECT set_config('bss.internal_scope',$1,true)", [key]);
      const target = (await db.query<Target>("SELECT *,revision::text FROM bss_internal.targets WHERE scope_key=$1 FOR UPDATE", [key])).rows[0];
      if (!target) deny("FORBIDDEN");
      const intent: ResolvedAuthorityIntent = requested.action === "VERIFY_ONBOARDING"
        ? { action: requested.action, scope: requested.scope, preparerPersonIds: target.preparer_ids }
        : requested;
      const checked = await this.authority(db, session, intent);
      const id = randomUUID();
      const row = (await db.query<Operation>(
        `INSERT INTO bss_internal.operations(id,person_id,session_hash,grant_id,grant_revision,scope_key,target_revision,
           target_hash,intent,payload,fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [id, session.person_id, session.token_hash, checked.grantId, checked.grantRevision, checked.target.scope_key,
          checked.target.revision, targetHash(checked.target), JSON.stringify(intent), JSON.stringify(payload), fingerprint(payload)]
      )).rows[0]!;
      return { operationId: id, ...await this.flow(db, row) };
    });
  }

  perform(token: string, csrf: string, operationId: string, payload: Record<string, unknown>, effect: InternalEffect) {
    return this.transaction(async db => {
      const session = await this.session(db, sha(token));
      this.csrf(session, csrf);
      const op = await this.operation(db, operationId);
      const checked = await this.authority(db, session, op.intent);
      if (fingerprint(payload) !== op.fingerprint) deny("CONFLICT");
      const existing = (await db.query<{ result: Record<string, unknown> }>(
        "SELECT result FROM bss_internal.receipts WHERE operation_id=$1", [op.id]
      )).rows[0];
      if (existing) return existing.result;
      if (op.person_id !== session.person_id || op.session_hash !== session.token_hash) deny("FORBIDDEN");
      if (op.used || !op.proof_authenticated_at || Number(op.proof_expires_at) <= now()) deny("UNAUTHENTICATED");
      if (checked.grantId !== op.grant_id || checked.grantRevision !== op.grant_revision ||
          checked.target.revision !== op.target_revision || targetHash(checked.target) !== op.target_hash) deny("CONFLICT");
      const result = await effect(db, op.intent, op.payload);
      await db.query("INSERT INTO bss_internal.receipts(operation_id,original_person_id,grant_revision,result) VALUES($1,$2,$3,$4)",
        [op.id, op.person_id, op.grant_revision, JSON.stringify(result)]);
      await db.query("INSERT INTO bss_internal.audit(operation_id,original_person_id,grant_revision,fingerprint,target_hash) VALUES($1,$2,$3,$4,$5)",
        [op.id, op.person_id, op.grant_revision, op.fingerprint, op.target_hash]);
      await db.query("UPDATE bss_internal.operations SET used=true WHERE id=$1", [op.id]);
      return result;
    });
  }

  read(token: string, operationId: string) {
    return this.transaction(async db => {
      const session = await this.session(db, sha(token));
      const op = await this.operation(db, operationId);
      await this.authority(db, session, op.intent);
      const result = (await db.query<{ result: Record<string, unknown> }>(
        "SELECT result FROM bss_internal.receipts WHERE operation_id=$1", [op.id]
      )).rows[0];
      if (!result) deny("NOT_FOUND");
      return result.result;
    });
  }
}
