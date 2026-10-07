import { randomBytes, randomUUID } from 'node:crypto';
import { migrateUp } from '../../src/db/migrate.js';
import type { ActorContext, Role } from '../../src/domain/types.js';
import { PgDocumentService } from '../../src/documents/pg-document-service.js';
import type { DocumentScanner } from '../../src/documents/scanner.js';
import { createPostgresFixture } from './postgres-fixture.js';

export async function documentFixture(url:string, scan:DocumentScanner=async()=>{}) {
  const fixture=await createPostgresFixture(url,'documents',8);
  try {
    const {owner,role,appPool}=fixture;await migrateUp(owner);
    await owner.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await owner.query(`GRANT SELECT ON users,workers,worker_documents,audit_events TO ${role}`);
    await owner.query(`GRANT INSERT ON worker_documents,audit_events TO ${role}`);
    await owner.query(`GRANT UPDATE ON worker_documents TO ${role}`);
    // SELECT FOR SHARE needs an UPDATE privilege on the locked recipient table.
    await owner.query(`GRANT UPDATE (id) ON workers TO ${role}`);
    const tenants=[];
    for(let n=0;n<2;n++){
      const org=(await owner.query("INSERT INTO organizations(name) VALUES ('Document fixture') RETURNING id")).rows[0].id as string;
      const department=(await owner.query("INSERT INTO departments(organization_id,name) VALUES ($1,'Synthetic') RETURNING id",[org])).rows[0].id;
      const shift=(await owner.query("INSERT INTO shifts(organization_id,name,start_time,end_time,break_minutes,tolerance_minutes) VALUES ($1,'Day','08:00','16:00',30,5) RETURNING id",[org])).rows[0].id;
      const workers:string[]=[];
      for(let i=0;i<2;i++) workers.push((await owner.query("INSERT INTO workers(organization_id,code,name,department_id,shift_id,annual_leave_allowance) VALUES ($1,$2,$3,$4,$5,20) RETURNING id",[org,`W-${i}`,`Synthetic ${i}`,department,shift])).rows[0].id);
      async function actor(userRole:Role,worker:string|null=null):Promise<ActorContext>{
        const id=(await owner.query("INSERT INTO users(organization_id,email,role,worker_id) VALUES ($1,$2,$3,$4) RETURNING id",[org,`${randomUUID()}@example.invalid`,userRole,worker])).rows[0].id as string;
        return {organizationId:org,userId:id,role:userRole,departmentIds:[department],selfWorkerId:worker,sessionId:randomUUID()};
      }
      tenants.push({org,workers,admin:await actor('admin'),accountant:await actor('accountant'),manager:await actor('manager'),worker:await actor('worker',workers[0]),otherWorker:await actor('worker',workers[1])});
    }
    const config={ring:{activeId:'test',keys:new Map([['test',randomBytes(32)]])},socketPath:'/fixture-only',quotaBytes:262144000};
    return {...fixture,first:tenants[0]!,other:tenants[1]!,config,service:new PgDocumentService(appPool,config,scan)};
  }catch(e){await fixture.dispose();throw e;}
}
