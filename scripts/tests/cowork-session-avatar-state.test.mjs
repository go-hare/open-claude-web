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
  resolveCoworkPathAvatarState,
  resolveCoworkSessionAvatarState,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkClaudeAvatar.tsx",
);
const { resolveCoworkStatusAvatarState } = await vite.ssrLoadModule(
  "/src/features/cowork/session/activity/CoworkConversationStatus.tsx",
);

after(async () => {
  await vite.close();
});

test("official Et residual: empty stream → thinking", () => {
  assert.equal(
    resolveCoworkSessionAvatarState({ isEmptyStream: true, isStreaming: true, isSession: true }),
    "thinking",
  );
});

test("official Et residual: session streaming → shimmer (not writing)", () => {
  assert.equal(
    resolveCoworkSessionAvatarState({ isStreaming: true, isSession: true }),
    "shimmer",
  );
});

test("official Et residual: tool active → shimmer", () => {
  assert.equal(
    resolveCoworkSessionAvatarState({
      isStreaming: true,
      isSession: true,
      isToolActive: true,
    }),
    "shimmer",
  );
});

test("official Et residual: non-session streaming text → writing", () => {
  assert.equal(
    resolveCoworkSessionAvatarState({ isStreaming: true, isSession: false }),
    "writing",
  );
});

test("official Et residual: idle → static", () => {
  assert.equal(resolveCoworkSessionAvatarState({ isStreaming: false }), "static");
});

test("status bag: waiting Working on it → thinking", () => {
  assert.equal(
    resolveCoworkStatusAvatarState({
      isCompacting: false,
      isWorking: true,
      status: {
        isWaitingState: true,
        statusMessage: "Working on it...",
      },
    }),
    "thinking",
  );
});

test("status bag: tool label while working → shimmer", () => {
  assert.equal(
    resolveCoworkStatusAvatarState({
      isCompacting: false,
      isWorking: true,
      status: {
        isWaitingState: false,
        statusMessage: "Running agent...",
      },
    }),
    "shimmer",
  );
});

test("status bag: writing content while session working → shimmer", () => {
  assert.equal(
    resolveCoworkStatusAvatarState({
      isCompacting: false,
      isWorking: true,
      status: {
        isWaitingState: false,
        statusMessage: "Writing...",
      },
    }),
    "shimmer",
  );
});

test("status bag: idle → static", () => {
  assert.equal(
    resolveCoworkStatusAvatarState({
      isCompacting: false,
      isWorking: false,
      status: null,
    }),
    "static",
  );
});

test("path Et: empty stream (only human) → thinking", () => {
  assert.equal(
    resolveCoworkPathAvatarState({
      isSession: true,
      isStreaming: true,
      pathMessages: [{ sender: "human", content: [{ type: "text" }] }],
    }),
    "thinking",
  );
});

test("path Et: empty last assistant content while streaming → thinking", () => {
  assert.equal(
    resolveCoworkPathAvatarState({
      isSession: true,
      isStreaming: true,
      pathMessages: [
        { sender: "human", content: [{ type: "text" }] },
        { sender: "assistant", content: [] },
      ],
    }),
    "thinking",
  );
});

test("path Et: session streaming text → shimmer", () => {
  assert.equal(
    resolveCoworkPathAvatarState({
      isSession: true,
      isStreaming: true,
      pathMessages: [
        { sender: "human", content: [{ type: "text" }] },
        { sender: "assistant", content: [{ type: "text" }] },
      ],
    }),
    "shimmer",
  );
});

test("path Et: last block tool_use while streaming → shimmer", () => {
  assert.equal(
    resolveCoworkPathAvatarState({
      isSession: true,
      isStreaming: true,
      pathMessages: [
        { sender: "human", content: [{ type: "text" }] },
        { sender: "assistant", content: [{ type: "tool_use" }] },
      ],
    }),
    "shimmer",
  );
});

test("path Et: idle path → static", () => {
  assert.equal(
    resolveCoworkPathAvatarState({
      isSession: true,
      isStreaming: false,
      pathMessages: [
        { sender: "human", content: [{ type: "text" }] },
        { sender: "assistant", content: [{ type: "text" }] },
      ],
    }),
    "static",
  );
});

test("path Et: non-session streaming text → writing", () => {
  assert.equal(
    resolveCoworkPathAvatarState({
      isSession: false,
      isStreaming: true,
      pathMessages: [
        { sender: "human", content: [{ type: "text" }] },
        { sender: "assistant", content: [{ type: "text" }] },
      ],
    }),
    "writing",
  );
});
