import type pg from "pg";
import { AppError, requireRevision } from "../domain/errors.js";
import type { ActorContext } from "../domain/types.js";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { requireRole } from "../security/rbac.js";
import { CONTRACT_VERSION, PROFILES, normalizeWrite, requireChecksum, type Profile, type Evidence, type EvidenceWrite, type Onboarding, type OnboardingService } from "./model.js";
import { evaluateSnapshot } from "./evaluation.js";
import { loadSnapshot } from "./snapshot.js";

type Session = { id: string; revision: string; contract_version: string; evaluated_checksum: string | null; evaluated_at: Date | null };
type EvidenceRow = { id: string; step: Evidence["step"]; reference: string; note: string | null;
  submitted_by: string; submitted_at: Date; configuration_checksum: string };
export class PgOnboardingStore implements OnboardingService {
  constructor(private readonly pool: pg.Pool, private readonly profile: Profile) {
    if (!PROFILES.includes(profile)) throw new Error("Explicit onboarding environment profile required");
  }
  private async session(client: TenantTransaction, actor: ActorContext, lock: boolean): Promise<Session> {
    const result = await client.query<Session>(`SELECT id,revision::text,contract_version,evaluated_checksum,evaluated_at
      FROM onboarding_sessions WHERE organization_id=$1 AND profile=$2 ${lock ? "FOR UPDATE" : "FOR SHARE"}`,
    [actor.organizationId, this.profile]);
    const row = result.rows[0];
    if (!row) throw new AppError("NOT_FOUND", "Priprema korisnika nije uspostavljena za ovaj profil.");
    if (row.contract_version !== CONTRACT_VERSION) throw new AppError("CONFLICT", "Potrebna je provjera verzije ugovora pripreme.");
    return row;
  }
  private async view(client: TenantTransaction, actor: ActorContext, row: Session): Promise<Onboarding> {
    const current = evaluateSnapshot(this.profile, await loadSnapshot(client, actor.organizationId));
    const submittedEvidence = await this.evidence(client, actor, row.id, current.configurationChecksum);
    return { id: row.id, revision: row.revision, profile: this.profile, contractVersion: row.contract_version, ...current,
      evaluatedAt: row.evaluated_at?.toISOString() ?? null, evaluatedConfigurationChecksum: row.evaluated_checksum,
      revalidationRequired: row.evaluated_checksum !== current.configurationChecksum || submittedEvidence.some(value => value.stale),
      submittedEvidence };
  }
  private async evidence(client: TenantTransaction, actor: ActorContext, id: string, checksum: string): Promise<Evidence[]> {
    const values = await client.query<EvidenceRow>(`SELECT id,step,reference,note,submitted_by,submitted_at,configuration_checksum
      FROM onboarding_evidence WHERE organization_id=$1 AND session_id=$2 ORDER BY submitted_revision,id`, [actor.organizationId,id]);
    return values.rows.map(value => ({ id: value.id, step: value.step, reference: value.reference,
      ...(value.note === null ? {} : { note: value.note }), submittedBy: value.submitted_by,
      submittedAt: value.submitted_at.toISOString(), configurationChecksum: value.configuration_checksum,
      verification: "UNVERIFIED", stale: value.configuration_checksum !== checksum }));
  }
  private run<T>(actor: ActorContext, requestId: string, operation: (client: TenantTransaction) => Promise<T>): Promise<T> {
    requireRole(actor,["admin"]);
    return withTenant(this.pool,actor,requestId,operation);
  }
  get(actor: ActorContext, requestId: string): Promise<Onboarding> {
    return this.run(actor,requestId,async client => this.view(client,actor,await this.session(client,actor,false)));
  }
  private reviewed(view: Onboarding, revision: string, checksum: string): void {
    if (view.revision !== revision) throw new AppError("STALE_REVISION", "Priprema je izmijenjena. Ponovno učitajte stanje.");
    if (view.configurationChecksum !== checksum) throw new AppError("CONFLICT", "Konfiguracija je izmijenjena. Ponovno pregledajte preduvjete.");
  }
  private async audit(client: TenantTransaction, actor: ActorContext, sessionId: string, revision: string, action: string, requestId: string) {
    await client.query(`INSERT INTO audit_events(organization_id,actor_type,actor_id,actor_role,action,entity_type,entity_id,after_json,request_id,metadata)
      VALUES($1,'user',$2,'admin',$3,'onboarding',$4,$5::jsonb,$6,'{}'::jsonb)`,
    [actor.organizationId,actor.userId,action,sessionId,JSON.stringify({ revision, profile:this.profile }),requestId]);
  }
  record(actor: ActorContext, revision: string, input: EvidenceWrite, requestId: string): Promise<Onboarding> {
    requireRole(actor,["admin"]);
    const reviewedRevision = requireRevision(revision), body = normalizeWrite(input);
    return this.run(actor,requestId,async client => {
      const row = await this.session(client,actor,true), current = await this.view(client,actor,row);
      this.reviewed(current,reviewedRevision,body.configurationChecksum);
      if (current.submittedEvidence.length + body.items.length > 100) throw new AppError("CONFLICT", "Dosegnuto je ograničenje od 100 referenci na dokaze.");
      const existing = new Set(current.submittedEvidence.map(value => JSON.stringify([value.step,value.reference])));
      if (body.items.some(value => existing.has(JSON.stringify([value.step,value.reference]))))
        throw new AppError("CONFLICT", "Referenca već postoji. Sačuvani zapis ostaje nepromijenjen.");
      const next = (BigInt(row.revision)+1n).toString();
      for (const item of body.items) await client.query(`INSERT INTO onboarding_evidence
        (organization_id,session_id,step,reference,note,submitted_by,submitted_revision,configuration_checksum)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [actor.organizationId,row.id,item.step,item.reference,item.note ?? null,actor.userId,next,current.configurationChecksum]);
      await client.query("UPDATE onboarding_sessions SET revision=$3,evaluated_checksum=NULL,evaluated_at=NULL WHERE organization_id=$1 AND id=$2", [actor.organizationId,row.id,next]);
      await this.audit(client,actor,row.id,next,"onboarding.evidence_recorded",requestId);
      return { ...current, revision:next, evaluatedAt:null, evaluatedConfigurationChecksum:null, revalidationRequired:true,
        submittedEvidence:await this.evidence(client,actor,row.id,current.configurationChecksum) };
    });
  }
  evaluate(actor: ActorContext, revision: string, checksum: string, requestId: string): Promise<Onboarding> {
    requireRole(actor,["admin"]); const reviewedRevision = requireRevision(revision); requireChecksum(checksum);
    return this.run(actor,requestId,async client => {
      const row = await this.session(client,actor,true), current = await this.view(client,actor,row);
      this.reviewed(current,reviewedRevision,checksum);
      const next = (BigInt(row.revision)+1n).toString();
      const stamp = (await client.query<{ evaluated_at:Date }>(`UPDATE onboarding_sessions SET revision=$3,
        evaluated_checksum=$4,evaluated_at=clock_timestamp() WHERE organization_id=$1 AND id=$2 RETURNING evaluated_at`,
      [actor.organizationId,row.id,next,current.configurationChecksum])).rows[0]!.evaluated_at;
      await client.query(`INSERT INTO onboarding_evaluations(organization_id,session_id,revision,configuration_checksum,evaluated_by,blocker_codes)
        VALUES($1,$2,$3,$4,$5,$6::jsonb)`, [actor.organizationId,row.id,next,current.configurationChecksum,actor.userId,
        JSON.stringify(current.blockers.map(value=>value.code))]);
      await this.audit(client,actor,row.id,next,"onboarding.evaluated",requestId);
      return { ...current, revision:next, evaluatedAt:stamp.toISOString(), evaluatedConfigurationChecksum:current.configurationChecksum,
        revalidationRequired:current.submittedEvidence.some(value=>value.stale) };
    });
  }
}
