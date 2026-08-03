## Poslovni cilj

<!-- Koji BSS problem rješava ova promjena i kome? -->

## Opseg i granice

<!-- Što je uključeno, a što namjerno nije? -->

## Rizik i povrat

<!-- Tenant/RBAC, podaci, migracije, kompatibilnost, rollback. -->

## Dokaz

<!-- Navedite konkretne testove, snimke ili ručne scenarije. -->

### Definition of done

- [ ] Promjena je mali, fokusirani PR bez nepovezanog refaktora.
- [ ] OpenAPI, Fastify schema, frontend binding i dokumentacija usklađeni su ako se ugovor mijenja.
- [ ] Nova poslovna mutacija ima audit trag bez tajni i nepotrebnih osobnih podataka.
- [ ] Dodani su pozitivni i negativni RBAC/cross-tenant testovi gdje su primjenjivi.
- [ ] Migracija ima novi `up/down` par, constraint/RLS i ažurirane runtime grantove gdje su primjenjivi.
- [ ] `npm run check`, dependency audit, PostgreSQL i browser gateovi prolaze.
- [ ] Arhitektonski budžet prolazi; veliki legacy moduli nisu dodatno povećani.
- [ ] Operativni utjecaj, rollout i rollback jasno su navedeni.
- [ ] Nisu dodani ključevi, tokeni, lozinke ni lokalni `.env` sadržaj.
