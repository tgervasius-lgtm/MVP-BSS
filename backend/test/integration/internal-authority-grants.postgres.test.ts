import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyInternalDraftGrants } from "../helpers/internal-grants.js";
import { createPostgresFixture } from "../helpers/postgres-fixture.js";

const url = process.env.BSS_TEST_DATABASE_URL;
const options = { timeout: 30_000, skip: !url && process.env.BSS_REQUIRE_POSTGRES_TESTS !== "true" };
async function fixture(t: test.TestContext) {
  assert.ok(url,"Explicit disposable PostgreSQL URL required");
  const f = await createPostgresFixture(url,"internal_grants");
  const extraRoles: string[] = [];
  t.after(async()=>{
    for (const role of extraRoles) {
      await f.owner.query(`REASSIGN OWNED BY ${role} TO CURRENT_USER; DROP OWNED BY ${role}; DROP ROLE ${role}`);
    }
    await f.dispose();
  });
  const ddl = await readFile(new URL("../../internal-authority-migrations/022_internal_authority_draft.up.sql",import.meta.url),"utf8");
  await f.owner.query("BEGIN;"+ddl+"COMMIT;");
  const ownerUrl = new URL(url); ownerUrl.pathname="/"+f.databaseName;
  const apply = (role: string | undefined=f.role)=>applyInternalDraftGrants(ownerUrl.toString(),role);
  const snapshot = async()=> (await f.owner.query(`SELECT
    (SELECT nspacl::text FROM pg_namespace WHERE nspname='bss_internal') AS schema_acl,
    (SELECT jsonb_agg(jsonb_build_array(c.relname,c.relacl::text) ORDER BY c.relname)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bss_internal') AS tables,
    (SELECT jsonb_agg(jsonb_build_array(c.relname,a.attname,a.attacl::text) ORDER BY c.relname,a.attnum)
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='bss_internal' AND a.attnum>0 AND NOT a.attisdropped) AS columns,
    (SELECT jsonb_build_array(rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication) FROM pg_roles WHERE rolname=$1) AS attributes`,[f.role])).rows[0];
  async function rejected(pattern: RegExp) {
    const before = await snapshot();
    const result = await apply();
    assert.equal(result.code,3,result.stderr); assert.match(result.stderr,pattern);
    assert.deepEqual(await snapshot(),before,"Rejected bootstrap must leave role attributes and ACLs unchanged");
  }
  return {...f,extraRoles,ownerUrl,apply,snapshot,rejected};
}

test("whole psql bootstrap succeeds for a clean role and is safely repeatable",options,async t=>{
  const f=await fixture(t);
  assert.equal((await f.apply()).code,0);
  const state=await f.snapshot();
  const repeated=await f.apply();assert.equal(repeated.code,0,repeated.stderr);
  assert.deepEqual(await f.snapshot(),state);
  const rights=(await f.owner.query(`SELECT has_schema_privilege($1,'bss_internal','USAGE') AS usage,
    has_column_privilege($1,'bss_internal.operations','used','UPDATE') AS proof,
    has_column_privilege($1,'bss_internal.grants','revision','UPDATE') AS mutate_grant,
    has_table_privilege($1,'bss_internal.audit','SELECT') AS read_audit`,[f.role])).rows[0];
  assert.deepEqual(rights,{usage:true,proof:true,mutate_grant:false,read_audit:false});
});

test("whole psql bootstrap rejects direct table, column, PUBLIC and grant-option excess without changing them",options,async t=>{
  const f=await fixture(t);
  for (const [grant,revoke] of [
    [`GRANT UPDATE ON bss_internal.grants TO ${f.role}`,`REVOKE UPDATE ON bss_internal.grants FROM ${f.role}`],
    [`GRANT UPDATE(revision) ON bss_internal.grants TO ${f.role}`,`REVOKE UPDATE(revision) ON bss_internal.grants FROM ${f.role}`],
    ["GRANT UPDATE ON bss_internal.targets TO PUBLIC","REVOKE UPDATE ON bss_internal.targets FROM PUBLIC"],
    [`GRANT SELECT ON bss_internal.people TO ${f.role} WITH GRANT OPTION`,`REVOKE SELECT ON bss_internal.people FROM ${f.role}`],
    [`GRANT SELECT(original_person_id) ON bss_internal.audit TO ${f.role}`,`REVOKE SELECT(original_person_id) ON bss_internal.audit FROM ${f.role}`]
  ]) {
    await f.owner.query(grant!); await f.rejected(/Unexpected internal (table|column) privileges/); await f.owner.query(revoke!);
  }
});

test("whole psql bootstrap rejects inheritance, SET ROLE paths and incoming members",options,async t=>{
  const f=await fixture(t); const parent="bss_parent_"+f.suffix; f.extraRoles.push(parent);
  await f.owner.query(`CREATE ROLE ${parent} NOSUPERUSER NOBYPASSRLS`);
  await f.owner.query(`GRANT UPDATE ON bss_internal.grants TO ${parent}`);
  await f.owner.query(`GRANT ${parent} TO ${f.role} WITH INHERIT FALSE, SET TRUE`);
  await f.rejected(/must have no role memberships/);
  await f.owner.query(`REVOKE ${parent} FROM ${f.role}; GRANT ${parent} TO ${f.role} WITH INHERIT TRUE, SET FALSE`);
  await f.rejected(/must have no role memberships/);
  await f.owner.query(`REVOKE ${parent} FROM ${f.role}; GRANT ${f.role} TO ${parent}`);
  await f.rejected(/must have no role memberships/);
});

test("whole psql bootstrap rejects a table owner separately from schema ownership and refuses unsafe attributes",options,async t=>{
  const f=await fixture(t);
  await f.owner.query(`GRANT USAGE,CREATE ON SCHEMA bss_internal TO ${f.role}; ALTER TABLE bss_internal.grants OWNER TO ${f.role}; REVOKE CREATE ON SCHEMA bss_internal FROM ${f.role}`);
  await f.rejected(/must not own database objects/);
  await f.owner.query(`ALTER TABLE bss_internal.grants OWNER TO CURRENT_USER; ALTER ROLE ${f.role} BYPASSRLS`);
  await f.rejected(/pre-approved safe LOGIN attributes/);
});

test("whole psql bootstrap stops and rolls all grants back on a real mid-script SQL failure",options,async t=>{
  const f=await fixture(t);
  await f.owner.query(`CREATE FUNCTION public.synthetic_grant_failure() RETURNS event_trigger LANGUAGE plpgsql AS $$
    BEGIN IF position('GRANT INSERT ON bss_internal.sessions' in current_query())>0 THEN
      RAISE EXCEPTION 'synthetic mid-grant failure'; END IF; END $$;
    CREATE EVENT TRIGGER synthetic_grant_outage ON ddl_command_end WHEN TAG IN ('GRANT') EXECUTE FUNCTION public.synthetic_grant_failure()`);
  await f.rejected(/synthetic mid-grant failure/);
  await f.owner.query("DROP EVENT TRIGGER synthetic_grant_outage");
  assert.equal((await f.apply()).code,0);
});

test("whole psql bootstrap refuses an unapproved caller and a missing role variable",options,async t=>{
  const f=await fixture(t);
  const caller=await applyInternalDraftGrants(f.appUrl.toString(),f.role);
  assert.equal(caller.code,3);assert.match(caller.stderr,/approved registry owner/);
  const missing=await applyInternalDraftGrants(f.ownerUrl.toString());
  assert.equal(missing.code,3);assert.match(missing.stderr,/Missing internal_role/);
});


test("whole psql bootstrap works for a non-superuser registry owner without changing role attributes",options,async t=>{
  const f=await fixture(t);const installer="bss_installer_"+f.suffix;f.extraRoles.push(installer);
  const password="test-"+f.suffix;
  await f.owner.query(`CREATE ROLE ${installer} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB`);
  await f.owner.query(`GRANT CREATE ON DATABASE ${f.databaseName} TO ${installer}; ALTER SCHEMA bss_internal OWNER TO ${installer}`);
  for(const table of ["people","identities","sessions","targets","grants","operations","flows","receipts","audit"]){
    await f.owner.query(`ALTER TABLE bss_internal.${table} OWNER TO ${installer}`);
  }
  const caller=new URL(f.ownerUrl);caller.username=installer;caller.password=password;
  const result=await applyInternalDraftGrants(caller.toString(),f.role);
  assert.equal(result.code,0,result.stderr);assert.doesNotMatch(result.stderr,/ERROR/);
  assert.equal((await f.owner.query("SELECT rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb AS unsafe FROM pg_roles WHERE rolname=$1",[f.role])).rows[0].unsafe,false);
});
