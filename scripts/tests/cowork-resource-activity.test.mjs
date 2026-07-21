import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { createCoworkMcpRegistryStore } = await vite.ssrLoadModule(
  "/src/features/cowork/session/mcp/coworkMcpRegistryStore.ts",
);
const {
  coworkFolderSectionTitle,
  coworkSessionFolders,
  mergeCoworkFsDetectedActivity,
  parseCoworkResourceActivity,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/activity/coworkResourceActivity.ts",
);

after(async () => {
  await vite.close();
});

function chat(id, role, raw) {
  return { createdAt: "2026-07-11T00:00:00.000Z", id, raw, role, text: "" };
}

test("ports official resource activity order, result association, and MCP registry metadata", () => {
  const registry = createCoworkMcpRegistryStore();
  registry.getState().setRemoteServer("remote-1", {
    name: "Linear",
    url: "https://linear.example/mcp",
    uuid: "remote-1",
  });
  registry.getState().setRemoteTools("remote-1", [{ displayName: "Create issue", name: "create_issue" }]);

  const messages = [
    chat("assistant-2", "assistant", {
      message: {
        content: [
          { id: "read-2", input: { file_path: "/tmp/report.md" }, name: "Read", type: "tool_use" },
          { id: "search-1", input: { query: "official source" }, name: "WebSearch", type: "tool_use" },
          { id: "present-1", input: {}, name: "present_files", type: "tool_use" },
          { id: "mcp-1", input: { title: "Parity" }, name: "mcp__remote-1__create_issue", type: "tool_use" },
        ],
      },
      receivedStreamAt: 20,
      type: "assistant",
      uuid: "assistant-2",
    }),
    chat("results", "user", {
      message: {
        content: [
          { content: "Links: [{\"title\":\"Source\",\"url\":\"https://example.com/docs\"}]", tool_use_id: "search-1", type: "tool_result" },
          { content: [{ file_path: "/tmp/output.txt", type: "local_resource" }, { text: "/tmp/second.txt", type: "text" }], tool_use_id: "present-1", type: "tool_result" },
          { content: "created", is_error: false, tool_use_id: "mcp-1", type: "tool_result" },
        ],
      },
      type: "user",
      uuid: "results",
    }),
    chat("assistant-1", "assistant", {
      message: { content: [{ id: "read-1", input: { file_path: "/tmp/report.md" }, name: "Read", type: "tool_use" }] },
      receivedStreamAt: 10,
      type: "assistant",
      uuid: "assistant-1",
    }),
  ];

  const activity = parseCoworkResourceActivity(messages, { lookupMcpTool: registry.getState().lookupTool });

  assert.deepEqual(activity.map((item) => item.timestamp), [10, 20, 20, 20, 20, 20]);
  assert.equal(activity.filter((item) => item.filePath === "/tmp/report.md").length, 2);
  assert.equal(activity.find((item) => item.operation === "web_search")?.searchResults?.[0]?.siteDomain, "example.com");
  assert.deepEqual(
    activity.filter((item) => item.operation === "create").map((item) => item.filePath),
    ["/tmp/output.txt", "/tmp/second.txt"],
  );
  const mcp = activity.find((item) => item.operation === "mcp_tool");
  assert.equal(mcp?.mcpServer?.name, "Linear");
  assert.equal(mcp?.mcpToolDisplayName, "Create issue");
  assert.deepEqual(mcp?.mcpToolResult, { content: [{ text: "created", type: "text" }], isError: false });
});

test("coworkSessionFolders prefers userSelectedFolders and ignores virtual /sessions cwd", () => {
  assert.deepEqual(
    coworkSessionFolders({
      cwd: "/sessions/724bccd9-7917-44fc-b49c-6d345996d494",
      userSelectedFolders: ["/Users/apple/work-py/AppAgent"],
    }),
    ["/Users/apple/work-py/AppAgent"],
  );
  assert.deepEqual(
    coworkSessionFolders({
      cwd: "/sessions/abc",
      folders: ["/tmp/workspace"],
    }),
    ["/tmp/workspace"],
  );
  assert.deepEqual(
    coworkSessionFolders({
      cwd: "/Users/apple/real-host-path",
    }),
    ["/Users/apple/real-host-path"],
  );
  assert.deepEqual(
    coworkSessionFolders({
      cwd: "/sessions/only-virtual",
    }),
    [],
  );
  assert.deepEqual(coworkSessionFolders(null), []);
  assert.equal(coworkFolderSectionTitle(["/Users/apple/work-py/AppAgent"]), "AppAgent");
  assert.equal(coworkFolderSectionTitle(["/a", "/b"]), "工作文件夹");
  assert.equal(coworkFolderSectionTitle([]), "工作文件夹");
});

test("mergeCoworkFsDetectedActivity skips paths already write/edit/create covered", () => {
  const fromTools = parseCoworkResourceActivity([
    chat("assistant-w", "assistant", {
      message: {
        content: [{ id: "w1", input: { file_path: "/tmp/covered.txt" }, name: "Write", type: "tool_use" }],
      },
      receivedStreamAt: 5,
      type: "assistant",
      uuid: "assistant-w",
    }),
  ]);
  const merged = mergeCoworkFsDetectedActivity(fromTools, [
    { fileName: "covered.txt", hostPath: "/tmp/covered.txt", timestamp: 50 },
    { fileName: "extra.txt", hostPath: "/tmp/extra.txt", timestamp: 40 },
  ]);
  assert.equal(merged.some((item) => item.operation === "fs_detected" && item.filePath === "/tmp/covered.txt"), false);
  const extra = merged.find((item) => item.operation === "fs_detected" && item.filePath === "/tmp/extra.txt");
  assert.equal(extra?.fileName, "extra.txt");
  assert.equal(extra?.timestamp, 40);
  assert.ok(merged.every((item, index, list) => index === 0 || list[index - 1].timestamp <= item.timestamp));
});
