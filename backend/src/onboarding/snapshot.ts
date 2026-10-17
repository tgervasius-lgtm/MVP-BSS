import type { TenantTransaction } from "../db/tenant.js";
import type { Snapshot } from "./evaluation.js";

// All identifiers/expressions below are static source constants. One statement
// supplies one MVCC snapshot. Only counts/fingerprints cross the DB boundary;
// password/token/card/terminal secrets and personal values are never selected.
const sql = String.raw`SELECT jsonb_build_object(
  'organization', (SELECT jsonb_build_object('configured',status='active' AND length(btrim(name))>=2,
    'timezone',timezone,'fingerprint',encode(public.digest(jsonb_build_array(id,revision::text,name,timezone,status)::text,'sha256'),'hex'))
    FROM organizations WHERE id=$1),
  'departments', (SELECT jsonb_build_object('fingerprint', encode(public.digest(COALESCE(string_agg(jsonb_build_array(id,revision::text,status)::text, E'\n' ORDER BY id), ''), 'sha256'), 'hex'), 'active',count(*) FILTER(WHERE status='active')) FROM departments WHERE organization_id=$1),
  'shifts', (SELECT jsonb_build_object('fingerprint', encode(public.digest(COALESCE(string_agg(jsonb_build_array(id,revision::text,status,start_time,end_time,break_minutes,tolerance_minutes)::text, E'\n' ORDER BY id), ''), 'sha256'), 'hex'), 'active',count(*) FILTER(WHERE status='active')) FROM shifts WHERE organization_id=$1),
  'holidays', (SELECT jsonb_build_object('fingerprint', encode(public.digest(COALESCE(string_agg(jsonb_build_array(id,revision::text,holiday_date)::text, E'\n' ORDER BY id), ''), 'sha256'), 'hex')) FROM holidays WHERE organization_id=$1),
  'calendars', (SELECT jsonb_build_object('fingerprint', encode(public.digest(COALESCE(string_agg(jsonb_build_array(year,revision::text)::text, E'\n' ORDER BY year), ''), 'sha256'), 'hex')) FROM holiday_calendars WHERE organization_id=$1),
  'workers', (SELECT jsonb_build_object('fingerprint',encode(public.digest(COALESCE(string_agg(jsonb_build_array(w.id,w.revision::text,w.status,w.department_id,w.shift_id,w.annual_leave_allowance)::text, E'\n' ORDER BY w.id), ''), 'sha256'), 'hex'),
    'active',count(*) FILTER(WHERE w.status='active'),
    'invalid',count(*) FILTER(WHERE w.status='active' AND (
      NOT EXISTS(SELECT 1 FROM departments d WHERE d.organization_id=$1 AND d.id=w.department_id AND d.status='active') OR
      NOT EXISTS(SELECT 1 FROM shifts s WHERE s.organization_id=$1 AND s.id=w.shift_id AND s.status='active'))))
    FROM workers w WHERE w.organization_id=$1),
  'users', (SELECT jsonb_build_object('fingerprint', encode(public.digest(COALESCE(string_agg(jsonb_build_array(id,revision::text,role,status,worker_id,password_changed_at,(password_hash IS NOT NULL))::text, E'\n' ORDER BY id), ''), 'sha256'), 'hex'), 'admins',count(*) FILTER(WHERE status='active' AND role='admin' AND password_hash IS NOT NULL)) FROM users WHERE organization_id=$1),
  'invitations', (SELECT jsonb_build_object('fingerprint', encode(public.digest(COALESCE(string_agg(jsonb_build_array(id,role,worker_id,expires_at,accepted_at,revoked_at)::text, E'\n' ORDER BY id), ''), 'sha256'), 'hex'), 'pending',count(*) FILTER(WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at>statement_timestamp())) FROM user_invitations WHERE organization_id=$1),
  'scopes', (SELECT jsonb_build_object('fingerprint', encode(public.digest(COALESCE(string_agg(jsonb_build_array(user_id,department_id)::text, E'\n' ORDER BY user_id,department_id), ''), 'sha256'), 'hex')) FROM user_department_scopes WHERE organization_id=$1),
  'terminals', (SELECT jsonb_build_object('fingerprint',encode(public.digest(COALESCE(string_agg(jsonb_build_array(t.id,t.revision::text,t.status)::text, E'\n' ORDER BY t.id), ''), 'sha256'), 'hex'),
    'paired',count(*) FILTER(WHERE t.status='active' AND EXISTS(SELECT 1 FROM terminal_credentials c
      WHERE c.organization_id=$1 AND c.terminal_id=t.id AND c.revoked_at IS NULL AND c.valid_from<=statement_timestamp()
      AND (c.valid_to IS NULL OR c.valid_to>statement_timestamp())))) FROM terminals t WHERE t.organization_id=$1),
  'credentials', (SELECT jsonb_build_object('fingerprint', encode(public.digest(COALESCE(string_agg(jsonb_build_array(id,terminal_id,key_version,acknowledgement_key_version,valid_from,valid_to,revoked_at)::text, E'\n' ORDER BY id), ''), 'sha256'), 'hex')) FROM terminal_credentials WHERE organization_id=$1),
  'cards', (SELECT jsonb_build_object('fingerprint',
    (SELECT encode(public.digest(COALESCE(string_agg(jsonb_build_array(id,revision::text,worker_id,status,valid_from,valid_to)::text, E'\n' ORDER BY id), ''), 'sha256'), 'hex') FROM rfid_cards WHERE organization_id=$1),
    'covered',count(*) FILTER(WHERE w.status='active' AND EXISTS(SELECT 1 FROM rfid_cards c
      WHERE c.organization_id=$1 AND c.worker_id=w.id AND c.status='active' AND c.valid_from<=statement_timestamp()
      AND (c.valid_to IS NULL OR c.valid_to>statement_timestamp())))) FROM workers w WHERE w.organization_id=$1)
) AS snapshot`;

export async function loadSnapshot(client: TenantTransaction, organizationId: string): Promise<Snapshot> {
  return (await client.query<{ snapshot: Snapshot }>(sql, [organizationId])).rows[0]!.snapshot;
}
