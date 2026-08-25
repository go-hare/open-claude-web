import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSummary } from "../adapters/desktopBridge/types";
import { getSelectedFolder, setSelectedFolder } from "../features/customize/selectedFolderStore";
import { applyOfficialProjectGroupAdd, projectGroupFolder } from "./officialProjectGroupAdd";

const mem = new Map<string, string>();
const dispatchEvent = vi.fn(() => true);

beforeEach(() => {
  mem.clear();
  dispatchEvent.mockClear();
  const localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage, dispatchEvent });
  vi.stubGlobal(
    "CustomEvent",
    class FakeCustomEvent {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    },
  );
  setSelectedFolder(null);
});

function session(partial: Partial<SessionSummary> & Pick<SessionSummary, "id">): SessionSummary {
  return {
    kind: "code",
    sessionKind: "code",
    title: partial.title ?? partial.id,
    updatedAt: "",
    updatedAtMs: 1,
    isArchived: false,
    isRunning: false,
    ...partial,
  };
}

describe("projectGroupFolder (ca0135 fl mapping d)", () => {
  it("returns first local cwd", () => {
    expect(
      projectGroupFolder([
        session({ id: "a", cwd: "D:\\work\\py\\claude\\magicclaw-mofang" }),
        session({ id: "b", cwd: "D:\\other" }),
      ]),
    ).toBe("D:\\work\\py\\claude\\magicclaw-mofang");
  });

  it("skips remote-control and empty cwd", () => {
    expect(
      projectGroupFolder([
        session({ id: "a", cwd: "  " }),
        session({ id: "b", cwd: "remote-control:abc" }),
        session({ id: "c", cwd: "/Users/me/app" }),
      ]),
    ).toBe("/Users/me/app");
  });

  it("returns null when no local cwd", () => {
    expect(projectGroupFolder([session({ id: "a" })])).toBeNull();
  });
});

describe("applyOfficialProjectGroupAdd (ca0135 fl click)", () => {
  it("mapped: setSelectedFolder + navigate, no reset-draft", () => {
    const navigate = vi.fn();
    applyOfficialProjectGroupAdd({
      folder: "D:\\work\\py\\claude\\magicclaw-mofang",
      navigate,
    });
    expect(getSelectedFolder()).toBe("D:\\work\\py\\claude\\magicclaw-mofang");
    expect(navigate).toHaveBeenCalledOnce();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("no mapping: reset-draft + navigate", () => {
    const navigate = vi.fn();
    applyOfficialProjectGroupAdd({ folder: null, navigate });
    expect(getSelectedFolder()).toBeNull();
    expect(navigate).toHaveBeenCalledOnce();
    expect(dispatchEvent).toHaveBeenCalledOnce();
    const event = dispatchEvent.mock.calls[0]?.[0] as CustomEvent;
    expect(event.type).toBe("epitaxy:reset-draft");
  });
});
