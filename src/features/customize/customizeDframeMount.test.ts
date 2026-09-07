import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Official index-BELzQL5P: jos path "customize" getParentRoute gos `_withSidebar`
 * → Urs DesktopFrame. Product must not mark /customize frame:"standalone".
 * Official E7t header is `!framed && !B4()`; this ion-dist B4() is always true.
 */
const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string): string {
  return readFileSync(join(srcRoot, rel), "utf8");
}

describe("Customize dframe mount residual", () => {
  it("/customize is not standalone — jos under _withSidebar DesktopFrame", () => {
    const routes = read("app/routes.tsx");
    const customizeBlock = routes.slice(routes.indexOf('id: "customize"'), routes.indexOf('id: "settings"'));
    expect(customizeBlock).toContain("CustomizePage");
    expect(customizeBlock).not.toContain('frame: "standalone"');
  });

  it("Xt does not add Mac h-10 spacer when mounted in dframe", () => {
    const page = read("features/customize/CustomizePage.tsx");
    expect(page).not.toContain("h-10 shrink-0");
    expect(page).not.toContain("useCustomizeTrafficLightPadding");
  });

  it("E7t omits Back/自定义 header when B4() is true", () => {
    const nav = read("features/customize/CustomizeSideNav.tsx");
    expect(nav).not.toContain("backHref");
    expect(nav).not.toContain("text.customize");
    expect(nav).not.toContain("arrowLeft");
  });
});
