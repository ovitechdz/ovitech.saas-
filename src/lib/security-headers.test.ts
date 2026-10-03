import { describe, it } from "node:test";
import assert from "node:assert/strict";
import securityHeadersMiddleware, {
  HEADER_COUNT,
  SECURITY_HEADERS,
} from "../../server/middleware/security-headers.ts";

describe("SECURITY_HEADERS", () => {
  it("définit les quatre en-têtes défensifs attendus", () => {
    assert.equal(HEADER_COUNT, 4);
    assert.equal(SECURITY_HEADERS["x-content-type-options"], "nosniff");
    assert.equal(SECURITY_HEADERS["x-frame-options"], "SAMEORIGIN");
    assert.equal(SECURITY_HEADERS["referrer-policy"], "strict-origin-when-cross-origin");
    assert.match(SECURITY_HEADERS["content-security-policy"] ?? "", /frame-ancestors 'self'/);
  });

  it("n'autorise jamais de politique script/style restrictive accidentelle", () => {
    const csp = SECURITY_HEADERS["content-security-policy"] ?? "";
    assert.ok(!csp.includes("script-src"), "CSP script-src non autorisée sans couverture E2E");
    assert.ok(!csp.includes("style-src"), "CSP style-src non autorisée sans couverture E2E");
  });

  it("applique les en-têtes sur event.node.res puis laisse passer next()", async () => {
    const set = new Map<string, string>();
    const event = {
      node: { res: { setHeader: (name: string, value: string) => set.set(name.toLowerCase(), value) } },
    };
    const response = { status: 200 } as unknown as Response;
    const result = await securityHeadersMiddleware(
      event as Parameters<typeof securityHeadersMiddleware>[0],
      async () => response,
    );
    assert.equal(result, response);
    assert.equal(set.size, HEADER_COUNT);
    assert.equal(set.get("x-content-type-options"), "nosniff");
    assert.equal(set.get("referrer-policy"), "strict-origin-when-cross-origin");
  });

  it("résiste à un event sans node/ressource inexistante", async () => {
    const response = { status: 500 } as unknown as Response;
    const result = await securityHeadersMiddleware(
      {} as Parameters<typeof securityHeadersMiddleware>[0],
      async () => response,
    );
    assert.equal(result, response);
  });
});