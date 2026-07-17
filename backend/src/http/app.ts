import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import rawBody from "fastify-raw-body";
import type { AppConfig } from "../config.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext, SessionContext } from "../domain/types.js";
import type { AuthService, MvpService } from "../services/contracts.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerPhaseARoutes } from "./routes/phase-a.js";
import { registerMvpRoutes } from "./routes/mvp.js";

export type AppDependencies = Readonly<{
  config: AppConfig;
  authService: AuthService;
  phaseAService: MvpService;
  logger?: boolean;
  readinessCheck?: () => Promise<void>;
}>;

export type Authenticate = (request: FastifyRequest) => Promise<{ actor: ActorContext; context: SessionContext }>;

function unsafeMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

export async function buildApp(dependencies: AppDependencies): Promise<FastifyInstance> {
  const { config, authService, phaseAService } = dependencies;
  const app = Fastify({
    logger: dependencies.logger ?? {
      level: config.logLevel,
      redact: {
        paths: [
          "req.headers.cookie",
          "req.headers.authorization",
          "req.headers['x-bss-signature']",
          "req.headers['x-bss-nonce']",
          "res.headers['set-cookie']"
        ],
        censor: "[REDACTED]"
      }
    },
    trustProxy: config.trustProxy,
    bodyLimit: 1_048_576,
    ajv: { customOptions: { removeAdditional: false } },
    requestIdHeader: false,
    genReqId: () => crypto.randomUUID()
  });

  await app.register(cookie);
  await app.register(rawBody, { field: "rawBody", global: false, encoding: false, runFirst: true });
  await app.register(rateLimit, {
    global: false,
    max: 10,
    timeWindow: "1 minute",
    errorResponseBuilder: (request) => ({
      code: "RATE_LIMITED",
      message: "Previše pokušaja. Pokušajte ponovno kasnije.",
      requestId: request.id
    })
  });

  app.addHook("onRequest", async (request) => {
    if (!request.url.startsWith("/api/v1") || !unsafeMethod(request.method)) return;
    const path = request.url.split("?")[0] ?? "";
    if (path.startsWith("/api/v1/terminal/v1/")) return;
    const origin = request.headers.origin;
    if (origin !== config.publicOrigin) {
      throw new AppError("FORBIDDEN", "Zahtjev nije poslan s dopuštenog izvora.");
    }
  });

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; font-src 'self'");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    if (config.nodeEnv === "production") reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    if (request.url.startsWith("/api/")) {
      reply.header("Cache-Control", "no-store, private");
      reply.header("Pragma", "no-cache");
    } else if (request.method === "GET" && (request.url === "/" || request.url.startsWith("/index.html") || request.headers.accept?.includes("text/html"))) {
      reply.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    }
    return payload;
  });

  const authenticate: Authenticate = async (request) => {
    const token = request.cookies.bss_session;
    if (!token) throw new AppError("UNAUTHENTICATED", "Nedostaje sigurna sesija.");
    return authService.resolveAccessToken(token);
  };

  await registerAuthRoutes(app, { config, authService, authenticate });
  await registerPhaseARoutes(app, { phaseAService, authenticate });
  await registerMvpRoutes(app, { mvpService: phaseAService, authenticate });

  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async (request, reply) => {
    try {
      await dependencies.readinessCheck?.();
      return { status: "ok" };
    } catch (error) {
      request.log.warn({ err: error }, "Readiness check failed");
      return reply.status(503).send({ status: "unavailable" });
    }
  });

  if (config.frontendRoot) {
    await app.register(fastifyStatic, {
      root: config.frontendRoot,
      prefix: "/",
      cacheControl: false,
      etag: true,
      lastModified: true
    });
  }

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        requestId: request.id,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {})
      });
    }
    const validation = typeof error === "object" && error !== null && "validation" in error
      ? (error as { validation?: Array<{ message?: string }> }).validation
      : undefined;
    if (validation) {
      return reply.status(422).send({
        code: "VALIDATION_FAILED",
        message: "Zahtjev sadrži neispravna polja.",
        requestId: request.id,
        fieldErrors: { request: validation.map((entry) => entry.message ?? "Neispravna vrijednost.") }
      });
    }
    request.log.error({ err: error, requestId: request.id }, "Unhandled request error");
    return reply.status(500).send({
      code: "INTERNAL_ERROR",
      message: "Došlo je do interne pogreške.",
      requestId: request.id
    });
  });

  app.setNotFoundHandler((request, reply) => {
    if (config.frontendRoot && request.method === "GET" && !request.url.startsWith("/api/") && request.headers.accept?.includes("text/html")) {
      reply.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      return reply.sendFile("index.html");
    }
    return reply.status(404).send({ code: "NOT_FOUND", message: "Ruta nije pronađena.", requestId: request.id });
  });

  return app;
}
