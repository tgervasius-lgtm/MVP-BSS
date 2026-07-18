import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AppConfig } from "../../config.js";
import { AppError } from "../../domain/errors.js";
import type { AuthService, RequestMetadata } from "../../services/contracts.js";
import type { Authenticate } from "../app.js";

type Dependencies = Readonly<{
  config: AppConfig;
  authService: AuthService;
  authenticate: Authenticate;
}>;

const loginBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email", maxLength: 320 },
    password: { type: "string", minLength: 12, maxLength: 1024 }
  }
} as const;

function requestMetadata(request: FastifyRequest): RequestMetadata {
  const metadata: { requestId: string; ip: string; userAgent?: string } = { requestId: request.id, ip: request.ip };
  if (request.headers["user-agent"]) metadata.userAgent = request.headers["user-agent"];
  return metadata;
}

export async function registerAuthRoutes(app: FastifyInstance, dependencies: Dependencies): Promise<void> {
  const { config, authService, authenticate } = dependencies;
  const accessCookie = {
    path: "/",
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "strict" as const,
    maxAge: config.accessTokenTtlSeconds
  };
  const refreshCookie = {
    path: "/api/v1/auth",
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "strict" as const,
    maxAge: config.refreshTokenTtlSeconds
  };

  app.post<{ Body: { email: string; password: string } }>(
    "/api/v1/auth/login",
    { schema: { body: loginBodySchema }, config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const result = await authService.login(request.body.email, request.body.password, requestMetadata(request));
      reply.setCookie("bss_session", result.tokens.accessToken, accessCookie);
      reply.setCookie("bss_refresh", result.tokens.refreshToken, refreshCookie);
      return reply.send(result.context);
    }
  );

  app.post<{ Body: { token: string; password: string } }>(
    "/api/v1/auth/invitations/accept",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["token", "password"],
          properties: {
            token: { type: "string", minLength: 32, maxLength: 256 },
            password: { type: "string", minLength: 12, maxLength: 1024 }
          }
        }
      },
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const result = await authService.acceptInvitation(request.body.token, request.body.password, requestMetadata(request));
      reply.setCookie("bss_session", result.tokens.accessToken, accessCookie);
      reply.setCookie("bss_refresh", result.tokens.refreshToken, refreshCookie);
      return reply.send(result.context);
    }
  );

  app.post(
    "/api/v1/auth/refresh",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const refreshToken = request.cookies.bss_refresh;
      if (!refreshToken) throw new AppError("UNAUTHENTICATED", "Nedostaje refresh sesija.");
      const tokens = await authService.rotate(refreshToken, requestMetadata(request));
      reply.setCookie("bss_session", tokens.accessToken, accessCookie);
      reply.setCookie("bss_refresh", tokens.refreshToken, refreshCookie);
      return reply.status(204).send();
    }
  );

  app.post(
    "/api/v1/auth/logout",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      try {
        const refreshToken = request.cookies.bss_refresh;
        if (refreshToken) await authService.logoutByRefreshToken(refreshToken, request.id);
        else if (request.cookies.bss_session) {
          const { actor } = await authenticate(request);
          await authService.logout(actor, request.id);
        }
        return reply.status(204).send();
      } catch (error) {
        // Logout is idempotent for missing/expired credentials. Infrastructure
        // errors still propagate so an operator can see failed revocation.
        if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
          return reply.status(204).send();
        }
        throw error;
      } finally {
        reply.clearCookie("bss_session", { path: "/" });
        reply.clearCookie("bss_refresh", { path: "/api/v1/auth" });
      }
    }
  );

  app.get("/api/v1/me", async (request) => {
    const { context } = await authenticate(request);
    return context;
  });
}
