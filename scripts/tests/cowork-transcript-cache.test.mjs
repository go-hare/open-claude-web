import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { createServer } from "vite";

if (typeof globalThis.window === "undefined") {
  globalThis.window = new EventTarget();
}
if (typeof globalThis.navigator === "undefined") {
  globalThis.navigator = { userAgent: "node" };
}

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const {
  COWORK_TRANSCRIPT_CACHE_BYTE_BUDGET,
  COWORK_TRANSCRIPT_CACHE_MAX_SESSIONS,
  coalesceCoworkTranscriptFetch,
  coworkTranscriptCacheBytesForTests,
  coworkTranscriptCacheSizeForTests,
  invalidateCoworkTranscriptCache,
  lookupCoworkTranscriptCache,
  maybeWriteCoworkTranscriptCache,
  resetCoworkTranscriptCacheForTests,
  writeCoworkTranscriptCache,
} = await vite.ssrLoadModule("/src/features/cowork/session/coworkTranscriptCache.ts");
const { createCoworkSessionRuntime } = await vite.ssrLoadModule(
  "/src/features/cowork/session/coworkSessionRuntime.ts",
);
const { createCoworkMessagePathStore } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkMessagePathStore.ts",
);
const { clearCoworkSessionCaches } = await vite.ssrLoadModule(
  "/src/features/cowork/session/coworkSessionDeletion.ts",
);
const {
  resetCoworkRecentsSnapshotForTests,
  setCoworkRecentsSnapshot,
} = await vite.ssrLoadModule("/src/features/cowork/sidebar/coworkRecentsSnapshot.ts");

after(async () => {
  await vite.close();
});

beforeEach(() => {
  resetCoworkTranscriptCacheForTests();
  resetCoworkRecentsSnapshotForTests();
});

function row(id) {
  return { uuid: id, type: "assistant", message: { content: [{ text: id, type: "text" }] } };
}

function message(uuid, role = "assistant") {
  return {
    createdAt: "2026-07-11T00:00:00.000Z",
    id: uuid,
    raw: { message: { content: [{ text: uuid, type: "text" }], role }, type: role, uuid },
    role,
    text: uuid,
  };
}

function idleSession(overrides = {}) {
  return {
    id: "session-1",
    isRunning: false,
    kind: "epitaxy",
    lastActivityAt: "t1",
    sessionKind: "cowork",
    title: "Task",
    updatedAt: "now",
    updatedAtMs: 1,
    ...overrides,
  };
}

function recentsRow(overrides = {}) {
  return idleSession(overrides);
}

test("lookup misses when running even if cache is populated", () => {
  writeCoworkTranscriptCache("s1", [row("a")], "t1");
  assert.equal(lookupCoworkTranscriptCache("s1", "t1", true), null);
  assert.equal(coworkTranscriptCacheSizeForTests(), 1);
});

test("lookup misses and deletes on lastActivityAt !== (strict)", () => {
  writeCoworkTranscriptCache("s1", [row("a")], 1);
  assert.equal(lookupCoworkTranscriptCache("s1", "1", false), null);
  assert.equal(coworkTranscriptCacheSizeForTests(), 0);
});

test("lookup hits and LRU-touches on matching lastActivityAt", () => {
  writeCoworkTranscriptCache("s1", [row("a")], "t1");
  writeCoworkTranscriptCache("s2", [row("b")], "t2");
  const hit = lookupCoworkTranscriptCache("s1", "t1", false);
  assert.deepEqual(hit, [row("a")]);
  writeCoworkTranscriptCache("s3", [row("c")], "t3");
  writeCoworkTranscriptCache("s4", [row("d")], "t4");
  writeCoworkTranscriptCache("s5", [row("e")], "t5");
  writeCoworkTranscriptCache("s6", [row("f")], "t6");
  assert.equal(lookupCoworkTranscriptCache("s1", "t1", false) !== null, true);
  assert.equal(lookupCoworkTranscriptCache("s2", "t2", false), null);
});

test("pZe skips empty transcript and oversize single transcript", () => {
  writeCoworkTranscriptCache("empty", [], "t");
  assert.equal(coworkTranscriptCacheSizeForTests(), 0);
  const huge = [{ pad: "x".repeat(COWORK_TRANSCRIPT_CACHE_BYTE_BUDGET + 8) }];
  writeCoworkTranscriptCache("huge", huge, "t");
  assert.equal(coworkTranscriptCacheSizeForTests(), 0);
});

test("pZe evicts LRU when size reaches max sessions", () => {
  for (let i = 0; i < COWORK_TRANSCRIPT_CACHE_MAX_SESSIONS; i += 1) {
    writeCoworkTranscriptCache(`s${i}`, [row(`m${i}`)], `t${i}`);
  }
  assert.equal(coworkTranscriptCacheSizeForTests(), 5);
  writeCoworkTranscriptCache("s5", [row("m5")], "t5");
  assert.equal(coworkTranscriptCacheSizeForTests(), 5);
  assert.equal(lookupCoworkTranscriptCache("s0", "t0", false), null);
  assert.ok(lookupCoworkTranscriptCache("s5", "t5", false));
});

test("maybeWrite only stores idle misses with nonempty transcript", () => {
  maybeWriteCoworkTranscriptCache("s1", [row("a")], "t1", true, false);
  maybeWriteCoworkTranscriptCache("s1", [row("a")], "t1", false, true);
  maybeWriteCoworkTranscriptCache("s1", [], "t1", false, false);
  assert.equal(coworkTranscriptCacheSizeForTests(), 0);
  maybeWriteCoworkTranscriptCache("s1", [row("a")], "t1", false, false);
  assert.equal(coworkTranscriptCacheSizeForTests(), 1);
  assert.ok(coworkTranscriptCacheBytesForTests() > 0);
});

test("invalidate (mZe) drops the session entry", () => {
  writeCoworkTranscriptCache("s1", [row("a")], "t1");
  invalidateCoworkTranscriptCache("s1");
  assert.equal(lookupCoworkTranscriptCache("s1", "t1", false), null);
  assert.equal(coworkTranscriptCacheSizeForTests(), 0);
});

test("hZe coalesces concurrent getTranscript for the same sessionId", async () => {
  let fetches = 0;
  const pending = [];
  const fetchTranscript = () => {
    fetches += 1;
    return new Promise((resolve) => {
      pending.push(resolve);
    });
  };
  const first = coalesceCoworkTranscriptFetch("s1", fetchTranscript);
  const second = coalesceCoworkTranscriptFetch("s1", fetchTranscript);
  assert.equal(fetches, 1);
  pending[0]([row("a")]);
  assert.deepEqual(await first, [row("a")]);
  assert.deepEqual(await second, [row("a")]);
  const third = coalesceCoworkTranscriptFetch("s1", fetchTranscript);
  assert.equal(fetches, 2);
  pending[1]([row("b")]);
  assert.deepEqual(await third, [row("b")]);
});

test("clearCoworkSessionCaches invalidates cZe (official mZe)", () => {
  writeCoworkTranscriptCache("s1", [row("a")], "t1");
  clearCoworkSessionCaches("s1");
  assert.equal(lookupCoworkTranscriptCache("s1", "t1", false), null);
});

test("idle miss fetches transcript then writes cZe; remount hits without getTranscript", async () => {
  setCoworkRecentsSnapshot([recentsRow()]);
  let transcriptReads = 0;
  const transcript = [message("idle-1")];
  const bridge = {
    getRawSession: async () => idleSession(),
    getRawTranscript: async () => {
      transcriptReads += 1;
      return transcript;
    },
    onEvent: () => () => {},
  };
  const store = { setState: () => {} };
  const first = createCoworkSessionRuntime({
    bridge,
    messageStore: createCoworkMessagePathStore(),
    sessionId: "session-1",
    store,
  });
  first.start();
  await first.reload();
  assert.equal(transcriptReads, 1);
  assert.equal(coworkTranscriptCacheSizeForTests(), 1);
  first.dispose();

  const second = createCoworkSessionRuntime({
    bridge,
    messageStore: createCoworkMessagePathStore(),
    sessionId: "session-1",
    store,
  });
  second.start();
  await second.reload();
  assert.equal(transcriptReads, 1);
  second.dispose();
});

test("running recents row never hits cZe (official isRunning miss)", async () => {
  setCoworkRecentsSnapshot([recentsRow({ isRunning: true })]);
  writeCoworkTranscriptCache("session-1", [message("cached")], "t1");
  let transcriptReads = 0;
  const bridge = {
    getRawSession: async () => idleSession({ isRunning: true }),
    getRawTranscript: async () => {
      transcriptReads += 1;
      return [message("live")];
    },
    onEvent: () => () => {},
  };
  const runtime = createCoworkSessionRuntime({
    bridge,
    messageStore: createCoworkMessagePathStore(),
    sessionId: "session-1",
    store: { setState: () => {} },
  });
  runtime.start();
  await runtime.reload();
  assert.equal(transcriptReads, 1);
  runtime.dispose();
});

test("stale lastActivityAt after cache hit mZe-refetches transcript", async () => {
  setCoworkRecentsSnapshot([recentsRow({ lastActivityAt: "t1" })]);
  writeCoworkTranscriptCache("session-1", [message("stale")], "t1");
  let transcriptReads = 0;
  const bridge = {
    getRawSession: async () => idleSession({ lastActivityAt: "t2" }),
    getRawTranscript: async () => {
      transcriptReads += 1;
      return [message("fresh")];
    },
    onEvent: () => () => {},
  };
  let context;
  const runtime = createCoworkSessionRuntime({
    bridge,
    messageStore: createCoworkMessagePathStore(),
    sessionId: "session-1",
    store: { setState: (next) => { context = next.sessionContext; } },
  });
  runtime.start();
  await runtime.reload();
  assert.equal(transcriptReads, 1);
  assert.deepEqual(context.messages.map((item) => item.id), ["fresh"]);
  runtime.dispose();
});

test("submitMessage invalidates cZe before send (official mZe)", async () => {
  setCoworkRecentsSnapshot([recentsRow()]);
  writeCoworkTranscriptCache("session-1", [message("cached")], "t1");
  const bridge = {
    getRawSession: async () => idleSession(),
    getRawTranscript: async () => [message("cached")],
    onEvent: () => () => {},
    sendMessage: async () => null,
  };
  const runtime = createCoworkSessionRuntime({
    bridge,
    messageStore: createCoworkMessagePathStore(),
    sessionId: "session-1",
    store: { setState: () => {} },
  });
  runtime.start();
  await runtime.reload();
  await runtime.submitMessage("hi", { messageUuid: "u1" });
  assert.equal(lookupCoworkTranscriptCache("session-1", "t1", false), null);
  runtime.dispose();
});

test("error / close / session_updated invalidate cZe", async () => {
  setCoworkRecentsSnapshot([recentsRow()]);
  writeCoworkTranscriptCache("session-1", [message("cached")], "t1");
  let emit;
  const bridge = {
    getRawSession: async () => idleSession(),
    getRawTranscript: async () => [message("cached")],
    onEvent: (listener) => {
      emit = listener;
      return () => {};
    },
  };
  const runtime = createCoworkSessionRuntime({
    bridge,
    messageStore: createCoworkMessagePathStore(),
    sessionId: "session-1",
    store: { setState: () => {} },
  });
  runtime.start();
  await runtime.reload();
  emit({ error: "boom", sessionId: "session-1", type: "error" });
  assert.equal(lookupCoworkTranscriptCache("session-1", "t1", false), null);

  writeCoworkTranscriptCache("session-1", [message("cached")], "t1");
  emit({ sessionId: "session-1", type: "close" });
  assert.equal(lookupCoworkTranscriptCache("session-1", "t1", false), null);

  writeCoworkTranscriptCache("session-1", [message("cached")], "t1");
  emit({ sessionId: "session-1", type: "session_updated" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(lookupCoworkTranscriptCache("session-1", "t1", false), null);
  runtime.dispose();
});
