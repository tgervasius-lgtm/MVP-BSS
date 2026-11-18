-- DRAFT ONLY. Review and apply to a separate internal runtime, never a customer runtime.
\if :{?internal_role}
\else
  \echo 'Missing internal_role'
  \quit 3
\endif
SELECT EXISTS (
  SELECT 1 FROM pg_namespace n WHERE n.nspname='bss_internal'
    AND pg_has_role(:'internal_role',n.nspowner,'MEMBER')
) AS owns_internal_schema \gset
\if :owns_internal_schema
  \echo 'Internal runtime must not own or inherit the registry schema'
  \quit 3
\endif
ALTER ROLE :"internal_role" NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA bss_internal TO :"internal_role";
GRANT SELECT ON bss_internal.people,bss_internal.identities,bss_internal.sessions,
  bss_internal.targets,bss_internal.grants,bss_internal.operations,bss_internal.flows,
  bss_internal.receipts TO :"internal_role";
GRANT INSERT ON bss_internal.sessions,bss_internal.operations,bss_internal.flows,
  bss_internal.receipts,bss_internal.audit TO :"internal_role";
GRANT UPDATE(lock_marker) ON bss_internal.people,bss_internal.identities,bss_internal.sessions,
  bss_internal.targets,bss_internal.grants TO :"internal_role";
GRANT UPDATE(proof_authenticated_at,proof_expires_at,used)
  ON bss_internal.operations TO :"internal_role";
GRANT UPDATE(used,verifier_ciphertext,verifier_iv,verifier_tag)
  ON bss_internal.flows TO :"internal_role";
