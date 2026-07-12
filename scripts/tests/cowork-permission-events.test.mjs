import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const {
  coworkPermissionResolvedId,
  normalizeCoworkPermissionRequest,
} = await vite.ssrLoadModule("/src/features/cowork/session/coworkPermissionEvents.ts");

after(async () => {
  await vite.close();
});

test("permission requests require the official request session id", () => {
  const missingSession = normalizeCoworkPermissionRequest({
    request: { requestId: "request-1", toolName: "Read" },
    type: "tool_permission_request",
  }, "session-1");
  const matching = normalizeCoworkPermissionRequest({
    request: { requestId: "request-1", sessionId: "session-1", suggestions: [{ type: "addRules" }], toolName: "Read" },
    type: "tool_permission_request",
  }, "session-1");

  assert.equal(missingSession, null);
  assert.equal(matching.sessionId, "session-1");
  assert.equal(matching.toolUseId, "request-1");
  assert.deepEqual(matching.suggestions, [{ type: "addRules" }]);
});

test("permission resolutions do not inherit the active session", () => {
  assert.equal(coworkPermissionResolvedId({
    request: { requestId: "request-1" },
    type: "tool_permission_resolved",
  }, "session-1"), null);
  assert.equal(coworkPermissionResolvedId({
    request: { requestId: "request-1", sessionId: "session-1" },
    type: "tool_permission_resolved",
  }, "session-1"), "request-1");
});
