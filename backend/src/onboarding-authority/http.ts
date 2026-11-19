import Fastify, { type FastifyError } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { AppError } from "../domain/errors.js";
import { PROFILES } from "../onboarding/model.js";
import { INTERNAL_ACTIONS, type ResolvedAuthorityIntent } from "./policy.js";
import { PgInternalAuthority, type InternalEffect } from "./registry.js";

const sessionCookie = "__Host-bss_internal_session";
const flowCookie = "__Host-bss_internal_flow";
const secureCookie = { path: "/", secure: true, httpOnly: true, sameSite: "lax" as const };
const idParams = {
  type: "object", required: ["id"], additionalProperties: false,
  properties: { id: { type: "string", format: "uuid" } }
};
const payloadSchema = { type: "object", maxProperties: 100 };
const payloadBody = {
  type: "object", required: ["payload"], additionalProperties: false,
  properties: { payload: payloadSchema }
};

/** Explicit separate composition only. No listener and no standard-server registration. */
export async function buildInternalAuthorityApp(
  adapter: PgInternalAuthority, effect: InternalEffect, origin: string
) {
  const url = new URL(origin);
  const isolatedLoopback = url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.origin !== origin || (url.protocol !== "https:" && !isolatedLoopback)) {
    throw new Error("Configure an exact internal HTTPS or isolated loopback origin");
  }
  // Callback URLs contain authorization codes. This dedicated app emits no request logs.
  const app = Fastify({ logger: false, bodyLimit: 16_384, exposeHeadRoutes: false });
  await app.register(cookie);
  await app.register(rateLimit, { max: 20, timeWindow: "1 minute" });
  app.addHook("onRequest", (_request, reply, done) => {
    reply.header("cache-control", "no-store").header("referrer-policy", "no-referrer");
    done();
  });
  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    let status = 503;
    let code = "ONBOARDING_UNAVAILABLE";
    if (error instanceof AppError) {
      status = error.statusCode;
      code = error.code;
    } else if (error.validation) {
      status = 422;
      code = "VALIDATION_FAILED";
    } else if (error.statusCode === 429) {
      status = 429;
      code = "RATE_LIMITED";
    }
    return reply.code(status).send({ code, message: "Interni zahtjev nije dovršen." });
  });
  const session = (cookies: Record<string, string | undefined>) => cookies[sessionCookie] ?? "";
  const csrf = (headers: Record<string, unknown>) => {
    if (headers.origin !== origin || typeof headers["x-csrf-token"] !== "string") {
      throw new AppError("FORBIDDEN", "Potrebna je potvrda internog zahtjeva.");
    }
    return headers["x-csrf-token"];
  };

  app.get("/internal/v1/login", async (_request, reply) => {
    const flow = await adapter.beginLogin();
    reply.header("cache-control", "no-store");
    reply.setCookie(flowCookie, flow.flowCookie, { ...secureCookie, maxAge: flow.maxAge });
    return reply.redirect(flow.authorizationUrl);
  });
  app.get<{ Querystring: { state: string; code: string } }>("/internal/v1/callback", {
    schema: { querystring: {
      type: "object", required: ["state", "code"], additionalProperties: true,
      properties: { state: { type: "string", minLength: 40, maxLength: 128 }, code: { type: "string", minLength: 1, maxLength: 4096 } }
    } }
  }, async (request, reply) => {
    const result = await adapter.completeLogin(request.query.state, request.cookies[flowCookie] ?? "", request.query.code);
    reply.clearCookie(flowCookie, secureCookie).header("cache-control", "no-store");
    if ("sessionToken" in result) {
      reply.setCookie(sessionCookie, result.sessionToken, { ...secureCookie, sameSite: "strict" });
      return { authenticated: true, csrfToken: result.csrfToken };
    }
    return result;
  });
  app.post<{ Body: { action: ResolvedAuthorityIntent["action"]; scope: ResolvedAuthorityIntent["scope"]; payload: Record<string, unknown> } }>(
    "/internal/v1/operations", {
      schema: { body: {
        type: "object", required: ["action", "scope", "payload"], additionalProperties: false,
        properties: {
          action: { type: "string", enum: INTERNAL_ACTIONS },
          scope: { type: "object", required: ["environmentId", "profile", "kind", "targetId"], additionalProperties: false,
            properties: { environmentId: { type: "string", minLength: 1, maxLength: 200 }, profile: { type: "string", enum: PROFILES },
              kind: { type: "string", enum: ["PROVISIONING_REQUEST", "TENANT"] },
              targetId: { type: "string", minLength: 1, maxLength: 200 } } },
          payload: payloadSchema
        }
      } }
    }, async (request, reply) => {
      const intent = { action: request.body.action, scope: request.body.scope,
        ...(request.body.action === "VERIFY_ONBOARDING" ? { preparerPersonIds: ["server-resolved"] } : {}) } as ResolvedAuthorityIntent;
      const flow = await adapter.prepare(session(request.cookies), csrf(request.headers), intent, request.body.payload);
      reply.setCookie(flowCookie, flow.flowCookie, { ...secureCookie, maxAge: flow.maxAge }).header("cache-control", "no-store");
      return reply.code(201).send({ operationId: flow.operationId, authorizationUrl: flow.authorizationUrl });
    }
  );
  app.post<{ Params: { id: string }; Body: { payload: Record<string, unknown> } }>(
    "/internal/v1/operations/:id", { schema: { params: idParams, body: payloadBody } }, async (request, reply) => {
      const result = await adapter.perform(session(request.cookies), csrf(request.headers), request.params.id, request.body.payload, effect);
      return reply.header("cache-control", "no-store").send(result);
    }
  );
  app.get<{ Params: { id: string } }>("/internal/v1/operations/:id", { schema: { params: idParams } }, async (request, reply) =>
    reply.header("cache-control", "no-store").send(await adapter.read(session(request.cookies), request.params.id)));
  return app;
}
