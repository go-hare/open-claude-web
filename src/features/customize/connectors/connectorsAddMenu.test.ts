import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Official c63a78ed4 Rt header Bt:
 * two options → dropdown Browse connectors + Add custom connector.
 * "+" must not be a single onBrowseConnectors (Directory $T → plugins).
 * Official Ot has no Server URL card / Remove button.
 */
const dir = dirname(fileURLToPath(import.meta.url));

function readSrc(name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

describe("Connectors Rt Bt / Ot residual (c63a78ed4)", () => {
  it("header + is Bt dropdown, not a single Directory open", () => {
    const sidebar = readSrc("ConnectorsListSidebar.tsx");
    expect(sidebar).toContain("<AddConnectorMenu");
    expect(sidebar).not.toMatch(/aria-label="Add connector"[\s\S]*onClick=\{onBrowseConnectors\}/);
    const menu = readSrc("AddConnectorMenu.tsx");
    expect(menu).toContain("Browse connectors");
    expect(menu).toContain("Add custom connector");
    expect(menu).toContain("onAddCustom");
    expect(menu).toContain("onBrowse");
  });

  it("Ot detail has Disconnect + URL copy, not invent Server URL / Remove cards", () => {
    const panel = readSrc("ConnectorDetailPanel.tsx");
    expect(panel).toContain("Copy server URL");
    expect(panel).toContain("<ConnectorToolPermissions");
    expect(panel).toContain("This connector has no tools available.");
    const tools = readSrc("ConnectorToolPermissions.tsx");
    expect(tools).toContain("Tool permissions");
    expect(panel).not.toContain("text-xs text-text-500 mb-1");
    expect(panel).not.toMatch(/[\s>]Remove[\s<]/);
    const route = readSrc("ConnectorsRoute.tsx");
    expect(route).toContain("<ConnectorDetailPanel");
    expect(route).not.toContain("onRemove");
  });

  it("Vt list row is name only — no URL description", () => {
    const sidebar = readSrc("ConnectorsListSidebar.tsx");
    expect(sidebar).toContain("py-1.5");
    expect(sidebar).not.toContain("font-small text-text-400 truncate");
  });

  it("Add custom connector is official J modal, not a homemade card", () => {
    const dialog = readSrc("AddCustomConnectorDialog.tsx");
    expect(dialog).toContain("OfficialModal");
    expect(dialog).toContain("Remote MCP server URL");
    expect(dialog).toContain("Add custom connector");
    expect(dialog).toContain("!max-w-[33.5rem]");
    expect(dialog).toContain("OAuth Client ID (optional)");
    expect(dialog).toContain("clientId: clientId.trim()");
    expect(dialog).not.toContain("fixed inset-0 z-popover");
  });

  it("wXt / pXt / mXt / NXt: group dropdown + per-tool XD allow/ask/blocked", () => {
    const tools = readSrc("ConnectorToolPermissions.tsx");
    expect(tools).toContain("Blanket permission for group");
    expect(tools).toContain("<SegmentedControl");
    expect(tools).toContain("setToolsPermission");
    expect(tools).toContain("TOOL_PERMISSION_ICONS");
    const store = readSrc("connectorToolPermissionStore.ts");
    expect(store).toContain("Always allow");
    expect(store).toContain("Needs approval");
    expect(store).toContain("Blocked");
    expect(store).toContain("Custom");
    expect(store).toContain("CheckCircle");
    expect(store).toContain("Hand");
    expect(store).toContain("Prohibit");
    expect(store).toContain("DotsHorizontal");
    expect(store).toContain("enabled_mcp_tools");
    expect(store).toContain("FLUSH_MS = 500");
    expect(store).toContain("permission !== \"blocked\"");
    expect(store).toContain("permission === \"allow\"");
  });

  it("custom connector writes MCP bag oauth, not localStorage", () => {
    const store = readSrc("connectorsStore.ts");
    expect(store).not.toContain("open-claude.customize.custom-connectors.v1");
    expect(store).not.toContain("localStorage.getItem");
    expect(store).not.toContain("localStorage.setItem");
    expect(store).toContain("oauth: oauthBag");
    expect(store).toContain("clientId");
    expect(store).toContain("clientSecret");
    const sidebar = readSrc("ConnectorsListSidebar.tsx");
    expect(sidebar).toContain("OfficialTextInput");
  });
});
