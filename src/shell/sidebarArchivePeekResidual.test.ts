import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isPinnedSession,
  orderPinnedSessions,
  sessionPinKey,
} from "./sessionPinning";
import type { SessionSummary } from "../adapters/desktopBridge";

const here = path.dirname(fileURLToPath(import.meta.url));
const recents = readFileSync(path.join(here, "RecentsSection.tsx"), "utf8");
const pinning = readFileSync(path.join(here, "sessionPinning.ts"), "utf8");
const frameSidebar = readFileSync(path.join(here, "FrameSidebar.tsx"), "utf8");
const desktopFrame = readFileSync(path.join(here, "DesktopFrame.tsx"), "utf8");

function session(partial: Partial<SessionSummary> & Pick<SessionSummary, "id" | "kind">): SessionSummary {
  return {
    title: partial.title ?? "t",
    createdAtMs: 0,
    updatedAt: "",
    updatedAtMs: 0,
    sessionKind: partial.sessionKind ?? "code",
    ...partial,
  } as SessionSummary;
}

describe("sidebar archive residual (pin rail + active filter)", () => {
  it("archive success clears isPinned flag in RecentsSection", () => {
    // Optimistic list patch must drop isPinned so orderPinnedSessions isPinned fallback cannot re-surface.
    expect(recents).toMatch(/isArchived:\s*true,\s*isPinned:\s*false/);
    expect(recents).toMatch(/clearSessionSidebarMeta\(sessionPinKey/);
  });

  it("orderPinnedSessions / isPinnedSession ignore archived", () => {
    expect(pinning).toMatch(/if \(session\.isArchived\) continue/);
    expect(pinning).toMatch(/if \(session\.isArchived\) return false/);
    const archived = session({
      id: "x",
      kind: "code",
      isArchived: true,
      isPinned: true,
    });
    const active = session({ id: "y", kind: "code" });
    expect(orderPinnedSessions([archived, active], [sessionPinKey(archived), sessionPinKey(active)]).map((s) => s.id)).toEqual(["y"]);
    expect(isPinnedSession(archived, [sessionPinKey(archived)])).toBe(false);
  });
});

describe("sidebar collapse peek residual", () => {
  it("DesktopFrame paints data-hovering only when collapsed+hovering", () => {
    // Official cbc59a8af: .dframe-root[data-collapsed][data-hovering] .dframe-sidebar-body { opacity:1 }
    expect(desktopFrame).toMatch(/data-hovering=\{\(frame\.sidebarCollapsed && frame\.sidebarHovering\) \|\| undefined\}/);
    expect(desktopFrame).toMatch(/data-collapsed=\{frame\.sidebarCollapsed \|\| undefined\}/);
  });

  it("useSidebarPeek sets sidebarHovering on collapsed enter", () => {
    expect(frameSidebar).toMatch(/function useSidebarPeek/);
    expect(frameSidebar).toMatch(/frame\.setSidebarHovering\(true\)/);
    expect(frameSidebar).toMatch(/onMouseEnter=\{peekHandlers\.onEnter\}/);
    expect(frameSidebar).toMatch(/aria-controls="frame-peek-popover"/);
  });
});
