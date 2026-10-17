import { randomUUID } from "node:crypto";
import { PgOnboardingStore } from "../../src/onboarding/pg-onboarding-store.js";
import type { importRuntimeFixture } from "./import-runtime-fixture.js";

// Only called by the explicit, disposable synthetic browser fixture. These
// grants/identities are never imported by the production composition.
export async function prepareOnboardingUi(f: Awaited<ReturnType<typeof importRuntimeFixture>>) {
  await f.owner.query(`GRANT SELECT ON organizations,holidays,holiday_calendars,users,user_invitations,
    user_department_scopes,terminals,terminal_credentials,rfid_cards,
    onboarding_sessions,onboarding_evidence,onboarding_evaluations TO ${f.role}`);
  await f.owner.query(`GRANT UPDATE ON onboarding_sessions TO ${f.role}`);
  await f.owner.query(`GRANT INSERT ON onboarding_evidence,onboarding_evaluations TO ${f.role}`);
  await f.owner.query("UPDATE users SET password_hash='synthetic-not-a-login-hash' WHERE id=ANY($1::uuid[])",
    [[f.first.actor.userId,f.other.actor.userId]]);
  const secondUser=(await f.owner.query<{id:string}>(`INSERT INTO users(organization_id,email,role,password_hash)
    VALUES($1,'second-synthetic@example.invalid','admin','synthetic-not-a-login-hash') RETURNING id`,[f.first.actor.organizationId])).rows[0]!.id;
  const ids:string[]=[];
  for(const actor of [f.first.actor,f.other.actor]){
    const result=await f.owner.query<{id:string}>(`INSERT INTO onboarding_sessions(organization_id,profile,contract_version,provisioning_reference)
      VALUES($1,'INTERNAL','BSS-v1.0','SYNTHETIC-BROWSER-FIXTURE-ONLY') RETURNING id`,[actor.organizationId]);
    ids.push(result.rows[0]!.id);
  }
  return {
    store:new PgOnboardingStore(f.appPool,"INTERNAL"),id:ids[0]!,
    secondActor:{...f.first.actor,userId:secondUser,sessionId:randomUUID()},
    async changeConfiguration(){
      await f.owner.query(`UPDATE organizations SET timezone=CASE WHEN timezone='Europe/Berlin' THEN 'Europe/Zagreb' ELSE 'Europe/Berlin' END
        WHERE id=$1`,[f.first.actor.organizationId]);
    },
    async counts(){
      const result=await f.owner.query<{evidence:string;evaluations:string}>(`SELECT
        (SELECT count(*) FROM onboarding_evidence WHERE organization_id=$1)::text AS evidence,
        (SELECT count(*) FROM onboarding_evaluations WHERE organization_id=$1)::text AS evaluations`,[f.first.actor.organizationId]);
      return {evidence:Number(result.rows[0]!.evidence),evaluations:Number(result.rows[0]!.evaluations)};
    }
  };
}
