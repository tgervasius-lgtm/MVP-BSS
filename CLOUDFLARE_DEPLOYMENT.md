# BSS Cloudflare Pages sigurnosna ograda

| Postavka | Vrijednost |
| --- | --- |
| Pages projekt | `mvp-bss` |
| Produkcijska grana | `main` |
| Build naredba | `npm run build` |
| Izlazna mapa | `dist` |
| Root direktorij | repozitorij |

## Pravila objave

1. Svaka razvojna promjena ide kroz `agent/*` granu i Cloudflare branch preview.
2. GitHub Actions samo gradi i testira; nema naredbu za Cloudflare produkcijski deploy.
3. `main` se ne spaja automatski i produkcija se ne mijenja bez odobrenja Product Ownera.
4. Preview mora učitati aplikaciju, Design System i Brand Book te proći mobilni i desktop smoke.
5. Build izlaz je deterministički `dist/`; `wrangler.toml` ne sadrži tajne, account ID ni API token.
6. Cloudflare varijable i pristupne politike ostaju u dashboardu i nikada se ne zapisuju u repozitorij.

## Ručna kontrola prije spajanja

- GitHub quality workflow je zelen;
- branch je usklađen s `main`;
- Cloudflare preview nema 4xx/5xx assete ni konzolne greške;
- administrator vidi cijelu firmu, voditelj svoj opseg, radnik sebe, knjigovođa read-only podatke;
- nema promjene zamrznutog MVP opsega.
