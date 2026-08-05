# syntax=docker/dockerfile:1.7
FROM node:22.9.0-bookworm-slim AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY backend ./backend
COPY openapi ./openapi
RUN cd backend && npm run check

FROM node:22.9.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
RUN groupadd --system --gid 10001 bss && useradd --system --uid 10001 --gid bss --home /nonexistent bss
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist ./dist
USER bss
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm","start"]
