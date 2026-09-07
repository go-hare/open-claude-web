import { afterEach, describe, expect, it } from "vitest";
import {
  alwaysApprovedKeyFor,
  enabledKeyFor,
  groupPermissionForTools,
  permissionForTool,
  setToolsPermission,
  type ConnectorToolRef,
} from "./connectorToolPermissionStore";

const STORAGE_KEY = "open-claude.customize.enabled-mcp-tools.v1";

function tool(name: string, serverName = "teambition"): ConnectorToolRef {
  return { name, serverName, description: `${name} desc` };
}

describe("connector tool permissions (index wXt / SXt / bXt)", () => {
  afterEach(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* node vitest has no localStorage */
    }
  });

  it("enabledKey is server:name", () => {
    expect(enabledKeyFor(tool("search"))).toBe("teambition:search");
  });

  it("alwaysApprovedKey is enabledKey plus md5 of description:schema", () => {
    const key = alwaysApprovedKeyFor(tool("search"));
    expect(key.startsWith("teambition:search-")).toBe(true);
    expect(key.length).toBeGreaterThan("teambition:search-".length + 16);
  });

  it("defaults to ask, then SXt maps allow/ask/blocked", () => {
    const search = tool("search", "sxt-server");
    expect(permissionForTool(search)).toBe("ask");
    setToolsPermission([search], "blocked");
    expect(permissionForTool(search)).toBe("blocked");
    setToolsPermission([search], "ask");
    expect(permissionForTool(search)).toBe("ask");
    setToolsPermission([search], "allow");
    expect(permissionForTool(search)).toBe("allow");
  });

  it("CXt mixed tools are custom", () => {
    const a = tool("a", "cxt-server");
    const b = tool("b", "cxt-server");
    setToolsPermission([a], "allow");
    setToolsPermission([b], "ask");
    expect(groupPermissionForTools([a, b])).toBe("custom");
    setToolsPermission([a, b], "blocked");
    expect(groupPermissionForTools([a, b])).toBe("blocked");
  });
});
