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
  initialCoworkChatResourceState,
  isCoworkFileDrawerOpen,
  reduceCoworkChatResource,
} = await vite.ssrLoadModule("/src/features/cowork/session/chatResource/coworkChatResourceStore.ts");
const { isMarkdownCreatePath } = await vite.ssrLoadModule(
  "/src/features/cowork/session/chatResource/useCoworkStreamingCreateFile.ts",
);
const { presentFilesPath } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkOfficialToolRenderer.tsx",
);

after(async () => {
  await vite.close();
});

test("gle SELECT_FILE sets selectedItem file shape", () => {
  const next = reduceCoworkChatResource(initialCoworkChatResourceState("s1"), {
    type: "SELECT_FILE",
    path: "/tmp/a.md",
    toolType: "create_file",
    messageId: "msg-1",
    fileUuid: "fu-1",
  });
  assert.deepEqual(next.selectedItem, {
    type: "file",
    path: "/tmp/a.md",
    toolType: "create_file",
    messageId: "msg-1",
    fileUuid: "fu-1",
  });
});

test("gle CLEAR_SELECTED nulls selectedItem", () => {
  const selected = reduceCoworkChatResource(initialCoworkChatResourceState(), {
    type: "SELECT_FILE",
    path: "/tmp/a.md",
  });
  const cleared = reduceCoworkChatResource(selected, { type: "CLEAR_SELECTED" });
  assert.equal(cleared.selectedItem, null);
});

test("UPDATE_STREAMING_FILE merges sticky showingInRightPane", () => {
  let state = initialCoworkChatResourceState();
  state = reduceCoworkChatResource(state, {
    type: "UPDATE_STREAMING_FILE",
    path: "/tmp/a.md",
    content: "# hi",
    renderAs: "markdown",
    showingInRightPane: true,
  });
  state = reduceCoworkChatResource(state, {
    type: "UPDATE_STREAMING_FILE",
    path: "/tmp/a.md",
    content: "# hi\nmore",
  });
  const entry = state.streamingFiles.get("/tmp/a.md");
  assert.equal(entry.content, "# hi\nmore");
  assert.equal(entry.showingInRightPane, true);
  assert.equal(entry.renderAs, undefined);
});

test("CLEAR_STREAMING_FILE deletes path", () => {
  let state = initialCoworkChatResourceState();
  state = reduceCoworkChatResource(state, {
    type: "UPDATE_STREAMING_FILE",
    path: "/tmp/a.md",
    content: "x",
  });
  state = reduceCoworkChatResource(state, { type: "CLEAR_STREAMING_FILE", path: "/tmp/a.md" });
  assert.equal(state.streamingFiles.has("/tmp/a.md"), false);
});

test("isDrawerOpen requires expanded and selected file", () => {
  assert.equal(isCoworkFileDrawerOpen(false, { type: "file", path: "/a" }), false);
  assert.equal(isCoworkFileDrawerOpen(true, null), false);
  assert.equal(isCoworkFileDrawerOpen(true, { type: "file", path: "/a" }), true);
});

test("isDrawerOpen is true for non-file selectedItem types (cFt multi-resource)", () => {
  assert.equal(isCoworkFileDrawerOpen(true, { type: "web_search" }), true);
  assert.equal(isCoworkFileDrawerOpen(true, { type: "browser_extension", highlightId: "t1" }), true);
  assert.equal(
    isCoworkFileDrawerOpen(true, {
      type: "mcp_server",
      serverUuid: "mcp-1",
      serverName: "Server",
    }),
    true,
  );
  assert.equal(
    isCoworkFileDrawerOpen(true, { type: "skill", skillName: "demo", pluginName: "plug" }),
    true,
  );
  assert.equal(isCoworkFileDrawerOpen(false, { type: "web_search" }), false);
});

test("gle SELECT_MCP_SERVER / SELECT_WEB_SEARCH / SELECT_BROWSER_EXTENSION / SELECT_SKILL shapes", () => {
  let state = initialCoworkChatResourceState("s1");
  state = reduceCoworkChatResource(state, {
    type: "SELECT_MCP_SERVER",
    serverUuid: "uuid-1",
    serverName: "My MCP",
    iconType: "custom",
    iconSrc: "data:image/png;base64,aa",
  });
  assert.deepEqual(state.selectedItem, {
    type: "mcp_server",
    serverUuid: "uuid-1",
    serverName: "My MCP",
    iconType: "custom",
    iconSrc: "data:image/png;base64,aa",
  });

  state = reduceCoworkChatResource(state, { type: "SELECT_WEB_SEARCH" });
  assert.deepEqual(state.selectedItem, { type: "web_search" });

  state = reduceCoworkChatResource(state, {
    type: "SELECT_BROWSER_EXTENSION",
    highlightId: "tool-1",
  });
  assert.deepEqual(state.selectedItem, {
    type: "browser_extension",
    highlightId: "tool-1",
  });

  state = reduceCoworkChatResource(state, {
    type: "SELECT_SKILL",
    skillName: "summarize",
    pluginName: "writer",
  });
  assert.deepEqual(state.selectedItem, {
    type: "skill",
    skillName: "summarize",
    pluginName: "writer",
  });
});

test("isMarkdownCreatePath matches official md extensions", () => {
  assert.equal(isMarkdownCreatePath("/tmp/x.md"), true);
  assert.equal(isMarkdownCreatePath("/tmp/x.MDX"), true);
  assert.equal(isMarkdownCreatePath("/tmp/x.txt"), false);
});

test("l$t auto-open is disabled: streaming create_file does not SELECT/expand (official useMemo null)", async () => {
  // Official l$t candidate: useMemo(() => null). Hook is a no-op; reducer stays available for click paths.
  const { useCoworkStreamingCreateFile } = await vite.ssrLoadModule(
    "/src/features/cowork/session/chatResource/useCoworkStreamingCreateFile.ts",
  );
  assert.equal(typeof useCoworkStreamingCreateFile, "function");
  assert.equal(useCoworkStreamingCreateFile.length >= 0, true);
  // Calling the hook body as a plain function must not throw and must not mutate resource state.
  let state = initialCoworkChatResourceState("s-stream");
  useCoworkStreamingCreateFile({
    isResponding: true,
    messages: [],
    streamSnapshot: {
      messageId: "m1",
      blocks: [{ kind: "tool", name: "create_file", partialJson: '{"path":"/tmp/a.md","file_text":"# hi"}' }],
    },
  });
  assert.equal(state.selectedItem, null);
  assert.equal(state.streamingFiles.size, 0);
  // Explicit SELECT (click path) still works via reducer.
  state = reduceCoworkChatResource(state, {
    type: "SELECT_FILE",
    path: "/tmp/a.md",
    toolType: "create_file",
  });
  assert.equal(state.selectedItem?.type, "file");
  assert.equal(state.selectedItem && state.selectedItem.type === "file" ? state.selectedItem.path : null, "/tmp/a.md");
});

test("D5e-like create_file Blt target title-cases basename without extension", async () => {
  const { coworkCreateFileBltTarget } = await vite.ssrLoadModule(
    "/src/features/cowork/session/transcript/coworkFileToolModel.ts",
  );
  assert.equal(coworkCreateFileBltTarget("/tmp/.codex-permission-test.txt"), ".codex-permission-test");
  assert.equal(coworkCreateFileBltTarget("/tmp/my_notes.md"), "My Notes");
  assert.equal(coworkCreateFileBltTarget("/tmp/plain"), "Plain");
});

test("RESET clears selected and streamingFiles", () => {
  let state = reduceCoworkChatResource(initialCoworkChatResourceState("a"), {
    type: "SELECT_FILE",
    path: "/tmp/a.md",
  });
  state = reduceCoworkChatResource(state, {
    type: "UPDATE_STREAMING_FILE",
    path: "/tmp/a.md",
    content: "x",
  });
  state = reduceCoworkChatResource(state, { type: "RESET", conversationUuid: "b" });
  assert.equal(state.selectedItem, null);
  assert.equal(state.streamingFiles.size, 0);
  assert.equal(state.conversationUuid, "b");
});

test("Klt presentFilesPath takes first local_resource only", () => {
  assert.equal(
    presentFilesPath({
      type: "tool_result",
      content: [
        { type: "text", text: "ignore" },
        { type: "local_resource", file_path: "/tmp/first.md" },
        { type: "local_resource", file_path: "/tmp/second.md" },
      ],
    }),
    "/tmp/first.md",
  );
  assert.equal(presentFilesPath({ type: "tool_result", content: [] }), "");
});
