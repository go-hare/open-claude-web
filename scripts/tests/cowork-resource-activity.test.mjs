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
const { parseCoworkResourceActivity } = await vite.ssrLoadModule(
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
