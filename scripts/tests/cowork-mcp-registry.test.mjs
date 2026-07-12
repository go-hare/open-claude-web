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

after(async () => {
  await vite.close();
});

test("matches official local MCP tool-name variants", () => {
  const store = createCoworkMcpRegistryStore();
  const tool = {
    _meta: { ui: { resourceUri: "ui://browser/open-tab" } },
    displayName: "Open tab",
    name: "open_tab",
  };
  store.getState().setLocalClient("plugin:browser tools", { isBuiltIn: false, uuid: "local-browser" });
  store.getState().setLocalTools("plugin:browser tools", [tool]);

  for (const name of [
    "plugin:browser tools:open_tab",
    "mcp__local_plugin_browser_tools__open_tab",
    "mcp__internal_plugin_browser_tools__open_tab",
    "mcp__plugin_browser_tools__open_tab",
    "mcp__remote-devices__plugin_browser_tools__open_tab",
  ]) {
    const match = store.getState().lookupTool(name);
    assert.equal(match?.tool.name, "open_tab");
    assert.deepEqual(match?.server, {
      iconSrc: undefined,
      iconType: "external",
      isBuiltIn: false,
      name: "browser tools",
      type: "local",
      uuid: "local-browser",
    });
  }
});

test("matches remote tools by UUID and normalized server name", () => {
  const store = createCoworkMcpRegistryStore();
  store.getState().setRemoteServer("remote-store-key", {
    name: "Linear Tasks",
    url: "https://linear.example/mcp",
    uuid: "remote-public-uuid",
  });
  store.getState().setRemoteDirectory("remote-store-key", { iconUrl: "https://linear.example/icon.png" });
  store.getState().setRemoteTools("remote-store-key", [{ displayName: "Create issue", name: "create_issue" }]);

  for (const name of [
    "Linear Tasks:create_issue",
    "mcp__remote-public-uuid__create_issue",
    "mcp__Linear_Tasks__create_issue",
  ]) {
    const match = store.getState().lookupTool(name);
    assert.equal(match?.server.uuid, "remote-store-key");
    assert.equal(match?.server.iconSrc, "https://linear.example/icon.png");
    assert.equal(match?.tool.displayName, "Create issue");
  }
});

test("uses the official sync-source UUID fallback", () => {
  const store = createCoworkMcpRegistryStore();
  const match = store.getState().lookupTool(
    "mcp__c1fc4002-5f49-5f9d-a4e5-93c4ef5d6a75__google_drive_search",
  );

  assert.equal(match?.server.name, "Google Drive");
  assert.equal(match?.server.iconType, "syncSource");
  assert.equal(match?.tool.name, "google_drive_search");
});

test("marks an MCP App only when official metadata contains a valid ui URI", () => {
  const store = createCoworkMcpRegistryStore();
  store.getState().setRemoteServer("remote-1", { name: "Canvas", url: "https://canvas.example/mcp", uuid: "remote-1" });
  store.getState().setRemoteTools("remote-1", [
    { _meta: { ui: { resourceUri: "ui://canvas/editor" } }, name: "open_editor" },
    { _meta: { ui: { resourceUri: "https://invalid.example" } }, name: "invalid_editor" },
    { name: "plain_tool" },
  ]);

  assert.deepEqual(store.getState().getMcpApp("mcp__remote-1__open_editor"), {
    serverUuid: "remote-1",
    toolName: "mcp__remote-1__open_editor",
  });
  assert.equal(store.getState().getMcpApp("mcp__remote-1__invalid_editor"), undefined);
  assert.equal(store.getState().getMcpApp("mcp__remote-1__plain_tool"), undefined);
  assert.equal(store.getState().getMcpApp("plain_tool"), undefined);
});
