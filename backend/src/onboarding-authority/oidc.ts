import { createHash, createPublicKey, verify } from "node:crypto";
import { AppError } from "../domain/errors.js";

export type InternalOidcConfig = Readonly<{
  issuer: string;
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
  redirectUri: string;
  passkeyMethod: string;
}>;
export type InternalIdentity = Readonly<{
  issuer: string;
  subject: string;
  authenticatedAt: number;
  expiresAt: number;
  methods: readonly string[];
}>;

function denied(): never {
  throw new AppError("UNAUTHENTICATED", "Interna potvrda prijave nije valjana.");
}
function endpoint(value: string): URL {
  const url = new URL(value);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.hash || (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))) {
    throw new Error("Internal OIDC endpoints require HTTPS or an isolated loopback");
  }
  return url;
}

export class InternalOidc {
  constructor(readonly config: InternalOidcConfig, private readonly request: typeof fetch = fetch) {
    const issuer = endpoint(config.issuer);
    for (const value of [config.authorizationEndpoint, config.tokenEndpoint, config.jwksEndpoint]) {
      if (endpoint(value).origin !== issuer.origin) throw new Error("Pin internal OIDC endpoints to the issuer origin");
    }
    endpoint(config.redirectUri);
    if (!config.clientId || !config.passkeyMethod) throw new Error("Internal OIDC client and authentication method are required");
  }

  authorizationUrl(state: string, nonce: string, verifier: string): string {
    const url = new URL(this.config.authorizationEndpoint);
    url.search = new URLSearchParams({
      client_id: this.config.clientId, redirect_uri: this.config.redirectUri,
      response_type: "code", scope: "openid", state, nonce, max_age: "0",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256"
    }).toString();
    return url.toString();
  }

  private async json(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
    const response = await this.request(url, { ...init, redirect: "error", signal: AbortSignal.timeout(3_000) });
    if (!response.ok || !response.body) denied();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 65_536) denied();
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel();
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) denied();
    return parsed as Record<string, unknown>;
  }

  async exchange(code: string, verifier: string, nonce: string): Promise<InternalIdentity> {
    try {
      if (!code || code.length > 4_096) denied();
      const token = await this.json(this.config.tokenEndpoint, {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", client_id: this.config.clientId,
          redirect_uri: this.config.redirectUri, code, code_verifier: verifier })
      });
      if (typeof token.id_token !== "string" || token.id_token.length > 16_384) denied();
      const parts = token.id_token.split(".");
      if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) denied();
      const header = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf8")) as Record<string, unknown>;
      if (header.alg !== "RS256" || typeof header.kid !== "string" || header.crit !== undefined) denied();
      const keys = await this.json(this.config.jwksEndpoint);
      if (!Array.isArray(keys.keys) || keys.keys.length > 32) denied();
      const candidates = keys.keys.filter((key: Record<string, unknown>) =>
        key.kid === header.kid && key.kty === "RSA" && key.use === "sig" &&
        (key.alg === undefined || key.alg === "RS256"));
      if (candidates.length !== 1) denied();
      const key = createPublicKey({ key: candidates[0], format: "jwk" });
      if ((key.asymmetricKeyDetails?.modulusLength ?? 0) < 2_048 ||
          !verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), key, Buffer.from(parts[2]!, "base64url"))) denied();
      const claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Record<string, unknown>;
      const now = Math.floor(Date.now() / 1_000);
      if (claims.iss !== this.config.issuer || claims.aud !== this.config.clientId ||
          (claims.azp !== undefined && claims.azp !== this.config.clientId) || claims.nonce !== nonce ||
          typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255 ||
          !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.auth_time) ||
          !Number.isSafeInteger(claims.iat) || Number(claims.exp) <= now || Number(claims.iat) > now ||
          Number(claims.auth_time) < 0 || Number(claims.auth_time) > Number(claims.iat) ||
          Number(claims.auth_time) > now ||
          (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || Number(claims.nbf) > now))) denied();
      const methods = Array.isArray(claims.amr) && claims.amr.every(method => typeof method === "string") ? claims.amr as string[] : [];
      return { issuer: claims.iss as string, subject: claims.sub, authenticatedAt: Number(claims.auth_time),
        expiresAt: Number(claims.exp), methods };
    } catch {
      return denied();
    }
  }
}
