import { randomUUID } from "node:crypto";
import { migrateUp } from "../../src/db/migrate.js";
import type { ActorContext } from "../../src/domain/types.js";
import { PgOnboardingStore } from "../../src/onboarding/pg-onboarding-store.js";
import { createPostgresFixture } from "./postgres-fixture.js";

export async function onboardingFixture(url: string) {
  const fixture=await createPostgresFixture(url,"onboarding",4);
  try {
    const {owner,role,appPool}=fixture;
    await migrateUp(owner);
    await owner.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await owner.query(`GRANT SELECT ON organizations,departments,shifts,holidays,holiday_calendars,workers,users,user_invitations,
      user_department_scopes,terminals,terminal_credentials,rfid_cards,onboarding_sessions,onboarding_evidence,onboarding_evaluations TO ${role}`);
    await owner.query(`GRANT UPDATE ON onboarding_sessions TO ${role}`);
    await owner.query(`GRANT INSERT ON onboarding_evidence,onboarding_evaluations,audit_events TO ${role}`);
    const tenants:Array<{actor:ActorContext;department:string;shift:string;id:string}>=[];
    for(let i=0;i<2;i++){
      const org=(await owner.query<{id:string}>("INSERT INTO organizations(name) VALUES('Synthetic onboarding fixture') RETURNING id")).rows[0]!.id;
      const user=(await owner.query<{id:string}>("INSERT INTO users(organization_id,email,role,password_hash) VALUES($1,$2,'admin','synthetic-not-a-login-hash') RETURNING id",
        [org,randomUUID()+"@example.invalid"])).rows[0]!.id;
      const department=(await owner.query<{id:string}>("INSERT INTO departments(organization_id,name) VALUES($1,'Synthetic department') RETURNING id",[org])).rows[0]!.id;
      const shift=(await owner.query<{id:string}>(`INSERT INTO shifts(organization_id,name,start_time,end_time,break_minutes,tolerance_minutes)
        VALUES($1,'Synthetic day','08:00','16:00',30,5) RETURNING id`,[org])).rows[0]!.id;
      const id=(await owner.query<{id:string}>(`INSERT INTO onboarding_sessions(organization_id,profile,contract_version,provisioning_reference)
        VALUES($1,'INTERNAL','BSS-v1.0','SYNTHETIC-FIXTURE-ONLY') RETURNING id`,[org])).rows[0]!.id;
      tenants.push({actor:{organizationId:org,userId:user,role:"admin",departmentIds:[],selfWorkerId:null,sessionId:randomUUID()},department,shift,id});
    }
    const first=tenants[0]!,other=tenants[1]!,store=new PgOnboardingStore(appPool,"INTERNAL");
    const input=(configurationChecksum:string,reference="register:synthetic-1")=>({configurationChecksum,items:[{step:"DRY_RUN" as const,reference,note:"Synthetic proof note"}]});
    return {...fixture,first,other,store,input};
  } catch(error){await fixture.dispose();throw error;}
}
