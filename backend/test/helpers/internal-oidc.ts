import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import type { InternalOidcConfig } from "../../src/onboarding-authority/oidc.js";

export function internalOidcFixture() {
  const config: InternalOidcConfig = {
    issuer: "https://idp.example.test/realm", clientId: "internal-test",
    authorizationEndpoint: "https://idp.example.test/realm/auth",
    tokenEndpoint: "https://idp.example.test/realm/token",
    jwksEndpoint: "https://idp.example.test/realm/certs",
    redirectUri: "https://internal.example.test/internal/v1/callback", passkeyMethod: "bss-passkey"
  };
  let key = generateKeyPairSync("rsa", { modulusLength: 2048 });
  let kid = randomUUID();
  const pending = new Map<string, { token: string; challenge: string }>();
  const rotate = () => {
    key = generateKeyPairSync("rsa", { modulusLength: 2048 });
    kid = randomUUID();
  };
  const issue = (url: string, claims: Record<string, unknown> = {}, header: Record<string, unknown> = {}) => {
    const params = new URL(url).searchParams;
    const now = Math.floor(Date.now() / 1000);
    const encodedHeader = Buffer.from(JSON.stringify({ alg: "RS256", kid, ...header })).toString("base64url");
    const encodedClaims = Buffer.from(JSON.stringify({
      iss: config.issuer, aud: config.clientId, sub: "synthetic-reviewer", nonce: params.get("nonce"),
      iat: now, auth_time: now, exp: now + 600, amr: [config.passkeyMethod], ...claims
    })).toString("base64url");
    const content = encodedHeader + "." + encodedClaims;
    const token = content + "." + sign("RSA-SHA256", Buffer.from(content), key.privateKey).toString("base64url");
    const code = randomUUID();
    pending.set(code, { token, challenge: params.get("code_challenge")! });
    return code;
  };
  const request: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url === config.jwksEndpoint) {
      return Response.json({ keys: [{ ...key.publicKey.export({ format: "jwk" }), use: "sig", alg: "RS256", kid }] });
    }
    if (url !== config.tokenEndpoint) throw new Error("Unexpected fixture endpoint");
    let encoded = "";
    if (init?.body instanceof URLSearchParams) encoded = init.body.toString();
    else if (typeof init?.body === "string") encoded = init.body;
    const params = new URLSearchParams(encoded);
    const entry = pending.get(params.get("code") ?? "");
    if (!entry || entry.challenge !== createHash("sha256").update(params.get("code_verifier") ?? "").digest("base64url") ||
        params.get("redirect_uri") !== config.redirectUri || params.get("client_id") !== config.clientId) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    pending.delete(params.get("code")!);
    return Response.json({ id_token: entry.token });
  };
  return { config, request, issue, rotate };
}
