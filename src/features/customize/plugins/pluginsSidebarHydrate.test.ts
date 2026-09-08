import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isLocalUploadPlugin, mapHostPlugin, pluginListContext } from "./localPluginsQuery";

/**
 * Official o7t hydrates from OX/dX kT.getPlugins, not plugins=[].
 * Official i7t links /customize/plugins/:id; missing plugin redirects after Ss().
 */
const dir = dirname(fileURLToPath(import.meta.url));

function readSrc(name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

describe("Customize personal plugins hydrate (o7t / OX / i7t)", () => {
  it("sidebar fetches LocalPlugins.getPlugins instead of defaulting []", () => {
    const sidebar = readSrc("PluginsSidebarSection.tsx");
    expect(sidebar).toContain("localPluginsQueryKey");
    expect(sidebar).toContain("fetchLocalPlugins");
    expect(sidebar).toContain("projectPlugins");
    expect(sidebar).toContain("UnifiedPluginNavItem");
    expect(sidebar).not.toContain("plugins = []");
  });

  it("plugin detail route is not redirected before Ss() load", () => {
    const page = readFileSync(join(dir, "../CustomizePage.tsx"), "utf8");
    expect(page).toContain("<PluginRoute");
    expect(page).not.toMatch(/pluginId 数据缺失[\s\S]*replaceCustomize/);
  });

  it("AX maps host kSA plugin with empty component arrays", () => {
    const mapped = mapHostPlugin({
      id: "demo-plugin@local-desktop-app-uploads",
      name: "demo-plugin",
      installPath: "/tmp/demo",
      scope: "user",
      enabled: true,
      skills: [],
      mcpServers: [],
      hooks: [],
      agents: [],
      marketplaceName: "local-desktop-app-uploads",
    });
    expect(mapped?.source).toBe("local");
    expect(mapped?.isFromManualMarketplace).toBe(true);
    expect(mapped?.skills).toEqual([]);
    expect(mapped?.mcpServers).toEqual([]);
  });

  it("EX/Ls is only local-desktop-app-uploads, not every AX source local", () => {
    const uploaded = mapHostPlugin({
      id: "demo@local-desktop-app-uploads",
      name: "demo",
      installPath: "/tmp/demo",
      scope: "user",
      enabled: true,
      skills: [],
      mcpServers: [],
      hooks: [],
      agents: [],
      marketplaceName: "local-desktop-app-uploads",
    });
    const market = mapHostPlugin({
      id: "other@my-market",
      name: "other",
      installPath: "/tmp/other",
      scope: "user",
      enabled: true,
      skills: [],
      mcpServers: [],
      hooks: [],
      agents: [],
      marketplaceName: "my-market",
    });
    expect(uploaded && isLocalUploadPlugin(uploaded)).toBe(true);
    expect(market && isLocalUploadPlugin(market)).toBe(false);
    expect(market?.source).toBe("local");
  });

  it("dX oX context is ccd+folder / ccd / cowork", () => {
    expect(pluginListContext(true, "D:/proj")).toEqual({
      mode: "ccd",
      workspacePath: "D:/proj",
    });
    expect(pluginListContext(true, null)).toEqual({ mode: "ccd" });
    expect(pluginListContext(false, "D:/proj")).toEqual({ mode: "cowork" });
  });
});
