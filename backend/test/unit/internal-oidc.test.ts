import assert from "node:assert/strict";
import test from "node:test";
import { InternalOidc } from "../../src/onboarding-authority/oidc.js";
import { internalOidcFixture } from "../helpers/internal-oidc.js";

test("internal OIDC pins issuer/client/nonce, verifies RS256, enforces PKCE and handles key rotation", async () => {
  const f = internalOidcFixture();
  const oidc = new InternalOidc(f.config, f.request);
  const verifier = "a".repeat(43);
  const url = oidc.authorizationUrl("state", "nonce", verifier);
  const identity = await oidc.exchange(f.issue(url), verifier, "nonce");
  assert.equal(identity.subject, "synthetic-reviewer");
  assert.deepEqual(identity.methods, ["bss-passkey"]);
  await assert.rejects(oidc.exchange(f.issue(url), "wrong-verifier", "nonce"), { code: "UNAUTHENTICATED" });
  for (const claims of [
    { iss: "https://foreign.example.test" }, { aud: "foreign-client" }, { nonce: "different" },
    { exp: 1 }, { auth_time: Math.floor(Date.now() / 1000) + 600 }, { nbf: Math.floor(Date.now() / 1000) + 600 }
  ]) {
    await assert.rejects(oidc.exchange(f.issue(url, claims), verifier, "nonce"), { code: "UNAUTHENTICATED" });
  }
  await assert.rejects(oidc.exchange(f.issue(url, {}, { alg: "HS256" }), verifier, "nonce"), { code: "UNAUTHENTICATED" });
  const old = f.issue(url);
  f.rotate();
  await assert.rejects(oidc.exchange(old, verifier, "nonce"), { code: "UNAUTHENTICATED" });
  assert.equal((await oidc.exchange(f.issue(url), verifier, "nonce")).subject, "synthetic-reviewer");
});

test("internal OIDC rejects insecure and foreign configured endpoints", () => {
  const f = internalOidcFixture();
  assert.throws(() => new InternalOidc({ ...f.config, jwksEndpoint: "https://foreign.example.test/certs" }));
  assert.throws(() => new InternalOidc({ ...f.config, issuer: "http://idp.example.test" }));
});
