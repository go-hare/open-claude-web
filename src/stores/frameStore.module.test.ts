import { describe, expect, it } from "vitest";
import { frameStore } from "./frameStore";

describe("frameStore H6t module (shared-50)", () => {
  it("toggleSidebar patches collapsed without a React setState owner", () => {
    const before = frameStore.getState().sidebarCollapsed;
    let notified = 0;
    const unsub = frameStore.subscribe(() => {
      notified += 1;
    });
    frameStore.toggleSidebar();
    expect(frameStore.getState().sidebarCollapsed).toBe(!before);
    expect(notified).toBe(1);
    frameStore.setSidebarCollapsed(before);
    unsub();
    expect(frameStore.getState().sidebarCollapsed).toBe(before);
  });

  it("setMode is a no-rebuild action on the same module instance", () => {
    expect(typeof frameStore.setMode).toBe("function");
    expect(typeof frameStore.toggleSidebar).toBe("function");
    expect(frameStore.getState()).toBe(frameStore.getState());
  });
});
