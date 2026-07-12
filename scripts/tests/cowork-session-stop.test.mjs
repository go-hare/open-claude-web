import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { stopCoworkSession } = await vite.ssrLoadModule(
  "/src/features/cowork/session/coworkSessionStop.ts",
);

after(async () => {
  await vite.close();
});

test("stops through the official bridge without forcing transcript hydration", async () => {
  const calls = [];
  await stopCoworkSession({ stop: async (sessionId) => { calls.push(sessionId); } }, "session-1");
  assert.deepEqual(calls, ["session-1"]);
});
